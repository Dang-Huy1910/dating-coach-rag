from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from backend.app.config import REPO_ROOT, get_settings
from backend.app.rag.chunk import chunk_markdown, chunk_plain
from backend.app.rag.embed import get_embedder
from backend.app.rag.extract import ALLOWED_EXTENSIONS, extract_text
from backend.app.rag.index import ChunkMeta, empty_index, save_index
from backend.app.rag.retrieve import set_loaded_index


def _rel_path(path: Path) -> str:
    resolved = path.resolve()
    try:
        return str(resolved.relative_to(REPO_ROOT)).replace("\\", "/")
    except ValueError:
        return str(resolved)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _chunk_file(path: Path) -> list:
    suffix = path.suffix.lower()
    source_id = path.stem
    rel = _rel_path(path)
    if suffix in {".md", ".markdown"}:
        return chunk_markdown(path, source_id)
    data = path.read_bytes()
    text = extract_text(path.name, data)
    title = path.stem.replace("-", " ").replace("_", " ").strip() or source_id
    return chunk_plain(text, source_id=source_id, title=title, rel_path=rel)


def _file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(65536), b""):
            digest.update(block)
    return digest.hexdigest()


def iter_knowledge_files(
    knowledge_dir: Path,
    uploads_dir: Path | None = None,
) -> list[Path]:
    files: list[Path] = []
    if knowledge_dir.is_dir():
        files.extend(sorted(knowledge_dir.glob("*.md")))
    if uploads_dir and uploads_dir.is_dir():
        for path in sorted(uploads_dir.iterdir()):
            if not path.is_file():
                continue
            if path.name.startswith("."):
                continue
            if path.suffix.lower() in ALLOWED_EXTENSIONS:
                files.append(path)
    return files


def build_source_manifest(
    knowledge_dir: Path,
    uploads_dir: Path | None = None,
) -> dict[str, Any]:
    """Discover curated + upload sources. Raises if zero eligible files."""
    knowledge_dir = Path(knowledge_dir)
    upload_dir = Path(uploads_dir) if uploads_dir is not None else None
    paths = iter_knowledge_files(knowledge_dir, upload_dir)
    if not paths:
        raise FileNotFoundError(
            f"no knowledge files in {knowledge_dir} or uploads in {upload_dir}"
        )

    knowledge_resolved = knowledge_dir.resolve() if knowledge_dir.is_dir() else None
    entries: list[dict[str, Any]] = []
    for path in paths:
        resolved = path.resolve()
        kind = "curated"
        if knowledge_resolved is not None:
            try:
                resolved.relative_to(knowledge_resolved)
            except ValueError:
                kind = "upload"
        else:
            kind = "upload"
        entries.append(
            {
                "path": _rel_path(path),
                "source_id": path.stem,
                "kind": kind,
                "suffix": path.suffix.lower(),
                "sha256": _file_sha256(path),
                "size_bytes": path.stat().st_size,
            }
        )

    return {
        "generated_at": utc_now(),
        "knowledge_dir": str(knowledge_dir),
        "uploads_dir": str(upload_dir) if upload_dir is not None else "",
        "files": entries,
        "source_count": len(entries),
    }


def transform_to_chunks(
    files: list[Path] | list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    """Chunk source files. Returns (chunk_records, skipped[{path, reason}])."""
    chunk_records: list[dict[str, Any]] = []
    skipped: list[dict[str, str]] = []

    for item in files:
        if isinstance(item, dict):
            raw = str(item.get("path") or "")
            path = Path(raw)
            display = raw
        else:
            path = Path(item)
            display = _rel_path(path)

        if not path.is_file():
            candidate = REPO_ROOT / display
            if candidate.is_file():
                path = candidate
            else:
                skipped.append({"path": display, "reason": "missing"})
                continue

        try:
            chunks = _chunk_file(path)
        except (ValueError, OSError) as exc:
            skipped.append({"path": display, "reason": str(exc) or "unreadable"})
            continue
        if not chunks:
            skipped.append({"path": display, "reason": "zero_chunks"})
            continue
        for chunk in chunks:
            chunk_records.append(
                {
                    "chunk_id": chunk.chunk_id,
                    "source_id": chunk.source_id,
                    "title": chunk.title,
                    "heading": chunk.heading,
                    "text": chunk.text,
                    "path": chunk.path,
                }
            )
    return chunk_records, skipped


def build_and_save_index(
    chunks: list[dict[str, Any]] | list[ChunkMeta],
    index_dir: Path,
    embedder: Any,
) -> int:
    """Embed chunk records, write FAISS + meta under index_dir, return ntotal."""
    if not chunks:
        raise ValueError("cannot build index from zero chunks")

    store = empty_index()
    texts: list[str] = []
    meta: list[ChunkMeta] = []
    for row in chunks:
        if isinstance(row, ChunkMeta):
            meta.append(row)
            texts.append(row.text)
        else:
            meta.append(
                ChunkMeta(
                    chunk_id=row["chunk_id"],
                    source_id=row["source_id"],
                    title=row["title"],
                    heading=row.get("heading"),
                    text=row["text"],
                    path=row["path"],
                )
            )
            texts.append(row["text"])

    vectors = embedder.embed(texts)
    store.add(vectors, meta)
    save_index(store, Path(index_dir))
    set_loaded_index(store)
    return store.index.ntotal


def summarize_ingest(
    *,
    source_count: int,
    chunk_count: int,
    skipped: list[dict[str, str]],
    ntotal: int,
    embedder_name: str,
    index_dir: Path,
    manifest_path: Path,
    chunks_path: Path,
) -> dict[str, Any]:
    return {
        "success": ntotal > 0 and chunk_count > 0,
        "generated_at": utc_now(),
        "embedder": embedder_name,
        "source_count": source_count,
        "chunk_count": chunk_count,
        "skipped_count": len(skipped),
        "skipped": skipped,
        "index_dir": str(index_dir),
        "manifest_path": str(manifest_path),
        "chunks_path": str(chunks_path),
        "ntotal": ntotal,
    }


def ingest(
    knowledge_dir: Path | None = None,
    index_dir: Path | None = None,
    uploads_dir: Path | None = None,
) -> int:
    settings = get_settings()
    source_dir = knowledge_dir or settings.knowledge_dir
    dest_dir = index_dir or settings.index_dir
    upload_dir = uploads_dir if uploads_dir is not None else settings.uploads_dir
    manifest = build_source_manifest(source_dir, upload_dir)
    chunk_records, _skipped = transform_to_chunks(manifest["files"])
    embedder = get_embedder(settings.embedder_name)
    if not chunk_records:
        # Preserve prior one-shot behavior: eligible files existed but none chunked.
        store = empty_index()
        save_index(store, dest_dir)
        set_loaded_index(store)
        return 0
    return build_and_save_index(chunk_records, dest_dir, embedder)


def main() -> None:
    n = ingest()
    print(f"Indexed {n} chunks")


if __name__ == "__main__":
    main()
