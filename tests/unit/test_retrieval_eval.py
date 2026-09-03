from backend.app.eval.retrieval import evaluate_retrieval, load_queries


def test_load_retrieval_queries_has_at_least_15():
    rows = load_queries()
    assert len(rows) >= 15
    assert all("expected_source_ids" in row for row in rows)


def test_hash_retrieval_hit_rate_reasonable():
    report = evaluate_retrieval(embedder="hash", top_k=4)
    assert report["query_count"] >= 15
    # Hash is weak but should still hit a non-trivial share of dating gold queries.
    assert report["hit_at_k"] >= 0.4
    assert 0.0 <= report["mrr"] <= 1.0
