"""Usage-event lake helpers (bronze JSONL) and DuckDB SQL runners."""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, Iterator

import duckdb

ALLOWED_FIELDS = frozenset(
    {
        "event_id",
        "event_ts",
        "dt",
        "session_id",
        "intent",
        "refused",
        "hedged",
        "citation_count",
        "latency_ms",
    }
)

FORBIDDEN_KEYS = frozenset(
    {
        "text",
        "body",
        "prompt",
        "message",
        "bio",
        "question",
        "visible_text",
        "content",
    }
)

VALID_INTENTS = frozenset(
    {
        "ask",
        "rewrite_bio",
        "analyze_message",
        "openers",
        "profile_context",
    }
)

# Deterministic seed dates (UTC) for demo reproducibility.
SEED_BASE_DATE = datetime(2026, 9, 5, tzinfo=UTC)
SEED_DAY_COUNT = 3

REPO_ROOT = Path(__file__).resolve().parents[2]
SQL_DIR = REPO_ROOT / "sql"


def events_partition_dir(lake_dir: Path, dt: str) -> Path:
    return Path(lake_dir) / "events" / f"dt={dt}"


def events_jsonl_path(lake_dir: Path, dt: str) -> Path:
    return events_partition_dir(lake_dir, dt) / "events.jsonl"


def mart_parquet_path(warehouse_dir: Path) -> Path:
    return Path(warehouse_dir) / "mart_daily_intent.parquet"


def validate_event(event: dict[str, Any]) -> dict[str, Any]:
    """Return a sanitized event with only allowed fields; raise on forbidden keys."""
    bad = FORBIDDEN_KEYS.intersection(event)
    if bad:
        raise ValueError(f"forbidden event keys: {sorted(bad)}")
    missing = {"event_id", "event_ts", "dt", "session_id", "intent"} - set(event)
    if missing:
        raise ValueError(f"missing required event fields: {sorted(missing)}")
    return {k: event[k] for k in ALLOWED_FIELDS if k in event}


def append_event(lake_dir: Path, event: dict[str, Any]) -> Path:
    """Append one validated UsageEvent JSON line under dt= partition."""
    clean = validate_event(event)
    dt = str(clean["dt"])
    path = events_jsonl_path(lake_dir, dt)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(clean, ensure_ascii=False, separators=(",", ":")) + "\n")
    return path


def iter_events(lake_dir: Path) -> Iterator[dict[str, Any]]:
    """Yield valid events from all dt= partitions; skip corrupt / incomplete rows."""
    root = Path(lake_dir) / "events"
    if not root.is_dir():
        return
    for part in sorted(root.glob("dt=*")):
        if not part.is_dir():
            continue
        folder_dt = part.name.removeprefix("dt=")
        jsonl = part / "events.jsonl"
        if not jsonl.is_file():
            continue
        with jsonl.open(encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if not isinstance(row, dict):
                    continue
                if FORBIDDEN_KEYS.intersection(row):
                    continue
                intent = row.get("intent")
                dt = row.get("dt")
                if not intent or not dt:
                    continue
                if str(dt) != folder_dt:
                    continue
                yield {k: row[k] for k in ALLOWED_FIELDS if k in row}


def count_valid_events(lake_dir: Path) -> int:
    return sum(1 for _ in iter_events(lake_dir))


def _seed_uuid(namespace: str, key: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"dating-coach-analytics:{namespace}:{key}"))


def seed_demo_events(lake_dir: Path) -> list[Path]:
    """Overwrite deterministic 3-day demo partitions (no forbidden keys)."""
    lake = Path(lake_dir)
    written: list[Path] = []
    # Day 0: ask + openers; Day 1: ask (refused) + rewrite_bio; Day 2: analyze + ask
    plan: list[tuple[int, str, bool, bool, int, int | None]] = [
        (0, "ask", False, False, 2, 120),
        (0, "openers", False, False, 1, 95),
        (0, "ask", False, True, 0, 80),
        (1, "ask", True, False, 0, 60),
        (1, "rewrite_bio", False, False, 3, 200),
        (1, "openers", False, False, 2, 110),
        (2, "analyze_message", False, False, 2, 150),
        (2, "ask", False, False, 1, 90),
        (2, "profile_context", False, True, 1, 130),
    ]
    by_day: dict[str, list[dict[str, Any]]] = {}
    for idx, (day_offset, intent, refused, hedged, cites, latency) in enumerate(plan):
        day = SEED_BASE_DATE + timedelta(days=day_offset)
        dt = day.strftime("%Y-%m-%d")
        event_ts = (day + timedelta(hours=10, minutes=idx)).isoformat().replace("+00:00", "Z")
        event = {
            "event_id": _seed_uuid("event", f"{dt}:{idx}:{intent}"),
            "event_ts": event_ts,
            "dt": dt,
            "session_id": _seed_uuid("session", f"day{day_offset}"),
            "intent": intent,
            "refused": refused,
            "hedged": hedged,
            "citation_count": cites,
            "latency_ms": latency,
        }
        by_day.setdefault(dt, []).append(validate_event(event))

    for dt, rows in by_day.items():
        path = events_jsonl_path(lake, dt)
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as handle:
            for row in rows:
                handle.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
        written.append(path)
    return written


def _read_sql(name: str) -> str:
    path = SQL_DIR / name
    return path.read_text(encoding="utf-8")


def run_hive_daily_metrics(lake_dir: Path, warehouse_dir: Path) -> int:
    """Execute Hive-style aggregate SQL; write mart parquet. Returns row count."""
    lake = Path(lake_dir).resolve()
    warehouse = Path(warehouse_dir).resolve()
    warehouse.mkdir(parents=True, exist_ok=True)
    mart = mart_parquet_path(warehouse)
    events_glob = str(lake / "events" / "dt=*" / "events.jsonl").replace("'", "''")
    mart_out = str(mart).replace("'", "''")
    sql = _read_sql("hive_daily_metrics.sql")
    sql = sql.replace("{{EVENTS_GLOB}}", events_glob).replace("{{MART_PATH}}", mart_out)
    con = duckdb.connect()
    try:
        con.execute(sql)
        count_sql = f"SELECT COUNT(*) FROM read_parquet('{mart_out}')"
        row_count = int(con.execute(count_sql).fetchone()[0])
    finally:
        con.close()
    return row_count


def run_presto_explore(warehouse_dir: Path) -> list[dict[str, Any]]:
    """Execute Presto-style explore SQL on mart; return list of row dicts."""
    mart = mart_parquet_path(Path(warehouse_dir)).resolve()
    if not mart.is_file():
        raise FileNotFoundError(f"mart parquet missing: {mart}")
    mart_path = str(mart).replace("'", "''")
    sql = _read_sql("presto_explore.sql")
    sql = sql.replace("{{MART_PATH}}", mart_path)
    con = duckdb.connect()
    try:
        rel = con.execute(sql)
        columns = [d[0] for d in rel.description]
        rows = [dict(zip(columns, row, strict=True)) for row in rel.fetchall()]
    finally:
        con.close()
    return rows
