"""Luigi batch knowledge ingest (Phase A).

Chain: ExtractKnowledge → TransformChunks → BuildIndex → WriteIngestReport.

Use ``luigi.build(..., local_scheduler=True)`` — never ``luigi.run()`` (pytest argv).

CLI::

    dating-coach-batch
    dating-coach-batch --force

``--force`` deletes ``pipeline_dir`` contents and the ingest report, then rebuilds.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

import luigi

from backend.app.config import get_settings
from backend.app.rag.embed import get_embedder
from backend.app.rag.ingest import (
    build_and_save_index,
    build_source_manifest,
    summarize_ingest,
    transform_to_chunks,
    utc_now,
)


def _path(value: str | Path) -> Path:
    return Path(value)


class ExtractKnowledge(luigi.Task):
    knowledge_dir = luigi.Parameter()
    uploads_dir = luigi.Parameter()
    pipeline_dir = luigi.Parameter()

    def output(self) -> luigi.LocalTarget:
        return luigi.LocalTarget(
            str(_path(self.pipeline_dir) / "extract" / "manifest.json")
        )

    def run(self) -> None:
        manifest = build_source_manifest(
            _path(self.knowledge_dir),
            _path(self.uploads_dir),
        )
        if manifest["source_count"] < 1:
            raise RuntimeError("extract produced zero source files")
        out = _path(self.output().path)
        out.parent.mkdir(parents=True, exist_ok=True)
        with self.output().open("w") as handle:
            json.dump(manifest, handle, ensure_ascii=False, indent=2)
            handle.write("\n")


class TransformChunks(luigi.Task):
    knowledge_dir = luigi.Parameter()
    uploads_dir = luigi.Parameter()
    pipeline_dir = luigi.Parameter()

    def requires(self) -> ExtractKnowledge:
        return ExtractKnowledge(
            knowledge_dir=self.knowledge_dir,
            uploads_dir=self.uploads_dir,
            pipeline_dir=self.pipeline_dir,
        )

    def output(self) -> luigi.LocalTarget:
        return luigi.LocalTarget(
            str(_path(self.pipeline_dir) / "chunks" / "chunks.jsonl")
        )

    def run(self) -> None:
        with self.input().open("r") as handle:
            manifest = json.load(handle)
        chunk_records, skipped = transform_to_chunks(manifest["files"])
        if not chunk_records:
            raise RuntimeError("transform produced zero chunks")

        out = _path(self.output().path)
        out.parent.mkdir(parents=True, exist_ok=True)
        with self.output().open("w") as handle:
            for row in chunk_records:
                handle.write(json.dumps(row, ensure_ascii=False) + "\n")

        skipped_path = out.parent / "skipped.json"
        skipped_path.write_text(
            json.dumps(
                {
                    "skipped": skipped,
                    "skipped_count": len(skipped),
                    "chunk_count": len(chunk_records),
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )


class BuildIndex(luigi.Task):
    knowledge_dir = luigi.Parameter()
    uploads_dir = luigi.Parameter()
    pipeline_dir = luigi.Parameter()
    index_dir = luigi.Parameter()
    embedder = luigi.Parameter(default="")

    def requires(self) -> TransformChunks:
        return TransformChunks(
            knowledge_dir=self.knowledge_dir,
            uploads_dir=self.uploads_dir,
            pipeline_dir=self.pipeline_dir,
        )

    def output(self) -> luigi.LocalTarget:
        return luigi.LocalTarget(
            str(_path(self.pipeline_dir) / "index" / "complete.json")
        )

    def complete(self) -> bool:
        if not self.output().exists():
            return False
        index_dir = _path(self.index_dir)
        if not (index_dir / "index.faiss").exists() or not (index_dir / "meta.json").exists():
            return False
        return True

    def run(self) -> None:
        chunks_path = _path(self.input().path)
        chunk_records: list[dict] = []
        with chunks_path.open(encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if line:
                    chunk_records.append(json.loads(line))
        if not chunk_records:
            raise RuntimeError("no chunks to index")

        settings = get_settings()
        embedder_name = (self.embedder or settings.embedder_name).lower()
        embedder = get_embedder(embedder_name)
        ntotal = build_and_save_index(chunk_records, _path(self.index_dir), embedder)

        marker = {
            "index_dir": str(_path(self.index_dir)),
            "ntotal": ntotal,
            "embedder": embedder_name,
            "completed_at": utc_now(),
        }
        out = _path(self.output().path)
        out.parent.mkdir(parents=True, exist_ok=True)
        with self.output().open("w") as handle:
            json.dump(marker, handle, ensure_ascii=False, indent=2)
            handle.write("\n")


class WriteIngestReport(luigi.Task):
    knowledge_dir = luigi.Parameter()
    uploads_dir = luigi.Parameter()
    pipeline_dir = luigi.Parameter()
    index_dir = luigi.Parameter()
    report_path = luigi.Parameter()
    embedder = luigi.Parameter(default="")

    def requires(self) -> BuildIndex:
        return BuildIndex(
            knowledge_dir=self.knowledge_dir,
            uploads_dir=self.uploads_dir,
            pipeline_dir=self.pipeline_dir,
            index_dir=self.index_dir,
            embedder=self.embedder,
        )

    def output(self) -> luigi.LocalTarget:
        return luigi.LocalTarget(str(self.report_path))

    def run(self) -> None:
        pipeline = _path(self.pipeline_dir)
        manifest_path = pipeline / "extract" / "manifest.json"
        chunks_path = pipeline / "chunks" / "chunks.jsonl"
        skipped_path = pipeline / "chunks" / "skipped.json"
        complete_path = pipeline / "index" / "complete.json"

        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        complete = json.loads(complete_path.read_text(encoding="utf-8"))
        if skipped_path.exists():
            skipped_payload = json.loads(skipped_path.read_text(encoding="utf-8"))
            skipped = list(skipped_payload.get("skipped") or [])
            chunk_count = int(skipped_payload.get("chunk_count") or 0)
        else:
            skipped = []
            chunk_count = sum(
                1
                for line in chunks_path.read_text(encoding="utf-8").splitlines()
                if line.strip()
            )

        settings = get_settings()
        embedder_name = complete.get("embedder") or self.embedder or settings.embedder_name
        report = summarize_ingest(
            source_count=int(manifest.get("source_count") or 0),
            chunk_count=chunk_count,
            skipped=skipped,
            ntotal=int(complete.get("ntotal") or 0),
            embedder_name=str(embedder_name),
            index_dir=_path(self.index_dir),
            manifest_path=manifest_path,
            chunks_path=chunks_path,
        )
        if not report["success"]:
            raise RuntimeError("ingest report would claim failure; refusing success target")

        out = _path(self.output().path)
        out.parent.mkdir(parents=True, exist_ok=True)
        with self.output().open("w") as handle:
            json.dump(report, handle, ensure_ascii=False, indent=2)
            handle.write("\n")


def _default_task(**overrides: str) -> WriteIngestReport:
    settings = get_settings()
    params = {
        "knowledge_dir": str(settings.knowledge_dir),
        "uploads_dir": str(settings.uploads_dir),
        "pipeline_dir": str(settings.pipeline_dir),
        "index_dir": str(settings.index_dir),
        "report_path": str(settings.ingest_report_path),
        "embedder": settings.embedder_name,
    }
    params.update(overrides)
    return WriteIngestReport(**params)


def _force_clean(pipeline_dir: Path, report_path: Path) -> None:
    if pipeline_dir.exists():
        for child in pipeline_dir.iterdir():
            if child.name == ".gitkeep":
                continue
            if child.is_dir():
                shutil.rmtree(child)
            else:
                child.unlink()
    if report_path.exists():
        report_path.unlink()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Luigi batch knowledge ingest (Phase A)")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Delete pipeline_dir contents and ingest report, then rebuild",
    )
    args = parser.parse_args(argv)

    settings = get_settings()
    if args.force:
        _force_clean(Path(settings.pipeline_dir), Path(settings.ingest_report_path))

    task = _default_task()
    result = luigi.build([task], local_scheduler=True)
    if result:
        print(f"Batch ingest OK → {task.output().path}")
        return 0
    print("Batch ingest FAILED", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
