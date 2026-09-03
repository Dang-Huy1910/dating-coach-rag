def test_health_and_session(client):
    health = client.get("/health")
    assert health.status_code == 200
    payload = health.json()
    assert payload["status"] == "ok"
    assert payload["index_ready"] is True

    created = client.post("/v1/sessions")
    assert created.status_code == 201
    sid = created.json()["id"]
    fetched = client.get(f"/v1/sessions/{sid}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == sid

    deleted = client.delete(f"/v1/sessions/{sid}")
    assert deleted.status_code == 204
    missing = client.get(f"/v1/sessions/{sid}")
    assert missing.status_code == 404


def test_disclaimer_endpoint(client):
    response = client.get("/v1/disclaimer")
    assert response.status_code == 200
    assert "liệu pháp" in response.json()["text"]
