"""Ephemeral sitting kit — write coaching artifacts into the session.

See specs/010-session-kit/plan.md and data-model.md.
"""

from __future__ import annotations

from datetime import UTC, datetime

from backend.app.models import CoachReply
from backend.app.session_store import SessionStore

_SLOT_BIO = "bio"
_SLOT_OPENERS = "openers"
_SLOT_MESSAGE = "message"


def _step_completed(reply: CoachReply, intent: str) -> bool:
    if reply.steps:
        return any(s.intent == intent and s.status == "completed" for s in reply.steps)
    return reply.intent == intent


def _openers_job_completed(reply: CoachReply) -> bool:
    if reply.steps:
        return any(
            s.intent in ("openers", "profile_context") and s.status == "completed"
            for s in reply.steps
        )
    return reply.intent in ("openers", "profile_context")


def apply_reply_to_kit(
    store: SessionStore,
    session_id: str,
    reply: CoachReply,
) -> list[str]:
    """Write successful artifacts into independent kit slots. Returns slot names written."""
    if reply.refused:
        return []

    session = store.get(session_id)
    if session is None:
        return []

    kit = session.kit
    written: list[str] = []
    now = datetime.now(UTC)

    if _step_completed(reply, "rewrite_bio"):
        draft = (reply.improved_draft or "").strip()
        if draft:
            kit.improved_bio = draft
            points = [p.strip() for p in (reply.analysis_points or []) if p and str(p).strip()]
            kit.analysis_points = points or None
            kit.bio_source_intent = "rewrite_bio"
            written.append(_SLOT_BIO)

    if _openers_job_completed(reply):
        openers = [o.strip() for o in (reply.openers or []) if o and str(o).strip()]
        if openers:
            kit.openers = openers
            kit.openers_source_intent = (
                "openers" if reply.intent == "openers" or _step_completed(reply, "openers")
                else "profile_context"
            )
            written.append(_SLOT_OPENERS)

    if _step_completed(reply, "analyze_message"):
        draft = (reply.improved_draft or "").strip()
        if draft:
            kit.improved_message = draft
            kit.tone = (reply.tone or None)
            kit.clarity = (reply.clarity or None)
            kit.risk = (reply.risk or None)
            kit.message_source_intent = "analyze_message"
            written.append(_SLOT_MESSAGE)

    if written:
        kit.updated_at = now
        session.updated_at = now

    return written
