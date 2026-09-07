"""Best-effort API hook to append UsageEvent metrics (no user text)."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from backend.analytics.events import append_event
from backend.app.config import get_settings

logger = logging.getLogger(__name__)


def emit_usage_event(
    *,
    intent: str,
    refused: bool,
    hedged: bool,
    citation_count: int,
    latency_ms: int | None,
    session_id: str,
    lake_dir: Any | None = None,
) -> None:
    """Append one metrics event. Never raises; never stores request text."""
    try:
        settings = get_settings()
        if not settings.dating_coach_emit_events:
            return
        now = datetime.now(UTC)
        event = {
            "event_id": str(uuid.uuid4()),
            "event_ts": now.isoformat().replace("+00:00", "Z"),
            "dt": now.strftime("%Y-%m-%d"),
            "session_id": str(session_id),
            "intent": str(intent),
            "refused": bool(refused),
            "hedged": bool(hedged),
            "citation_count": int(citation_count),
            "latency_ms": None if latency_ms is None else int(latency_ms),
        }
        target = lake_dir if lake_dir is not None else settings.lake_dir
        append_event(target, event)
    except Exception:
        logger.exception("emit_usage_event failed (swallowed)")
