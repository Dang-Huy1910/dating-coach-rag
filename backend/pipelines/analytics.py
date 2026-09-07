"""Luigi batch SQL analytics (Phase B).

Chain: HiveDailyMetrics → PrestoExplore → ExportCsv.

Use ``luigi.build(..., local_scheduler=True)`` — never ``luigi.run()`` (pytest argv).

CLI::

    dating-coach-analytics --seed
    dating-coach-analytics
    dating-coach-analytics --force

``--seed`` writes demo lake partitions and exits 0.
``--force`` deletes analytics markers, warehouse mart, and export CSV — not the event lake.
"""

from __future__ import annotations

import argparse
import csv
import json
import shutil
import sys
from datetime import UTC, datetime
from pathlib import Path

import luigi

from backend.analytics.events import (
    count_valid_events,
    iter_events,
    mart_parquet_path,
    run_hive_daily_metrics,
    run_presto_explore,
    seed_demo_events,
)
from backend.app.config import get_settings


def _path(value: str | Path) -> Path:
    return Path(value)


def _utc_now() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


class HiveDailyMetrics(luigi.Task):
    lake_dir = luigi.Parameter()
    warehouse_dir = luigi.Parameter()
    pipeline_dir = luigi.Parameter()

    def output(self) -> luigi.LocalTarget:
        return luigi.LocalTarget(
            str(_path(self.pipeline_dir) / "analytics" / "hive_complete.json")
        )

    def run(self) -> None:
        lake = _path(self.lake_dir)
        n = count_valid_events(lake)
        if n < 1:
            raise RuntimeError("HiveDailyMetrics: zero valid events in lake")
        row_count = run_hive_daily_metrics(lake, _path(self.warehouse_dir))
        if row_count < 1:
            raise RuntimeError("HiveDailyMetrics: mart has zero rows")
        marker = {
            "row_count": row_count,
            "event_count": n,
            "mart_path": str(mart_parquet_path(_path(self.warehouse_dir))),
            "completed_at": _utc_now(),
        }
        out = _path(self.output().path)
        out.parent.mkdir(parents=True, exist_ok=True)
        with self.output().open("w") as handle:
            json.dump(marker, handle, ensure_ascii=False, indent=2)
            handle.write("\n")


class PrestoExplore(luigi.Task):
    lake_dir = luigi.Parameter()
    warehouse_dir = luigi.Parameter()
    pipeline_dir = luigi.Parameter()

    def requires(self) -> HiveDailyMetrics:
        return HiveDailyMetrics(
            lake_dir=self.lake_dir,
            warehouse_dir=self.warehouse_dir,
            pipeline_dir=self.pipeline_dir,
        )

    def output(self) -> luigi.LocalTarget:
        return luigi.LocalTarget(
            str(_path(self.pipeline_dir) / "analytics" / "presto_result.json")
        )

    def run(self) -> None:
        rows = run_presto_explore(_path(self.warehouse_dir))
        payload = {
            "rows": rows,
            "row_count": len(rows),
            "completed_at": _utc_now(),
        }
        out = _path(self.output().path)
        out.parent.mkdir(parents=True, exist_ok=True)
        with self.output().open("w") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2, default=str)
            handle.write("\n")


class ExportCsv(luigi.Task):
    lake_dir = luigi.Parameter()
    warehouse_dir = luigi.Parameter()
    pipeline_dir = luigi.Parameter()
    analytics_dir = luigi.Parameter()

    def requires(self) -> PrestoExplore:
        return PrestoExplore(
            lake_dir=self.lake_dir,
            warehouse_dir=self.warehouse_dir,
            pipeline_dir=self.pipeline_dir,
        )

    def output(self) -> luigi.LocalTarget:
        return luigi.LocalTarget(
            str(_path(self.analytics_dir) / "presto_explore.csv")
        )

    def run(self) -> None:
        explore_path = _path(self.input().path)
        payload = json.loads(explore_path.read_text(encoding="utf-8"))
        rows = list(payload.get("rows") or [])
        out = _path(self.output().path)
        out.parent.mkdir(parents=True, exist_ok=True)

        fieldnames = [
            "intent",
            "event_count",
            "refusal_count",
            "hedge_count",
            "refusal_rate",
            "avg_latency_ms",
        ]
        with out.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            for row in rows:
                writer.writerow({k: row.get(k) for k in fieldnames})

        # Optional metrics sibling for operators / demos.
        lake = _path(self.lake_dir)
        event_count = count_valid_events(lake)
        day_count = len({e["dt"] for e in iter_events(lake)})
        report = {
            "success": True,
            "event_count": event_count,
            "day_count": day_count,
            "csv_path": str(out),
            "generated_at": _utc_now(),
        }
        report_path = out.parent / "metrics-report.json"
        report_path.write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )


def _default_task(**overrides: str) -> ExportCsv:
    settings = get_settings()
    params = {
        "lake_dir": str(settings.lake_dir),
        "warehouse_dir": str(settings.warehouse_dir),
        "pipeline_dir": str(settings.pipeline_dir),
        "analytics_dir": str(settings.analytics_dir),
    }
    params.update(overrides)
    return ExportCsv(**params)


def _force_clean(
    pipeline_dir: Path,
    warehouse_dir: Path,
    analytics_dir: Path,
) -> None:
    """Delete analytics markers, mart parquet, and export CSV; keep event lake."""
    analytics_markers = Path(pipeline_dir) / "analytics"
    if analytics_markers.exists():
        shutil.rmtree(analytics_markers)

    mart = mart_parquet_path(Path(warehouse_dir))
    if mart.exists():
        mart.unlink()

    analytics = Path(analytics_dir)
    for name in ("presto_explore.csv", "metrics-report.json"):
        path = analytics / name
        if path.exists():
            path.unlink()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Luigi batch SQL analytics (Phase B)")
    parser.add_argument(
        "--seed",
        action="store_true",
        help="Write deterministic demo event lake partitions and exit 0",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Delete analytics markers/mart/CSV (keep lake), then rebuild",
    )
    args = parser.parse_args(argv)

    settings = get_settings()
    if args.seed:
        paths = seed_demo_events(Path(settings.lake_dir))
        print(f"Seeded {len(paths)} partition(s) under {settings.lake_dir}/events/")
        return 0

    if args.force:
        _force_clean(
            Path(settings.pipeline_dir),
            Path(settings.warehouse_dir),
            Path(settings.analytics_dir),
        )

    task = _default_task()
    result = luigi.build([task], local_scheduler=True)
    if result:
        print(f"Analytics OK → {task.output().path}")
        return 0
    print("Analytics FAILED", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
