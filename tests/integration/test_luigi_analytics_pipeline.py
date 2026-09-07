"""Integration tests for Luigi analytics pipeline (Phase B)."""

from __future__ import annotations

import csv
from collections import Counter
from pathlib import Path

import luigi
from luigi.execution_summary import LuigiStatusCode

from backend.analytics.events import (
    append_event,
    mart_parquet_path,
    seed_demo_events,
)
from backend.pipelines.analytics import ExportCsv, _force_clean


def _params(tmp_path: Path) -> dict[str, str]:
    lake = tmp_path / "lake"
    warehouse = tmp_path / "warehouse"
    pipeline = tmp_path / "pipeline"
    analytics = tmp_path / "reports" / "analytics"
    warehouse.mkdir()
    pipeline.mkdir()
    analytics.mkdir(parents=True)
    return {
        "lake_dir": str(lake),
        "warehouse_dir": str(warehouse),
        "pipeline_dir": str(pipeline),
        "analytics_dir": str(analytics),
    }


def _write_fixture_lake(lake: Path) -> Counter[tuple[str, str]]:
    """Two days, known day+intent counts for CSV assertions."""
    rows = [
        ("2026-09-05", "ask", False, 2, 100),
        ("2026-09-05", "ask", False, 1, 110),
        ("2026-09-05", "openers", False, 1, 90),
        ("2026-09-06", "ask", True, 0, 50),
        ("2026-09-06", "rewrite_bio", False, 3, 200),
    ]
    counts: Counter[tuple[str, str]] = Counter()
    for i, (dt, intent, refused, cites, latency) in enumerate(rows):
        append_event(
            lake,
            {
                "event_id": f"e-{dt}-{i}",
                "event_ts": f"{dt}T10:0{i}:00Z",
                "dt": dt,
                "session_id": f"s-{dt}",
                "intent": intent,
                "refused": refused,
                "hedged": False,
                "citation_count": cites,
                "latency_ms": latency,
            },
        )
        counts[(dt, intent)] += 1
    return counts


def _build(params: dict[str, str]):
    task = ExportCsv(**params)
    result = luigi.build([task], local_scheduler=True)
    return task, result


def test_full_pipeline_success_and_csv_counts(tmp_path: Path) -> None:
    params = _params(tmp_path)
    lake = Path(params["lake_dir"])
    expected = _write_fixture_lake(lake)
    task, ok = _build(params)
    assert ok is True

    mart = mart_parquet_path(Path(params["warehouse_dir"]))
    assert mart.is_file()
    hive_marker = Path(params["pipeline_dir"]) / "analytics" / "hive_complete.json"
    assert hive_marker.is_file()
    presto_marker = Path(params["pipeline_dir"]) / "analytics" / "presto_result.json"
    assert presto_marker.is_file()
    csv_path = Path(task.output().path)
    assert csv_path.is_file()

    # Explore CSV is by intent across days — sum event_count equals lake size.
    with csv_path.open(encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    assert rows
    total = sum(int(float(r["event_count"])) for r in rows)
    assert total == sum(expected.values())

    by_intent = Counter()
    for (dt, intent), n in expected.items():
        by_intent[intent] += n
    csv_by_intent = {r["intent"]: int(float(r["event_count"])) for r in rows}
    assert csv_by_intent == dict(by_intent)

    # Mart must also reflect day+intent counts.
    import duckdb

    mart_rows = duckdb.connect().execute(
        f"SELECT dt, intent, event_count FROM read_parquet('{mart}') ORDER BY dt, intent"
    ).fetchall()
    mart_counts = {(str(dt), intent): int(n) for dt, intent, n in mart_rows}
    assert mart_counts == dict(expected)


def test_empty_lake_is_not_success(tmp_path: Path) -> None:
    params = _params(tmp_path)
    task = ExportCsv(**params)
    result = luigi.build([task], local_scheduler=True, detailed_summary=True)
    assert result.status != LuigiStatusCode.SUCCESS
    assert not Path(params["analytics_dir"], "presto_explore.csv").exists()
    assert not (
        Path(params["pipeline_dir"]) / "analytics" / "hive_complete.json"
    ).exists()


def test_skip_on_complete_and_partial_csv_rebuild(tmp_path: Path) -> None:
    params = _params(tmp_path)
    _write_fixture_lake(Path(params["lake_dir"]))
    _, ok1 = _build(params)
    assert ok1 is True
    hive_marker = Path(params["pipeline_dir"]) / "analytics" / "hive_complete.json"
    mtime1 = hive_marker.stat().st_mtime_ns

    _, ok2 = _build(params)
    assert ok2 is True
    mtime2 = hive_marker.stat().st_mtime_ns
    assert mtime2 == mtime1

    csv_path = Path(params["analytics_dir"]) / "presto_explore.csv"
    csv_path.unlink()
    assert not csv_path.exists()
    _, ok3 = _build(params)
    assert ok3 is True
    assert csv_path.exists()
    mtime3 = hive_marker.stat().st_mtime_ns
    assert mtime3 == mtime1


def test_force_clean_reruns_hive(tmp_path: Path) -> None:
    params = _params(tmp_path)
    lake = Path(params["lake_dir"])
    _write_fixture_lake(lake)
    _, ok1 = _build(params)
    assert ok1 is True
    hive_marker = Path(params["pipeline_dir"]) / "analytics" / "hive_complete.json"
    mtime1 = hive_marker.stat().st_mtime_ns
    lake_before = {
        str(p.relative_to(lake)): p.read_text(encoding="utf-8")
        for p in (lake / "events").glob("dt=*/events.jsonl")
    }

    _force_clean(
        Path(params["pipeline_dir"]),
        Path(params["warehouse_dir"]),
        Path(params["analytics_dir"]),
    )
    assert not hive_marker.exists()
    assert not mart_parquet_path(Path(params["warehouse_dir"])).exists()
    assert not (Path(params["analytics_dir"]) / "presto_explore.csv").exists()
    # Lake preserved
    lake_after = {
        str(p.relative_to(lake)): p.read_text(encoding="utf-8")
        for p in (lake / "events").glob("dt=*/events.jsonl")
    }
    assert lake_after == lake_before

    _, ok2 = _build(params)
    assert ok2 is True
    assert hive_marker.exists()
    assert hive_marker.stat().st_mtime_ns >= mtime1


def test_seed_then_pipeline(tmp_path: Path) -> None:
    params = _params(tmp_path)
    seed_demo_events(Path(params["lake_dir"]))
    _, ok = _build(params)
    assert ok is True
    assert (Path(params["analytics_dir"]) / "presto_explore.csv").is_file()
