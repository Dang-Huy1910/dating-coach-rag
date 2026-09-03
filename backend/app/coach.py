from __future__ import annotations

import json
import re
from collections.abc import Iterator
from uuid import uuid4

from backend.app.config import DISCLAIMER_TEXT, get_settings
from backend.app.models import Citation, CoachReply, Intent
from backend.app.prompts import SYSTEM_PROMPT, build_user_prompt
from backend.app.rag.retrieve import Hit, index_ready, retrieve
from backend.app.safety import SafetyVerdict, screen
from backend.app.session_store import SessionStore, Turn

_JSON_BLOCK = re.compile(r"\{.*\}", re.S)


class IndexNotReadyError(RuntimeError):
    pass


def retrieve_chunks(query: str) -> list[Hit]:
    return retrieve(query)


def _provider(settings) -> str:
    return (settings.llm_provider or "groq").strip().lower()


def _complete_groq(prompt: str, settings) -> str:
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is missing")
    from groq import Groq

    client = Groq(api_key=settings.groq_api_key)
    response = client.chat.completions.create(
        model=settings.groq_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
    )
    return response.choices[0].message.content or ""


def _complete_gemini(prompt: str, settings) -> str:
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is missing")
    import httpx

    model = (settings.gemini_model or "gemini-2.0-flash").strip()
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent"
    )
    payload = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.4},
    }
    with httpx.Client(timeout=60.0) as client:
        response = client.post(
            url,
            params={"key": settings.gemini_api_key},
            json=payload,
        )
    if response.status_code >= 400:
        detail = response.text[:500]
        raise RuntimeError(f"Gemini API error {response.status_code}: {detail}")
    data = response.json()
    try:
        parts = data["candidates"][0]["content"]["parts"]
        return "".join(str(p.get("text", "")) for p in parts).strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(f"Unexpected Gemini response: {data!r}") from exc


def complete(prompt: str) -> str:
    settings = get_settings()
    provider = _provider(settings)
    if provider == "groq":
        return _complete_groq(prompt, settings)
    if provider in {"gemini", "google"}:
        return _complete_gemini(prompt, settings)
    raise RuntimeError(f"Unsupported LLM_PROVIDER={settings.llm_provider}")


def complete_stream(prompt: str) -> Iterator[str]:
    # Demo path uses JSON replies; stream yields the full completion once.
    text = complete(prompt)
    if text:
        yield text


def _history(store: SessionStore, session_id: str) -> str:
    lines: list[str] = []
    for turn in store.recent_turns(session_id):
        lines.append(f"User ({turn.intent}): {turn.role_user_text}")
        lines.append(f"Coach: {turn.reply_text}")
    return "\n".join(lines)


def _excerpts(hits: list[Hit]) -> str:
    blocks = []
    for hit in hits:
        heading = f" / {hit.chunk.heading}" if hit.chunk.heading else ""
        blocks.append(
            f"[{hit.chunk.title}{heading} | {hit.chunk.path} | score={hit.score:.2f}]\n{hit.chunk.text}"
        )
    return "\n\n".join(blocks)


def _citations(hits: list[Hit]) -> list[Citation]:
    return [
        Citation(
            source_id=hit.chunk.source_id,
            title=hit.chunk.title,
            heading=hit.chunk.heading,
            path=hit.chunk.path,
            score=round(hit.score, 4),
        )
        for hit in hits
    ]


def _parse_model_json(raw: str) -> dict:
    text = raw.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = _JSON_BLOCK.search(text)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
    return {"reply": text, "improved_draft": None, "openers": None}


def _refusal_reply(intent: Intent, verdict: SafetyVerdict, extra_openers: list[str] | None = None) -> CoachReply:
    return CoachReply(
        reply=verdict.user_message,
        citations=[],
        refused=True,
        hedged=False,
        disclaimer=DISCLAIMER_TEXT,
        intent=intent,
        improved_draft=None,
        openers=extra_openers,
    )


def _unknown_reply(intent: Intent, craft: bool) -> CoachReply:
    if craft:
        reply = (
            "Thư viện không đủ để tư vấn hẹn hò chuyên biệt cho nội dung này. "
            "Mình chỉ góp ý phần viết (rõ ý, độ dài, cụ thể) — không bịa nghiên cứu hay chẩn đoán."
        )
        return CoachReply(
            reply=reply,
            citations=[],
            refused=False,
            hedged=True,
            disclaimer=DISCLAIMER_TEXT,
            intent=intent,
        )
    return CoachReply(
        reply=(
            "Mình không có đủ tài liệu trong thư viện để tư vấn câu này, "
            "nên không đưa lời khuyên bịa. Hãy hỏi về bio, opener, nhịp hội thoại, "
            "ranh giới, hoặc dấu hiệu cảnh báo mang tính thông tin."
        ),
        citations=[],
        refused=True,
        hedged=True,
        disclaimer=DISCLAIMER_TEXT,
        intent=intent,
    )


def handle(
    *,
    store: SessionStore,
    session_id: str,
    intent: Intent,
    user_text: str,
    extra: str = "",
) -> CoachReply:
    if not index_ready():
        raise IndexNotReadyError("index_not_ready")

    verdict = screen(user_text)
    hits: list[Hit] = []
    if verdict.allowed:
        hits = retrieve_chunks(user_text)

    if not verdict.allowed:
        reply = _refusal_reply(intent, verdict)
        _record(store, session_id, user_text, intent, reply)
        return reply

    craft = intent in ("rewrite_bio", "analyze_message")
    if not hits:
        reply = _unknown_reply(intent, craft=craft)
        _record(store, session_id, user_text, intent, reply)
        return reply

    prompt = build_user_prompt(
        intent=intent,
        user_text=user_text,
        excerpts=_excerpts(hits),
        history=_history(store, session_id),
        extra=extra,
    )
    parsed = _parse_model_json(complete(prompt))
    openers = parsed.get("openers")
    opener_list = [str(x) for x in openers] if isinstance(openers, list) else None
    if intent == "openers" and opener_list and len(opener_list) < 2:
        opener_list = None
    reply = CoachReply(
        reply=str(parsed.get("reply") or "").strip() or "Mình chưa soạn được câu trả lời rõ.",
        citations=_citations(hits),
        refused=False,
        hedged=False,
        disclaimer=DISCLAIMER_TEXT,
        intent=intent,
        improved_draft=(str(parsed["improved_draft"]) if parsed.get("improved_draft") else None),
        openers=opener_list,
    )
    _record(store, session_id, user_text, intent, reply)
    return reply


def _record(
    store: SessionStore,
    session_id: str,
    user_text: str,
    intent: Intent,
    reply: CoachReply,
) -> None:
    store.add_turn(
        session_id,
        Turn(
            id=str(uuid4()),
            role_user_text=user_text,
            intent=intent,
            reply_text=reply.reply,
            refused=reply.refused,
            hedged=reply.hedged,
        ),
    )
