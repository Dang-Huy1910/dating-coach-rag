"""Unit tests for usage-event seed / schema (Phase B)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from backend.analytics.events import (
    ALLOWED_FIELDS,
    FORBIDDEN_KEYS,
    SEED_DAY_COUNT,
    append_event,
    iter_events,
    seed_demo_events,
)


def test_seed_field_set_and_no_forbidden_keys(tmp_path: Path) -> None:
    paths = seed_demo_events(tmp_path / "lake")
    assert len(paths) == SEED_DAY_COUNT
    events = list(iter_events(tmp_path / "lake"))
    assert len(events) >= 6
    intents = {e["intent"] for e in events}
    assert len(intents) >= 2
    assert any(e["refused"] for e in events)
    for event in events:
        assert set(event.keys()) <= ALLOWED_FIELDS
        assert not FORBIDDEN_KEYS.intersection(event)
        assert event["intent"]
        assert event["dt"]


def test_seed_partition_folders_dt_prefix(tmp_path: Path) -> None:
    lake = tmp_path / "lake"
    seed_demo_events(lake)
    parts = sorted((lake / "events").glob("dt=*"))
    assert len(parts) == SEED_DAY_COUNT
    for part in parts:
        assert part.name.startswith("dt=")
        jsonl = part / "events.jsonl"
        assert jsonl.is_file()
        folder_dt = part.name.removeprefix("dt=")
        for line in jsonl.read_text(encoding="utf-8").splitlines():
            row = json.loads(line)
            assert row["dt"] == folder_dt


def test_overwrite_seed_is_deterministic(tmp_path: Path) -> None:
    lake = tmp_path / "lake"
    seed_demo_events(lake)
    first = {
        str(p.relative_to(lake)): p.read_text(encoding="utf-8")
        for p in sorted((lake / "events").glob("dt=*/events.jsonl"))
    }
    seed_demo_events(lake)
    second = {
        str(p.relative_to(lake)): p.read_text(encoding="utf-8")
        for p in sorted((lake / "events").glob("dt=*/events.jsonl"))
    }
    assert first
    assert first == second


def test_append_rejects_forbidden_keys(tmp_path: Path) -> None:
    lake = tmp_path / "lake"
    with pytest.raises(ValueError, match="forbidden"):
        append_event(
            lake,
            {
                "event_id": "e1",
                "event_ts": "2026-09-05T10:00:00Z",
                "dt": "2026-09-05",
                "session_id": "s1",
                "intent": "ask",
                "refused": False,
                "hedged": False,
                "citation_count": 0,
                "latency_ms": 1,
                "message": "secret user text",
            },
        )
