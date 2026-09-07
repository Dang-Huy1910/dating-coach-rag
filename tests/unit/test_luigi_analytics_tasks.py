"""Unit tests for Luigi analytics task graph (Phase B)."""

from __future__ import annotations

from pathlib import Path

from backend.pipelines.analytics import ExportCsv, HiveDailyMetrics, PrestoExplore


def _params(tmp_path: Path) -> dict[str, str]:
    return {
        "lake_dir": str(tmp_path / "lake"),
        "warehouse_dir": str(tmp_path / "warehouse"),
        "pipeline_dir": str(tmp_path / "pipeline"),
        "analytics_dir": str(tmp_path / "reports" / "analytics"),
    }


def test_task_dependency_order(tmp_path: Path) -> None:
    p = _params(tmp_path)
    export = ExportCsv(**p)
    presto = export.requires()
    assert isinstance(presto, PrestoExplore)
    hive = presto.requires()
    assert isinstance(hive, HiveDailyMetrics)


def test_output_paths_match_data_model(tmp_path: Path) -> None:
    p = _params(tmp_path)
    pipeline = Path(p["pipeline_dir"])
    analytics = Path(p["analytics_dir"])

    hive = HiveDailyMetrics(
        lake_dir=p["lake_dir"],
        warehouse_dir=p["warehouse_dir"],
        pipeline_dir=p["pipeline_dir"],
    )
    assert Path(hive.output().path) == pipeline / "analytics" / "hive_complete.json"

    presto = PrestoExplore(
        lake_dir=p["lake_dir"],
        warehouse_dir=p["warehouse_dir"],
        pipeline_dir=p["pipeline_dir"],
    )
    assert Path(presto.output().path) == pipeline / "analytics" / "presto_result.json"

    export = ExportCsv(**p)
    assert Path(export.output().path) == analytics / "presto_explore.csv"
