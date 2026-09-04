from __future__ import annotations

from pathlib import Path

from backend.app.config import REPO_ROOT, get_settings
from backend.app.rag.chunk import chunk_markdown, chunk_plain
from backend.app.rag.embed import get_embedder
from backend.app.rag.extract import ALLOWED_EXTENSIONS, extract_text
from backend.app.rag.index import ChunkMeta, empty_index, save_index
from backend.app.rag.retrieve import set_loaded_index


def _rel_path(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT)).replace("\\", "/")
    except ValueError:
        return path.name


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


def ingest(
    knowledge_dir: Path | None = None,
    index_dir: Path | None = None,
    uploads_dir: Path | None = None,
) -> int:
    settings = get_settings()
    source_dir = knowledge_dir or settings.knowledge_dir
    dest_dir = index_dir or settings.index_dir
    upload_dir = uploads_dir if uploads_dir is not None else settings.uploads_dir
    files = iter_knowledge_files(source_dir, upload_dir)
    if not files:
        raise FileNotFoundError(
            f"no knowledge files in {source_dir} or uploads in {upload_dir}"
        )
    embedder = get_embedder(settings.embedder_name)
    store = empty_index()
    for path in files:
        try:
            chunks = _chunk_file(path)
        except ValueError:
            # Skip unreadable upload rather than failing whole index.
            continue
        if not chunks:
            continue
        vectors = embedder.embed([c.text for c in chunks])
        meta = [
            ChunkMeta(
                chunk_id=c.chunk_id,
                source_id=c.source_id,
                title=c.title,
                heading=c.heading,
                text=c.text,
                path=c.path,
            )
            for c in chunks
        ]
        store.add(vectors, meta)
    save_index(store, dest_dir)
    set_loaded_index(store)
    return store.index.ntotal


def main() -> None:
    n = ingest()
    print(f"Indexed {n} chunks")


if __name__ == "__main__":
    main()
