"""Tests for best-effort usage-event emit (no user text)."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock

from backend.analytics.emit import emit_usage_event
from backend.analytics.events import ALLOWED_FIELDS, FORBIDDEN_KEYS, iter_events
from backend.app.config import get_settings
from backend.app.models import CoachReply


def test_emit_payload_has_no_forbidden_keys(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("DATING_COACH_EMIT_EVENTS", "true")
    monkeypatch.setenv("LAKE_DIR", str(tmp_path / "lake"))
    get_settings.cache_clear()
    emit_usage_event(
        intent="ask",
        refused=False,
        hedged=True,
        citation_count=2,
        latency_ms=42,
        session_id="11111111-1111-1111-1111-111111111111",
    )
    events = list(iter_events(tmp_path / "lake"))
    assert len(events) == 1
    event = events[0]
    assert set(event.keys()) <= ALLOWED_FIELDS
    assert not FORBIDDEN_KEYS.intersection(event)
    assert "message" not in event
    assert "question" not in event
    assert "bio" not in event
    assert event["intent"] == "ask"
    assert event["citation_count"] == 2
    assert event["latency_ms"] == 42
    # On-disk JSON must not contain forbidden keys either
    jsonl = next((tmp_path / "lake" / "events").glob("dt=*/events.jsonl"))
    raw = json.loads(jsonl.read_text(encoding="utf-8").strip().splitlines()[0])
    assert not FORBIDDEN_KEYS.intersection(raw)


def test_emit_exception_does_not_raise(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("DATING_COACH_EMIT_EVENTS", "true")
    get_settings.cache_clear()
    # Read-only path (file where a directory is required) forces append failure.
    bad = tmp_path / "not-a-dir"
    bad.write_text("x", encoding="utf-8")
    emit_usage_event(
        intent="openers",
        refused=False,
        hedged=False,
        citation_count=0,
        latency_ms=1,
        session_id="s",
        lake_dir=bad,
    )


def test_emit_disabled_by_env(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("DATING_COACH_EMIT_EVENTS", "false")
    monkeypatch.setenv("LAKE_DIR", str(tmp_path / "lake"))
    get_settings.cache_clear()
    emit_usage_event(
        intent="ask",
        refused=False,
        hedged=False,
        citation_count=0,
        latency_ms=1,
        session_id="s",
    )
    assert list(iter_events(tmp_path / "lake")) == []


def test_router_emit_after_successful_handle(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setenv("DATING_COACH_EMIT_EVENTS", "true")
    monkeypatch.setenv("LAKE_DIR", str(tmp_path / "lake"))
    get_settings.cache_clear()

    from backend.app.api import router as router_mod
    from backend.app.config import DISCLAIMER_TEXT

    reply = CoachReply(
        reply="ok",
        citations=[],
        refused=False,
        hedged=False,
        disclaimer=DISCLAIMER_TEXT,
        intent="ask",
    )
    monkeypatch.setattr(router_mod, "handle", lambda **_kwargs: reply)
    monkeypatch.setattr(router_mod, "_session_or_404", lambda *_a, **_k: MagicMock())

    request = MagicMock()
    out = router_mod._run(request, "sess-1", "ask", "user question text")
    assert out.reply == "ok"
    events = list(iter_events(tmp_path / "lake"))
    assert len(events) == 1
    assert events[0]["intent"] == "ask"
    assert events[0]["session_id"] == "sess-1"
    # Ensure user text never landed in the event
    blob = json.dumps(events[0])
    assert "user question text" not in blob
