from __future__ import annotations

from dataclasses import dataclass

from backend.app.config import get_settings
from backend.app.rag.embed import get_embedder
from backend.app.rag.index import ChunkMeta, VectorIndex, load_index

_LOADED: VectorIndex | None = None


@dataclass
class Hit:
    score: float
    chunk: ChunkMeta


def index_ready() -> bool:
    store = get_loaded_index()
    return store is not None and store.ready


def get_loaded_index() -> VectorIndex | None:
    global _LOADED
    if _LOADED is not None:
        return _LOADED
    settings = get_settings()
    _LOADED = load_index(settings.index_dir)
    return _LOADED


def set_loaded_index(store: VectorIndex | None) -> None:
    global _LOADED
    _LOADED = store


def retrieve(query: str, top_k: int | None = None, min_score: float | None = None) -> list[Hit]:
    settings = get_settings()
    store = get_loaded_index()
    if store is None or not store.ready:
        return []
    embedder = get_embedder(settings.embedder_name)
    vector = embedder.embed([query])[0]
    k = top_k if top_k is not None else settings.retrieve_top_k
    if min_score is not None:
        threshold = min_score
    elif settings.embedder_name == "hash":
        # Token-hash vectors have lower cosine mass than MiniLM; keep demo usable.
        threshold = min(settings.retrieve_min_score, 0.08)
    else:
        threshold = settings.retrieve_min_score
    hits: list[Hit] = []
    for score, chunk in store.search(vector, k):
        if score < threshold:
            continue
        hits.append(Hit(score=score, chunk=chunk))
    return hits
