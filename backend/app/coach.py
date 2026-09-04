from __future__ import annotations

import json
import re
from collections.abc import Iterator
from uuid import uuid4

from backend.app.config import DISCLAIMER_TEXT, get_settings
from backend.app.models import Citation, CoachReply, Intent, ProfileContextRequest, ProfileImage
from backend.app.profile_gate import classify, compose_snapshot
from backend.app.prompts import PROFILE_CONTEXT_EXTRA, SYSTEM_PROMPT, build_user_prompt
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


class LLMProviderError(RuntimeError):
    """Raised when the upstream LLM provider fails in a user-visible way."""

    def __init__(self, message: str, *, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


def _groq_user_content(prompt: str, images: list[ProfileImage] | None):
    if not images:
        return prompt
    parts: list[dict] = [{"type": "text", "text": prompt}]
    for image in images:
        parts.append(
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:{image.mime_type};base64,{image.data_base64}",
                },
            }
        )
    return parts


def _complete_groq(prompt: str, settings, images: list[ProfileImage] | None = None) -> str:
    if not settings.groq_api_key:
        raise LLMProviderError("GROQ_API_KEY is missing", status_code=500)
    from groq import Groq

    try:
        client = Groq(api_key=settings.groq_api_key)
        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": _groq_user_content(prompt, images)},
            ],
            temperature=0.4,
        )
    except LLMProviderError:
        raise
    except Exception as exc:  # noqa: BLE001 — surface provider failures to API layer
        raise LLMProviderError(f"Groq API lỗi: {exc}", status_code=502) from exc
    return response.choices[0].message.content or ""


def _complete_gemini(
    prompt: str, settings, images: list[ProfileImage] | None = None
) -> str:
    if not settings.gemini_api_key:
        raise LLMProviderError("GEMINI_API_KEY is missing", status_code=500)
    import httpx

    model = (settings.gemini_model or "gemini-flash-lite-latest").strip()
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent"
    )
    parts: list[dict] = [{"text": prompt}]
    for image in images or []:
        parts.append(
            {"inline_data": {"mime_type": image.mime_type, "data": image.data_base64}}
        )
    payload = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": parts}],
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
        if response.status_code == 429:
            raise LLMProviderError(
                "Gemini đang hết hạn mức (quota). Đợi vài phút hoặc đổi model/provider.",
                status_code=429,
            )
        raise LLMProviderError(
            f"Gemini API lỗi {response.status_code}: {detail}",
            status_code=502,
        )
    data = response.json()
    try:
        parts = data["candidates"][0]["content"]["parts"]
        return "".join(str(p.get("text", "")) for p in parts).strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise LLMProviderError(
            f"Phản hồi Gemini không hợp lệ: {data!r}",
            status_code=502,
        ) from exc


def complete(prompt: str, images: list[ProfileImage] | None = None) -> str:
    settings = get_settings()
    provider = _provider(settings)
    # Screenshots need a vision-capable model. Gemini Flash is in-stack; Groq's
    # default text model is not. Prefer Gemini whenever images + key exist.
    if images and settings.gemini_api_key:
        return _complete_gemini(prompt, settings, images=images)
    if provider == "groq":
        return _complete_groq(prompt, settings, images=images)
    if provider in {"gemini", "google"}:
        return _complete_gemini(prompt, settings, images=images)
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
    cites: list[Citation] = []
    for hit in hits:
        path = hit.chunk.path or ""
        if not path.startswith("data/knowledge/"):
            continue
        if "instagram.com" in path.lower() or path.startswith("http"):
            continue
        cites.append(
            Citation(
                source_id=hit.chunk.source_id,
                title=hit.chunk.title,
                heading=hit.chunk.heading,
                path=path,
                score=round(hit.score, 4),
            )
        )
    return cites


def _clean_json_candidate(text: str) -> str:
    s = text.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
        s = re.sub(r"\s*```$", "", s).strip()
    return s


def _repair_json_escapes(s: str) -> str:
    return re.sub(r"\\([^\"\\/bfnrtu])", r"\1", s)


