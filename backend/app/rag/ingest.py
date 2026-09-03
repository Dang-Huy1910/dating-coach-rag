from __future__ import annotations

from pathlib import Path

from backend.app.config import get_settings
from backend.app.rag.chunk import chunk_markdown
from backend.app.rag.embed import get_embedder
from backend.app.rag.index import ChunkMeta, empty_index, save_index
from backend.app.rag.retrieve import set_loaded_index


def ingest(knowledge_dir: Path | None = None, index_dir: Path | None = None) -> int:
    settings = get_settings()
    source_dir = knowledge_dir or settings.knowledge_dir
    dest_dir = index_dir or settings.index_dir
    files = sorted(source_dir.glob("*.md"))
    if not files:
        raise FileNotFoundError(f"no Markdown guides in {source_dir}")
    embedder = get_embedder(settings.embedder_name)
    store = empty_index()
    for path in files:
        source_id = path.stem
        chunks = chunk_markdown(path, source_id)
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
