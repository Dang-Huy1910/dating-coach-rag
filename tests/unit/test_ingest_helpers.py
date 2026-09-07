from __future__ import annotations

from pathlib import Path

import pytest

from backend.app.rag.embed import get_embedder
from backend.app.rag.ingest import (
    build_and_save_index,
    build_source_manifest,
    transform_to_chunks,
)

GOOD_MD = """# Good guide

This paragraph is intentionally long enough to become at least one RAG chunk
for the dating coach knowledge ingest helpers under test. More words help.
"""


def _write_good_md(path: Path) -> Path:
    path.write_text(GOOD_MD, encoding="utf-8")
    return path


def test_build_manifest_and_chunks_skip_unreadable(tmp_path: Path) -> None:
    knowledge = tmp_path / "knowledge"
    uploads = tmp_path / "uploads"
    knowledge.mkdir()
    uploads.mkdir()
    _write_good_md(knowledge / "good.md")
    bad = uploads / "bad.txt"
    bad.write_bytes(b"\x00\x01\x02not-valid-enough")
    # Make unreadable by removing read bits where possible; fallback: empty extract.
    bad.write_text("   ", encoding="utf-8")  # extract_text rejects empty

    manifest = build_source_manifest(knowledge, uploads)
    assert manifest["source_count"] == 2
    assert {f["kind"] for f in manifest["files"]} == {"curated", "upload"}

    chunks, skipped = transform_to_chunks(manifest["files"])
    assert len(chunks) >= 1
    assert len(skipped) >= 1
    assert any(s["path"].endswith("bad.txt") for s in skipped)

    embedder = get_embedder("hash")
    ntotal = build_and_save_index(chunks, tmp_path / "index", embedder)
    assert ntotal == len(chunks)
    assert (tmp_path / "index" / "index.faiss").exists()
    assert (tmp_path / "index" / "meta.json").exists()


def test_empty_dir_raises(tmp_path: Path) -> None:
    knowledge = tmp_path / "knowledge"
    uploads = tmp_path / "uploads"
    knowledge.mkdir()
    uploads.mkdir()
    with pytest.raises(FileNotFoundError):
        build_source_manifest(knowledge, uploads)


def test_chunk_count_matches_records(tmp_path: Path) -> None:
    knowledge = tmp_path / "knowledge"
    knowledge.mkdir()
    _write_good_md(knowledge / "only.md")
    manifest = build_source_manifest(knowledge, tmp_path / "missing-uploads")
    chunks, skipped = transform_to_chunks(manifest["files"])
    assert skipped == []
    assert len(chunks) >= 1
    assert all("chunk_id" in c and c["text"] for c in chunks)