def _parse_model_json(raw: str) -> dict:
    text = raw.strip()
    cleaned = _clean_json_candidate(text)
    match = _JSON_BLOCK.search(cleaned) or _JSON_BLOCK.search(text)
    candidates = [cleaned, text]
    if match:
        candidates.insert(0, match.group(0))

    for c in candidates:
        for attempt in [c, _repair_json_escapes(c)]:
            try:
                return json.loads(attempt, strict=False)
            except (json.JSONDecodeError, ValueError):
                pass

    return {"reply": text, "improved_draft": None, "openers": None}


def _clean_label(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _strip_disclaimer_echo(reply: str) -> str:
    """Drop a leading product-disclaimer echo; UI already shows disclaimer."""
    text = (reply or "").strip()
    if not text:
        return text
    needle = "Đây là chatbot coach"
    if text.startswith(needle) or text.lower().startswith("this is a dating-communication coach"):
        parts = re.split(r"\n\s*\n", text, maxsplit=1)
        if len(parts) == 2 and parts[1].strip():
            return parts[1].strip()
        # Single block that is mostly disclaimer — keep original rather than empty
        if len(text) < 220:
            return text
    return text


def _fill_analyze_metrics(
    *,
    draft: str,
    reply_text: str,
    tone: str | None,
    clarity: str | None,
    risk: str | None,
) -> tuple[str | None, str | None, str | None]:
    """Ensure tone/clarity/risk come from the LLM (retry once if missing)."""
    if tone and clarity and risk:
        return tone, clarity, risk

    prompt = (
        "Intent: analyze_message_metrics_only\n"
        "Return JSON only with keys tone, clarity, risk — short Vietnamese labels "
        "(max ~10 words each). risk = interpersonal communication pressure/clarity/"
        "boundaries, NOT clinical diagnosis.\n\n"
        f"Message draft:\n{draft}\n\n"
        f"Coach analysis so far:\n{reply_text}\n"
    )
    try:
        parsed = _parse_model_json(complete(prompt))
    except Exception:
        return tone, clarity, risk

    return (
        tone or _clean_label(parsed.get("tone")),
        clarity or _clean_label(parsed.get("clarity")),
        risk or _clean_label(parsed.get("risk")),
    )


def _parse_analysis_points(raw: object) -> list[str] | None:
    if not isinstance(raw, list):
        return None
    points = [str(x).strip() for x in raw if str(x).strip()]
    return points or None


def _fill_bio_analysis_points(
    *,
    draft: str,
    reply_text: str,
    points: list[str] | None,
) -> list[str] | None:
    """Ensure rewrite_bio evaluation bullets come from the LLM (retry once if thin)."""
    if points and len(points) >= 2:
        return points[:4]

    prompt = (
        "Intent: rewrite_bio_analysis_points_only\n"
        "Return JSON only with key analysis_points: array of 2–4 short Vietnamese "
        "bullets evaluating THIS dating bio (vague wording, missing specifics, "
        "missing natural invite/hook). No product disclaimer.\n\n"
        f"Bio draft:\n{draft}\n\n"
        f"Coach analysis so far:\n{reply_text}\n"
    )
    try:
        parsed = _parse_model_json(complete(prompt))
    except Exception:
        return points

    filled = _parse_analysis_points(parsed.get("analysis_points"))
    if filled and len(filled) >= 2:
        return filled[:4]
    return points

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


def _private_refusal(intent: Intent, message: str) -> CoachReply:
    return CoachReply(
        reply=message,
        citations=[],
        refused=True,
        hedged=False,
        disclaimer=DISCLAIMER_TEXT,
        intent=intent,
        improved_draft=None,
        openers=None,
    )


def handle(
    *,
    store: SessionStore,
    session_id: str,
    intent: Intent,
    user_text: str,
    extra: str = "",
    profile_request: ProfileContextRequest | None = None,
) -> CoachReply:
    if intent == "profile_context" and profile_request is not None:
        return _handle_profile_context(
            store=store,
            session_id=session_id,
            profile_request=profile_request,
            extra=extra,
        )

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

    reply_text = _strip_disclaimer_echo(
        str(parsed.get("reply") or "").strip() or "Mình chưa soạn được câu trả lời rõ."
    )
    tone = clarity = risk = None
    analysis_points = _parse_analysis_points(parsed.get("analysis_points"))
    if intent == "analyze_message":
        tone, clarity, risk = _fill_analyze_metrics(
            draft=user_text,
            reply_text=reply_text,
            tone=_clean_label(parsed.get("tone")),
            clarity=_clean_label(parsed.get("clarity")),
            risk=_clean_label(parsed.get("risk")),
        )
    if intent == "rewrite_bio":
        analysis_points = _fill_bio_analysis_points(
            draft=user_text,
            reply_text=reply_text,
            points=analysis_points,
        )

    reply = CoachReply(
        reply=reply_text,
        citations=_citations(hits),
        refused=False,
        hedged=False,
        disclaimer=DISCLAIMER_TEXT,
        intent=intent,
        improved_draft=(str(parsed["improved_draft"]) if parsed.get("improved_draft") else None),
        openers=opener_list,
        tone=tone,
        clarity=clarity,
        risk=risk,
        analysis_points=analysis_points,
    )
    _record(store, session_id, user_text, intent, reply)
    return reply


def _handle_profile_context(
    *,
    store: SessionStore,
    session_id: str,
    profile_request: ProfileContextRequest,
    extra: str = "",
) -> CoachReply:
    intent: Intent = "profile_context"
    snapshot = compose_snapshot(profile_request)
    gate = classify(profile_request)

    if gate.code == "blocked_safety":
        safety = SafetyVerdict(
            allowed=False,
            category=gate.safety_category,
            user_message=gate.user_message,
        )
        reply = _refusal_reply(intent, safety)
        _record(store, session_id, snapshot, intent, reply)
        return reply

    if gate.code == "private_out_of_scope":
        reply = _private_refusal(intent, gate.user_message)
        _record(store, session_id, snapshot, intent, reply)
        return reply

    if not index_ready():
        raise IndexNotReadyError("index_not_ready")

    caption_blob = " ".join(
        f"{(image.caption or '').strip()} {(image.comments or '').strip()}"
        for image in profile_request.images or []
    )
    query = " ".join(
        part
        for part in (
            (profile_request.visible_text or "").strip(),
            (profile_request.question or "").strip(),
            (profile_request.relationship_progress or "").strip(),
            caption_blob.strip(),
        )
        if part
    )
    if not query and profile_request.images:
        query = "cách mở lời từ bio caption công khai không theo dõi"
    hits = retrieve_chunks(query) if query else []
    if not hits:
        reply = _unknown_reply(intent, craft=False)
        _record(store, session_id, snapshot, intent, reply)
        return reply

    prompt_extra = extra or PROFILE_CONTEXT_EXTRA
    prompt = build_user_prompt(
        intent=intent,
        user_text=snapshot,
        excerpts=_excerpts(hits),
        history=_history(store, session_id),
        extra=prompt_extra,
    )
    images = list(profile_request.images or [])
    parsed = _parse_model_json(
        complete(prompt, images=images) if images else complete(prompt)
    )
    openers = parsed.get("openers")
    opener_list = [str(x) for x in openers] if isinstance(openers, list) else None
    if opener_list is not None:
        opener_list = [item for item in opener_list if item.strip()] or None

    reply_text = _strip_disclaimer_echo(
        str(parsed.get("reply") or "").strip() or "Mình chưa soạn được câu trả lời rõ."
    )
    reply = CoachReply(
        reply=reply_text,
        citations=_citations(hits),
        refused=False,
        hedged=False,
        disclaimer=DISCLAIMER_TEXT,
        intent=intent,
        improved_draft=(str(parsed["improved_draft"]) if parsed.get("improved_draft") else None),
        openers=opener_list,
        tone=None,
        clarity=None,
        risk=None,
        analysis_points=None,
    )
    _record(store, session_id, snapshot, intent, reply)
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
