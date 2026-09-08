"""Classify then run 1–4 existing handle() jobs — P2 multi-step coach agent.

P1 single-job behavior is preserved when the plan has one intent.
See specs/009-multi-step-agent/plan.md and research.md.
"""

from __future__ import annotations

import re
from collections.abc import Callable, Iterator
from uuid import uuid4

from backend.app.agent.classify import DRAFT_JOBS, RoutingDecision, classify_message
from backend.app.agent.extras import (
    ANALYZE_MESSAGE_EXTRA,
    OPENERS_EXTRA,
    PROFILE_CONTEXT_EXTRA,
    REWRITE_BIO_EXTRA,
)
from backend.app.agent.labels import intent_label
from backend.app.coach import _refusal_reply, handle
from backend.app.config import DISCLAIMER_TEXT
from backend.app.models import AgentStep, Citation, CoachReply, Intent, ProfileContextRequest
from backend.app.public_fetch import (
    classify_profile_url,
    fetch_public_profile,
    merge_fetched_text,
)
from backend.app.session_store import SessionStore, Turn

_URL_RE = re.compile(r"https?://[^\s<>\"']+", re.I)

_ASK_TO_PASTE: dict[str, str] = {
    "rewrite_bio": (
        "Hãy dán bio hiện tại để mình sửa giúp. Đừng gửi mỗi câu 'sửa bio'."
    ),
    "analyze_message": (
        "Hãy dán nội dung tin nhắn cần phân tích để mình góp ý tone, độ rõ và bản viết lại."
    ),
    "openers": (
        "Hãy mô tả ngữ cảnh mở lời (app, bạn chung, sở thích chung) để mình gợi ý opener."
    ),
    "profile_context": (
        "Hãy dán bio/caption công khai bạn đã thấy (hoặc link YouTube/Reddit). "
        "Link Instagram/TikTok không được tải tự động — dùng màn Profile công khai nếu cần ảnh chụp."
    ),
}

_EXTRAS: dict[str, str] = {
    "rewrite_bio": REWRITE_BIO_EXTRA,
    "analyze_message": ANALYZE_MESSAGE_EXTRA,
    "openers": OPENERS_EXTRA,
    "profile_context": PROFILE_CONTEXT_EXTRA,
}

_FOLLOW_UP_NOTE = (
    "Phần việc còn lại có thể làm ở lượt sau (mỗi lượt tối đa bốn năng lực)."
)

StepCallback = Callable[[AgentStep], None]


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


def _ask_to_paste_text(intent: Intent) -> str:
    return _ASK_TO_PASTE.get(
        intent,
        "Hãy dán thêm nội dung cụ thể để mình hỗ trợ.",
    )


def _ask_to_paste(intent: Intent, steps: list[AgentStep] | None = None) -> CoachReply:
    return CoachReply(
        reply=_ask_to_paste_text(intent),
        citations=[],
        refused=False,
        hedged=True,
        disclaimer=DISCLAIMER_TEXT,
        intent=intent,
        improved_draft=None,
        openers=None,
        steps=steps,
    )


def extract_fetchable_url(message: str) -> str | None:
    """Return first YouTube/Reddit URL in message; never Instagram/TikTok."""
    for match in _URL_RE.finditer(message or ""):
        url = match.group(0).rstrip(").,];")
        host = classify_profile_url(url)
        if host in {"youtube", "reddit"}:
            return url
    return None


def _build_profile_request(message: str) -> ProfileContextRequest:
    url = extract_fetchable_url(message)
    visible = message
    body = ProfileContextRequest(
        visible_text=visible,
        question=message,
        profile_url=url,
    )
    if url:
        fetched = fetch_public_profile(url)
        if fetched.text:
            body = body.model_copy(
                update={"visible_text": merge_fetched_text(body.visible_text, fetched.text)}
            )
    return body


def _depends_on_draft(intent: Intent, plan: list[Intent]) -> bool:
    """Openers after a rewrite/analyze job depend on that draft."""
    if intent != "openers":
        return False
    return any(j in ("rewrite_bio", "analyze_message") for j in plan)


def _job_user_text(
    intent: Intent,
    message: str,
    improved_draft: str | None,
    plan: list[Intent],
) -> str:
    if intent in ("openers", "analyze_message") and improved_draft:
        if intent == "openers":
            return (
                f"{message}\n\n"
                f"Dùng bản nháp đã cải thiện sau đây làm ngữ cảnh chính để gợi ý opener:\n"
                f"{improved_draft}"
            )
        return (
            f"Phân tích / viết lại dựa trên bản nháp đã cải thiện:\n{improved_draft}\n\n"
            f"Ngữ cảnh gốc từ người dùng:\n{message}"
        )
    return message


def _merge_citations(citations: list[Citation]) -> list[Citation]:
    best: dict[tuple[str, str], Citation] = {}
    for cite in citations:
        key = (cite.source_id, cite.path)
        prev = best.get(key)
        if prev is None or cite.score > prev.score:
            best[key] = cite
    return list(best.values())


