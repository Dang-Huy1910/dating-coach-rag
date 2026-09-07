from __future__ import annotations

import json
import os
from pathlib import Path

import luigi
from luigi.execution_summary import LuigiStatusCode

os.environ.setdefault("DATING_COACH_EMBEDDER", "hash")

from backend.pipelines.ingest import (  # noqa: E402
    BuildIndex,
    WriteIngestReport,
    _force_clean,
)

GOOD_MD = """# Batch guide

A substantial paragraph so chunking succeeds for the Luigi batch ingest integration
tests. Dating coach knowledge needs enough body text for a valid chunk.
"""


def _corpus(tmp_path: Path, *, with_bad_upload: bool = False) -> dict[str, str]:
    knowledge = tmp_path / "knowledge"
    uploads = tmp_path / "uploads"
    pipeline = tmp_path / "pipeline"
    index = tmp_path / "index"
    reports = tmp_path / "reports"
    knowledge.mkdir()
    uploads.mkdir()
    pipeline.mkdir()
    reports.mkdir()
    (knowledge / "guide.md").write_text(GOOD_MD, encoding="utf-8")
    if with_bad_upload:
        (uploads / "empty.txt").write_text("   ", encoding="utf-8")
    return {
        "knowledge_dir": str(knowledge),
        "uploads_dir": str(uploads),
        "pipeline_dir": str(pipeline),
        "index_dir": str(index),
        "report_path": str(reports / "ingest-report.json"),
        "embedder": "hash",
    }


def _build(params: dict[str, str]):
    task = WriteIngestReport(**params)
    result = luigi.build([task], local_scheduler=True)
    return task, result


def test_full_pipeline_success(tmp_path: Path) -> None:
    params = _corpus(tmp_path)
    task, ok = _build(params)
    assert ok is True
    report = json.loads(Path(params["report_path"]).read_text(encoding="utf-8"))
    assert report["success"] is True
    assert report["chunk_count"] >= 1
    assert report["ntotal"] == report["chunk_count"]
    assert report["ntotal"] >= 1
    assert (Path(params["index_dir"]) / "index.faiss").exists()
    assert (Path(params["index_dir"]) / "meta.json").exists()
    assert (Path(params["pipeline_dir"]) / "extract" / "manifest.json").exists()
    assert (Path(params["pipeline_dir"]) / "chunks" / "chunks.jsonl").exists()
    assert (Path(params["pipeline_dir"]) / "index" / "complete.json").exists()
    assert Path(task.output().path).exists()


def test_skip_on_complete_and_partial_report_rebuild(tmp_path: Path) -> None:
    params = _corpus(tmp_path)
    _, ok1 = _build(params)
    assert ok1 is True
    manifest = Path(params["pipeline_dir"]) / "extract" / "manifest.json"
    mtime1 = manifest.stat().st_mtime_ns

    _, ok2 = _build(params)
    assert ok2 is True
    mtime2 = manifest.stat().st_mtime_ns
    assert mtime2 == mtime1

    report_path = Path(params["report_path"])
    report_path.unlink()
    assert not report_path.exists()
    _, ok3 = _build(params)
    assert ok3 is True
    assert report_path.exists()
    mtime3 = manifest.stat().st_mtime_ns
    assert mtime3 == mtime1


def test_force_clean_reruns(tmp_path: Path) -> None:
    params = _corpus(tmp_path)
    _, ok1 = _build(params)
    assert ok1 is True
    manifest = Path(params["pipeline_dir"]) / "extract" / "manifest.json"
    mtime1 = manifest.stat().st_mtime_ns

    _force_clean(Path(params["pipeline_dir"]), Path(params["report_path"]))
    assert not manifest.exists()
    assert not Path(params["report_path"]).exists()

    _, ok2 = _build(params)
    assert ok2 is True
    assert manifest.exists()
    assert manifest.stat().st_mtime_ns >= mtime1
    assert Path(params["report_path"]).exists()


def test_skipped_unreadable_upload_counted(tmp_path: Path) -> None:
    params = _corpus(tmp_path, with_bad_upload=True)
    _, ok = _build(params)
    assert ok is True
    report = json.loads(Path(params["report_path"]).read_text(encoding="utf-8"))
    assert report["success"] is True
    assert report["skipped_count"] >= 1
    assert report["chunk_count"] >= 1


def test_empty_corpus_fails_without_success_report(tmp_path: Path) -> None:
    knowledge = tmp_path / "knowledge"
    uploads = tmp_path / "uploads"
    pipeline = tmp_path / "pipeline"
    reports = tmp_path / "reports"
    knowledge.mkdir()
    uploads.mkdir()
    pipeline.mkdir()
    reports.mkdir()
    params = {
        "knowledge_dir": str(knowledge),
        "uploads_dir": str(uploads),
        "pipeline_dir": str(pipeline),
        "index_dir": str(tmp_path / "index"),
        "report_path": str(reports / "ingest-report.json"),
        "embedder": "hash",
    }
    task = WriteIngestReport(**params)
    result = luigi.build([task], local_scheduler=True, detailed_summary=True)
    assert result.status != LuigiStatusCode.SUCCESS
    assert not Path(params["report_path"]).exists()
    manifest = Path(params["pipeline_dir"]) / "extract" / "manifest.json"
    # Failed extract must not leave a successful empty target.
    assert not manifest.exists()


def test_rebuild_when_faiss_missing_but_marker_exists(tmp_path: Path) -> None:
    params = _corpus(tmp_path)
    _, ok = _build(params)
    assert ok is True
    faiss_path = Path(params["index_dir"]) / "index.faiss"
    faiss_path.unlink()
    build = BuildIndex(
        knowledge_dir=params["knowledge_dir"],
        uploads_dir=params["uploads_dir"],
        pipeline_dir=params["pipeline_dir"],
        index_dir=params["index_dir"],
        embedder=params["embedder"],
    )
    assert build.complete() is False
    ok2 = luigi.build([build], local_scheduler=True)
    assert ok2 is True
    assert faiss_path.exists()
