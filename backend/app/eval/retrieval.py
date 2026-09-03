from __future__ import annotations

import json
import os
import tempfile
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[3]
DEFAULT_QUERIES = REPO / "data" / "eval" / "retrieval_queries.json"


@dataclass
class QueryMetric:
    id: str
    query: str
    expected_source_ids: list[str]
    hit_at_k: bool
    reciprocal_rank: float
    top_sources: list[str]


def _ingest(index_dir: Path, embedder: str) -> None:
    os.environ["DATING_COACH_EMBEDDER"] = embedder
    os.environ["INDEX_DIR"] = str(index_dir)
    os.environ["KNOWLEDGE_DIR"] = str(REPO / "data" / "knowledge")
    from backend.app.config import get_settings
    from backend.app.rag.embed import get_embedder
    from backend.app.rag.ingest import ingest
    from backend.app.rag.retrieve import set_loaded_index

    get_settings.cache_clear()
    get_embedder.cache_clear()
    set_loaded_index(None)
    ingest()


def _cleanup() -> None:
    from backend.app.config import get_settings
    from backend.app.rag.embed import get_embedder
    from backend.app.rag.retrieve import set_loaded_index

    set_loaded_index(None)
    get_settings.cache_clear()
    get_embedder.cache_clear()


def load_queries(path: Path | None = None) -> list[dict[str, Any]]:
    target = path or DEFAULT_QUERIES
    return json.loads(target.read_text(encoding="utf-8"))


def evaluate_retrieval(
    *,
    embedder: str = "hash",
    top_k: int = 4,
    queries_path: Path | None = None,
) -> dict[str, Any]:
    queries = load_queries(queries_path)
    index_dir = Path(tempfile.mkdtemp(prefix=f"dating-coach-ret-{embedder}-"))
    try:
        _ingest(index_dir, embedder)
        from backend.app.rag.retrieve import retrieve

        metrics: list[QueryMetric] = []
        for row in queries:
            expected = list(row["expected_source_ids"])
            hits = retrieve(row["query"], top_k=top_k, min_score=0.0)
            sources = [h.chunk.source_id for h in hits]
            rr = 0.0
            hit = False
            for rank, source_id in enumerate(sources, start=1):
                if source_id in expected:
                    hit = True
                    rr = 1.0 / rank
                    break
            metrics.append(
                QueryMetric(
                    id=row["id"],
                    query=row["query"],
                    expected_source_ids=expected,
                    hit_at_k=hit,
                    reciprocal_rank=rr,
                    top_sources=sources,
                )
            )
        n = len(metrics) or 1
        hit_rate = sum(1 for m in metrics if m.hit_at_k) / n
        mrr = sum(m.reciprocal_rank for m in metrics) / n
        return {
            "embedder": embedder,
            "top_k": top_k,
            "query_count": len(metrics),
            "hit_at_k": round(hit_rate, 4),
            "mrr": round(mrr, 4),
            "queries": [asdict(m) for m in metrics],
        }
    finally:
        _cleanup()


def evaluate_retrieval_compare(
    *,
    top_k: int = 4,
    queries_path: Path | None = None,
) -> dict[str, Any]:
    hash_report = evaluate_retrieval(
        embedder="hash", top_k=top_k, queries_path=queries_path
    )
    minilm_report: dict[str, Any] | None = None
    minilm_note = "skipped (sentence-transformers not installed)"
    try:
        import sentence_transformers  # noqa: F401

        minilm_report = evaluate_retrieval(
            embedder="minilm", top_k=top_k, queries_path=queries_path
        )
        minilm_note = "ran"
    except Exception as exc:  # noqa: BLE001
        minilm_note = f"skipped ({exc.__class__.__name__}: {exc})"
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "hash": hash_report,
        "minilm": minilm_report,
        "minilm_note": minilm_note,
    }
