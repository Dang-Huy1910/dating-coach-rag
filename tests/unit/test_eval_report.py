from backend.app.eval.report import render_markdown


def test_render_markdown_includes_pass_rate():
    quality = {
        "generated_at": "2026-09-04T00:00:00+00:00",
        "mode": "deterministic-mocked-llm",
        "status": "pass",
        "pass_count": 2,
        "fail_count": 0,
        "incomplete_count": 0,
        "total": 2,
        "pass_rate": 100.0,
        "results": [
            {
                "id": "cite-ask-bio",
                "category": "cite",
                "title": "Cited",
                "status": "pass",
                "reason": "ok",
            },
            {
                "id": "safety-nsfw",
                "category": "safety",
                "title": "NSFW",
                "status": "pass",
                "reason": "refused",
            },
        ],
    }
    retrieval = {
        "hash": {
            "top_k": 4,
            "hit_at_k": 0.75,
            "mrr": 0.5,
            "query_count": 4,
            "queries": [
                {
                    "id": "bio-concrete",
                    "query": "bio?",
                    "hit_at_k": True,
                    "reciprocal_rank": 1.0,
                    "top_sources": ["01-profile-bio"],
                }
            ],
        },
        "minilm": None,
        "minilm_note": "skipped",
    }
    md = render_markdown(quality, retrieval)
    assert "100.0%" in md
    assert "cite-ask-bio" in md
    assert "Hit@4" in md
    assert "0.75" in md or "75.0%" in md