def _merge_replies(
    *,
    primary: Intent,
    plan: list[Intent],
    step_replies: list[tuple[AgentStep, CoachReply | None]],
    truncated: bool,
) -> CoachReply:
    sections: list[str] = []
    all_citations: list[Citation] = []
    improved_draft: str | None = None
    openers: list[str] | None = None
    tone = clarity = risk = None
    analysis_points: list[str] | None = None
    steps: list[AgentStep] = []
    any_hedge = False
    refused_flags: list[bool] = []

    multi = len(plan) > 1

    for step, reply in step_replies:
        steps.append(step)
        if step.status == "skipped_needs_draft":
            any_hedge = True
            text = _ask_to_paste_text(step.intent)
            if multi:
                sections.append(f"### {step.label}\n{text}")
            else:
                sections.append(text)
            continue

        if reply is None:
            continue

        refused_flags.append(reply.refused)
        if reply.hedged:
            any_hedge = True
        if reply.citations:
            all_citations.extend(reply.citations)

        body = (reply.reply or "").strip()
        if multi and body:
            sections.append(f"### {step.label}\n{body}")
        elif body:
            sections.append(body)

        if reply.improved_draft:
            improved_draft = reply.improved_draft
        if reply.openers:
            if openers is None or len(reply.openers) >= 2:
                openers = reply.openers
            elif openers is None:
                openers = reply.openers
        if reply.tone:
            tone = reply.tone
        if reply.clarity:
            clarity = reply.clarity
        if reply.risk:
            risk = reply.risk
        if reply.analysis_points:
            analysis_points = reply.analysis_points

    merged_text = "\n\n".join(sections).strip()
    if truncated:
        merged_text = (
            f"{merged_text}\n\n{_FOLLOW_UP_NOTE}".strip()
            if merged_text
            else _FOLLOW_UP_NOTE
        )

    all_refused = bool(refused_flags) and all(refused_flags) and not any(
        s.status == "skipped_needs_draft" for s, _ in step_replies
    )
    # Safety-style: every runnable job refused, and no skip paste path
    only_skips = all(s.status == "skipped_needs_draft" for s, _ in step_replies)
    if only_skips:
        all_refused = False

    return CoachReply(
        reply=merged_text or _ask_to_paste_text(primary),
        citations=_merge_citations(all_citations),
        refused=all_refused,
        hedged=any_hedge or only_skips,
        disclaimer=DISCLAIMER_TEXT,
        intent=primary,
        improved_draft=improved_draft,
        openers=openers,
        tone=tone,
        clarity=clarity,
        risk=risk,
        analysis_points=analysis_points,
        steps=steps,
    )


def _run_one_job(
    *,
    store: SessionStore,
    session_id: str,
    intent: Intent,
    message: str,
    user_text: str,
) -> CoachReply:
    extra = _EXTRAS.get(intent, "")
    if intent == "profile_context":
        profile_request = _build_profile_request(message)
        return handle(
            store=store,
            session_id=session_id,
            intent="profile_context",
            user_text="",
            extra=extra or PROFILE_CONTEXT_EXTRA,
            profile_request=profile_request,
            record_turn=False,
        )
    return handle(
        store=store,
        session_id=session_id,
        intent=intent,
        user_text=user_text,
        extra=extra,
        record_turn=False,
    )


def iter_agent_events(
    store: SessionStore,
    session_id: str,
    message: str,
) -> Iterator[tuple[str, AgentStep | CoachReply]]:
    """Yield ("step", AgentStep) before/as each job settles, then ("done", CoachReply)."""
    decision: RoutingDecision = classify_message(message)

    if decision.blocked and decision.safety is not None:
        reply = _refusal_reply("ask", decision.safety)
        reply = reply.model_copy(update={"steps": None})
        _record(store, session_id, message, "ask", reply)
        yield ("done", reply)
        return

    plan = list(decision.intents)
    primary: Intent = plan[0]
    skip_dependents = False
    improved_draft: str | None = None
    step_replies: list[tuple[AgentStep, CoachReply | None]] = []

    for intent in plan:
        label = intent_label(intent)

        # needs_draft: skip specialized jobs; skip draft-dependent openers; ask may run.
        needs_skip = False
        if decision.needs_draft and intent != "ask":
            needs_skip = True
            if intent in DRAFT_JOBS:
                skip_dependents = True
        elif skip_dependents and intent == "openers" and _depends_on_draft(intent, plan):
            needs_skip = True

        if needs_skip:
            step = AgentStep(
                intent=intent,
                status="skipped_needs_draft",
                label=label,
            )
            yield ("step", step)
            step_replies.append((step, None))
            continue

        # Announce step before running the job (progress for SSE).
        pending = AgentStep(intent=intent, status="completed", label=label)
        yield ("step", pending)

        user_text = _job_user_text(intent, message, improved_draft, plan)
        job_reply = _run_one_job(
            store=store,
            session_id=session_id,
            intent=intent,
            message=message,
            user_text=user_text,
        )

        status: str = "refused" if job_reply.refused else "completed"
        step = AgentStep(intent=intent, status=status, label=label)  # type: ignore[arg-type]
        step_replies.append((step, job_reply))

        if job_reply.improved_draft:
            improved_draft = job_reply.improved_draft
        if job_reply.refused and intent in DRAFT_JOBS:
            # Later openers must not invent from a refused rewrite.
            skip_dependents = True

    merged = _merge_replies(
        primary=primary,
        plan=plan,
        step_replies=step_replies,
        truncated=decision.truncated,
    )
    _record(store, session_id, message, primary, merged)
    yield ("done", merged)


def run_agent(
    store: SessionStore,
    session_id: str,
    message: str,
    on_step: StepCallback | None = None,
) -> CoachReply:
    """Safety → classify → 1..n handle() (or ask-to-paste / refuse); merge one CoachReply."""
    reply: CoachReply | None = None
    for kind, payload in iter_agent_events(store, session_id, message):
        if kind == "step" and on_step is not None and isinstance(payload, AgentStep):
            on_step(payload)
        elif kind == "done" and isinstance(payload, CoachReply):
            reply = payload
    if reply is None:
        # Defensive — iter_agent_events always yields done.
        reply = _ask_to_paste("ask")
        _record(store, session_id, message, "ask", reply)
    return reply
