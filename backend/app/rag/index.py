from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

import faiss
import numpy as np

from backend.app.rag.embed import DIM


@dataclass
class ChunkMeta:
    chunk_id: str
    source_id: str
    title: str
    heading: str | None
    text: str
    path: str


class VectorIndex:
    def __init__(self, index: faiss.Index, meta: list[ChunkMeta]) -> None:
        self.index = index
        self.meta = meta

    @property
    def ready(self) -> bool:
        return self.index.ntotal > 0 and len(self.meta) == self.index.ntotal

    def add(self, vectors: np.ndarray, meta: list[ChunkMeta]) -> None:
        if vectors.ndim != 2 or vectors.shape[1] != DIM:
            raise ValueError(f"expected (*, {DIM}) vectors")
        self.index.add(np.ascontiguousarray(vectors.astype(np.float32)))
        self.meta.extend(meta)

    def search(self, vector: np.ndarray, top_k: int) -> list[tuple[float, ChunkMeta]]:
        if not self.ready:
            return []
        q = np.ascontiguousarray(vector.reshape(1, DIM).astype(np.float32))
        scores, ids = self.index.search(q, min(top_k, self.index.ntotal))
        hits: list[tuple[float, ChunkMeta]] = []
        for score, idx in zip(scores[0], ids[0], strict=False):
            if idx < 0 or idx >= len(self.meta):
                continue
            hits.append((float(score), self.meta[idx]))
        return hits


def empty_index() -> VectorIndex:
    return VectorIndex(faiss.IndexFlatIP(DIM), [])


def save_index(store: VectorIndex, directory: Path) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    faiss.write_index(store.index, str(directory / "index.faiss"))
    payload = [asdict(m) for m in store.meta]
    (directory / "meta.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def load_index(directory: Path) -> VectorIndex | None:
    faiss_path = directory / "index.faiss"
    meta_path = directory / "meta.json"
    if not faiss_path.exists() or not meta_path.exists():
        return None
    index = faiss.read_index(str(faiss_path))
    raw = json.loads(meta_path.read_text(encoding="utf-8"))
    meta = [ChunkMeta(**row) for row in raw]
    store = VectorIndex(index, meta)
    return store if store.ready else None
