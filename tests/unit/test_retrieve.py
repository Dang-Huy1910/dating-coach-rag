import numpy as np

from backend.app.rag.embed import DIM, HashEmbedder, get_embedder
from backend.app.rag.index import ChunkMeta, empty_index
from backend.app.rag.retrieve import retrieve, set_loaded_index


def test_score_gate_drops_weak_hits():
    store = empty_index()
    strong = np.zeros(DIM, dtype=np.float32)
    strong[0] = 1.0
    weak = np.zeros(DIM, dtype=np.float32)
    weak[1] = 1.0
    store.add(
        np.vstack([strong, weak]),
        [
            ChunkMeta("a#1", "a", "A", None, "bio writing", "data/knowledge/a.md"),
            ChunkMeta("b#1", "b", "B", None, "unrelated", "data/knowledge/b.md"),
        ],
    )
    set_loaded_index(store)

    class _Stub:
        def embed(self, texts):
            q = np.zeros(DIM, dtype=np.float32)
            q[0] = 1.0
            return np.vstack([q for _ in texts])

    import backend.app.rag.retrieve as retrieve_mod

    original = retrieve_mod.get_embedder
    retrieve_mod.get_embedder = lambda _kind="minilm": _Stub()
    try:
        hits = retrieve("bio", top_k=2, min_score=0.35)
        assert len(hits) == 1
        assert hits[0].chunk.chunk_id == "a#1"
        empty = retrieve("bio", top_k=2, min_score=1.1)
        assert empty == []
    finally:
        retrieve_mod.get_embedder = original
        set_loaded_index(None)


def test_minilm_falls_back_to_hash_when_extra_missing():
    get_embedder.cache_clear()
    embedder = get_embedder("minilm")
    assert isinstance(embedder, HashEmbedder)
    vectors = embedder.embed(["bio hẹn hò"])
    assert vectors.shape[1] == DIM
