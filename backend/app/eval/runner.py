from __future__ import annotations

import os
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

from backend.app.eval.cases import QUALITY_CASES, QualityCase

REPO = Path(__file__).resolve().parents[3]


@dataclass
class CaseResult:
    id: str
    category: str
    title: str
    status: str  # pass | fail | incomplete
    reason: str


def _prepare_env(tmp_index: Path) -> None:
    os.environ.setdefault("DATING_COACH_EMBEDDER", "hash")
    os.environ.setdefault("GROQ_API_KEY", "eval-test-key")
    os.environ["INDEX_DIR"] = str(tmp_index)
    os.environ["KNOWLEDGE_DIR"] = str(REPO / "data" / "knowledge")


def _prepare_index(tmp_index: Path) -> None:
    _prepare_env(tmp_index)
    from backend.app.config import get_settings
    from backend.app.rag.embed import get_embedder
    from backend.app.rag.ingest import ingest
    from backend.app.rag.retrieve import set_loaded_index

    get_settings.cache_clear()
    get_embedder.cache_clear()
    set_loaded_index(None)
    ingest()


def _stub_hit():
    from backend.app.rag.index import ChunkMeta
    from backend.app.rag.retrieve import Hit

    return Hit(
        score=0.82,
        chunk=ChunkMeta(
            chunk_id="01-profile-bio#1",
            source_id="01-profile-bio",
            title="Viết bio / profile hẹn hò",
            heading="Mục tiêu bio",
            text="Bio ngắn nên cho người đọc biết bạn là ai một cách cụ thể.",
            path="data/knowledge/01-profile-bio.md",
        ),
    )


def _apply_case_stubs(case: QualityCase, monkeypatches: list[tuple[str, Any]]) -> None:
    import backend.app.coach as coach_mod

    if case.stub_llm is not None:
        reply = case.stub_llm

        def _complete(_prompt: str, images=None):  # noqa: ANN001
            return reply

        monkeypatches.append(("complete", coach_mod.complete))
        coach_mod.complete = _complete  # type: ignore[method-assign]
    if case.empty_retrieve:
        monkeypatches.append(("retrieve_chunks", coach_mod.retrieve_chunks))
        coach_mod.retrieve_chunks = lambda _q: []  # type: ignore[method-assign]
    elif case.stub_llm is not None:
        # Coaching generate paths: keep citations deterministic even if hash retrieval misses.
        monkeypatches.append(("retrieve_chunks", coach_mod.retrieve_chunks))
        hit = _stub_hit()
        coach_mod.retrieve_chunks = lambda _q: [hit]  # type: ignore[method-assign]


def _restore_stubs(monkeypatches: list[tuple[str, Any]]) -> None:
    import backend.app.coach as coach_mod

    for name, original in monkeypatches:
        setattr(coach_mod, name, original)


def run_quality_suite(tmp_index: Path | None = None) -> dict[str, Any]:
    import tempfile

    index_dir = tmp_index or Path(tempfile.mkdtemp(prefix="dating-coach-eval-"))
    _prepare_index(index_dir)
    results: list[CaseResult] = []

    from backend.app.config import get_settings
    from backend.app.main import create_app
    from backend.app.rag.embed import get_embedder
    from backend.app.rag.retrieve import set_loaded_index

    app = create_app()
    try:
        with TestClient(app) as client:
            health = client.get("/health").json()
            if not health.get("index_ready"):
                return {
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "mode": "deterministic-mocked-llm",
                    "status": "incomplete",
                    "pass_count": 0,
                    "fail_count": 0,
                    "incomplete_count": 1,
                    "total": 1,
                    "pass_rate": 0.0,
                    "results": [
                        asdict(
                            CaseResult(
                                id="index",
                                category="infra",
                                title="Knowledge index ready",
                                status="incomplete",
                                reason="index_ready is false — run ingest first",
                            )
                        )
                    ],
                }

            for case in QUALITY_CASES:
                stubs: list[tuple[str, Any]] = []
                try:
                    _apply_case_stubs(case, stubs)
                    sid = client.post("/v1/sessions").json()["id"]
                    path = case.path_template.format(sid=sid)
                    response = client.post(path, json=case.json_body)
                    if response.status_code >= 500:
                        results.append(
                            CaseResult(
                                id=case.id,
                                category=case.category,
                                title=case.title,
                                status="fail",
                                reason=f"HTTP {response.status_code}",
                            )
                        )
                        continue
                    if response.status_code not in (200, 400):
                        results.append(
                            CaseResult(
                                id=case.id,
                                category=case.category,
                                title=case.title,
                                status="fail",
                                reason=f"Unexpected HTTP {response.status_code}",
                            )
                        )
                        continue
                    body = response.json()
                    if response.status_code == 400:
                        results.append(
                            CaseResult(
                                id=case.id,
                                category=case.category,
                                title=case.title,
                                status="fail",
                                reason=f"Got 400: {body.get('detail') or body}",
                            )
                        )
                        continue
                    passed, reason = case.check(body)
                    results.append(
                        CaseResult(
                            id=case.id,
                            category=case.category,
                            title=case.title,
                            status="pass" if passed else "fail",
                            reason=reason,
                        )
                    )
                except Exception as exc:  # noqa: BLE001 — surface in report
                    results.append(
                        CaseResult(
                            id=case.id,
                            category=case.category,
                            title=case.title,
                            status="incomplete",
                            reason=f"Runner error: {exc}",
                        )
                    )
                finally:
                    _restore_stubs(stubs)
    finally:
        set_loaded_index(None)
        get_settings.cache_clear()
        get_embedder.cache_clear()

    passes = sum(1 for r in results if r.status == "pass")
    fails = sum(1 for r in results if r.status == "fail")
    incomplete = sum(1 for r in results if r.status == "incomplete")
    total = len(results)
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mode": "deterministic-mocked-llm",
        "status": "pass" if fails == 0 and incomplete == 0 else "fail",
        "pass_count": passes,
        "fail_count": fails,
        "incomplete_count": incomplete,
        "total": total,
        "pass_rate": round((passes / total) * 100, 1) if total else 0.0,
        "results": [asdict(r) for r in results],
    }
