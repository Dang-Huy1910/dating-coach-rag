from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATING_COACH_EMBEDDER", "hash")
os.environ.setdefault("GROQ_API_KEY", "test-key")

REPO = Path(__file__).resolve().parents[1]


@pytest.fixture
def hashed_index(tmp_path, monkeypatch):
    monkeypatch.setenv("DATING_COACH_EMBEDDER", "hash")
    monkeypatch.setenv("INDEX_DIR", str(tmp_path / "index"))
    monkeypatch.setenv("KNOWLEDGE_DIR", str(REPO / "data" / "knowledge"))
    from backend.app.config import get_settings
    from backend.app.rag.embed import get_embedder
    from backend.app.rag.ingest import ingest
    from backend.app.rag.retrieve import set_loaded_index

    get_settings.cache_clear()
    get_embedder.cache_clear()
    ingest()
    yield tmp_path / "index"
    set_loaded_index(None)
    get_settings.cache_clear()
    get_embedder.cache_clear()


@pytest.fixture
def client(hashed_index):
    from backend.app.main import create_app

    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def stub_hits(monkeypatch):
    from backend.app.rag.index import ChunkMeta
    from backend.app.rag.retrieve import Hit

    hit = Hit(
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
    monkeypatch.setattr("backend.app.coach.retrieve_chunks", lambda _q: [hit])
    return hit
