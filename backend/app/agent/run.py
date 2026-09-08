"""Classify then call existing handle() once — P1 coach router.

See specs/008-coach-router-agent/plan.md.
"""

from __future__ import annotations

import re
from uuid import uuid4

from backend.app.agent.classify import RoutingDecision, classify_message
from backend.app.agent.extras import (
    ANALYZE_MESSAGE_EXTRA,
    OPENERS_EXTRA,
    PROFILE_CONTEXT_EXTRA,
    REWRITE_BIO_EXTRA,
)
from backend.app.coach import _refusal_reply, handle
from backend.app.config import DISCLAIMER_TEXT
from backend.app.models import CoachReply, Intent, ProfileContextRequest
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


def _ask_to_paste(intent: Intent) -> CoachReply:
    return CoachReply(
        reply=_ASK_TO_PASTE.get(
            intent,
            "Hãy dán thêm nội dung cụ thể để mình hỗ trợ.",
        ),
        citations=[],
        refused=False,
        hedged=True,
        disclaimer=DISCLAIMER_TEXT,
        intent=intent,
        improved_draft=None,
        openers=None,
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


def run_agent(
    store: SessionStore,
    session_id: str,
    message: str,
) -> CoachReply:
    """Safety → classify → one handle() (or ask-to-paste / refuse)."""
    decision: RoutingDecision = classify_message(message)

    if decision.blocked and decision.safety is not None:
        reply = _refusal_reply("ask", decision.safety)
        _record(store, session_id, message, "ask", reply)
        return reply

    if decision.needs_draft and decision.intent != "ask":
        reply = _ask_to_paste(decision.intent)
        _record(store, session_id, message, decision.intent, reply)
        return reply

    intent = decision.intent
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
        )

    return handle(
        store=store,
        session_id=session_id,
        intent=intent,
        user_text=message,
        extra=extra,
    )
