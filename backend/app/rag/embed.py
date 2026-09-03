from __future__ import annotations

import hashlib
import re
from functools import lru_cache

import numpy as np

DIM = 384
_TOKEN = re.compile(r"\w+", re.UNICODE)


def _token_vec(token: str) -> np.ndarray:
    digest = hashlib.sha256(token.encode("utf-8")).digest()
    seed = int.from_bytes(digest[:8], "little", signed=False)
    rng = np.random.default_rng(seed)
    return rng.standard_normal(DIM).astype(np.float32)


def _hash_vector(text: str) -> np.ndarray:
    tokens = _TOKEN.findall(text.lower()) or ["_empty"]
    vec = np.zeros(DIM, dtype=np.float32)
    for token in tokens:
        vec += _token_vec(token)
    norm = np.linalg.norm(vec) + 1e-12
    return vec / norm


class HashEmbedder:
    name = "hash"

    def embed(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, DIM), dtype=np.float32)
        return np.vstack([_hash_vector(t) for t in texts])


class MiniLMEmbedder:
    name = "minilm"

    def __init__(self) -> None:
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as exc:
            raise ImportError(
                "MiniLM embedder requires extra 'embed': pip install -e '.[embed]'"
            ) from exc

        self._model = SentenceTransformer("all-MiniLM-L6-v2")

    def embed(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, DIM), dtype=np.float32)
        vectors = self._model.encode(texts, normalize_embeddings=True)
        return np.asarray(vectors, dtype=np.float32)


@lru_cache
def get_embedder(kind: str = "minilm"):
    if kind == "hash":
        return HashEmbedder()
    try:
        return MiniLMEmbedder()
    except ImportError:
        return HashEmbedder()
