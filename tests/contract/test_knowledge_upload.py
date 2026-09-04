from pathlib import Path


def test_list_knowledge_includes_curated_and_formats(client):
    body = client.get("/v1/knowledge").json()
    assert body["formats"]
    exts = {row["ext"] for row in body["formats"]}
    assert ".md" in exts and ".pdf" in exts and ".docx" in exts
    curated = [s for s in body["sources"] if s["kind"] == "curated"]
    assert any(s["source_id"].startswith("01-") for s in curated)


def test_upload_txt_then_delete(client, tmp_path, monkeypatch):
    uploads = tmp_path / "uploads"
    uploads.mkdir()
    monkeypatch.setenv("UPLOADS_DIR", str(uploads))
    monkeypatch.setenv("INDEX_DIR", str(tmp_path / "index"))
    monkeypatch.setenv("KNOWLEDGE_DIR", str(Path("data/knowledge").resolve()))
    monkeypatch.setenv("DATING_COACH_EMBEDDER", "hash")

    from backend.app.config import get_settings
    from backend.app.rag.embed import get_embedder
    from backend.app.rag.retrieve import set_loaded_index
    from backend.app.main import create_app
    from fastapi.testclient import TestClient

    get_settings.cache_clear()
    get_embedder.cache_clear()
    set_loaded_index(None)

    app = create_app()
    with TestClient(app) as local:
        content = (
            "Huong dan opener lich su khi bio noi thich ca phe Trung. "
            "Hay hoi ve quan yeu thich va nhip gap mat ban ngay."
        ).encode("utf-8")
        response = local.post(
            "/v1/knowledge/upload",
            files={"file": ("opener-notes.txt", content, "text/plain")},
        )
        assert response.status_code == 200, response.text
        payload = response.json()
        source_id = payload["source"]["source_id"]
        assert source_id.startswith("upload-")
        assert payload["chunk_count"] > 0

        listed = local.get("/v1/knowledge").json()
        assert any(s["source_id"] == source_id for s in listed["sources"])

        deleted = local.delete(f"/v1/knowledge/{source_id}")
        assert deleted.status_code == 204
        listed2 = local.get("/v1/knowledge").json()
        assert all(s["source_id"] != source_id for s in listed2["sources"])

    set_loaded_index(None)
    get_settings.cache_clear()
    get_embedder.cache_clear()


def test_reject_exe(client):
    response = client.post(
        "/v1/knowledge/upload",
        files={"file": ("malware.exe", b"MZ1234", "application/octet-stream")},
    )
    assert response.status_code == 400
