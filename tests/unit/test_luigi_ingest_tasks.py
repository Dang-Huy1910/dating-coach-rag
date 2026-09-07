from __future__ import annotations

from pathlib import Path

from backend.pipelines.ingest import (
    BuildIndex,
    ExtractKnowledge,
    TransformChunks,
    WriteIngestReport,
)


def _params(tmp_path: Path) -> dict[str, str]:
    return {
        "knowledge_dir": str(tmp_path / "knowledge"),
        "uploads_dir": str(tmp_path / "uploads"),
        "pipeline_dir": str(tmp_path / "pipeline"),
        "index_dir": str(tmp_path / "index"),
        "report_path": str(tmp_path / "reports" / "ingest-report.json"),
        "embedder": "hash",
    }


def test_task_dependency_order(tmp_path: Path) -> None:
    p = _params(tmp_path)
    report = WriteIngestReport(**p)
    build = report.requires()
    assert isinstance(build, BuildIndex)
    transform = build.requires()
    assert isinstance(transform, TransformChunks)
    extract = transform.requires()
    assert isinstance(extract, ExtractKnowledge)


def test_output_paths_match_data_model(tmp_path: Path) -> None:
    p = _params(tmp_path)
    pipeline = Path(p["pipeline_dir"])

    extract = ExtractKnowledge(
        knowledge_dir=p["knowledge_dir"],
        uploads_dir=p["uploads_dir"],
        pipeline_dir=p["pipeline_dir"],
    )
    assert Path(extract.output().path) == pipeline / "extract" / "manifest.json"

    transform = TransformChunks(
        knowledge_dir=p["knowledge_dir"],
        uploads_dir=p["uploads_dir"],
        pipeline_dir=p["pipeline_dir"],
    )
    assert Path(transform.output().path) == pipeline / "chunks" / "chunks.jsonl"

    build = BuildIndex(
        knowledge_dir=p["knowledge_dir"],
        uploads_dir=p["uploads_dir"],
        pipeline_dir=p["pipeline_dir"],
        index_dir=p["index_dir"],
        embedder=p["embedder"],
    )
    assert Path(build.output().path) == pipeline / "index" / "complete.json"

    report = WriteIngestReport(**p)
    assert Path(report.output().path) == Path(p["report_path"])
