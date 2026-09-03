from backend.app.config import DISCLAIMER_TEXT


def test_create_session_shape(client):
    response = client.post("/v1/sessions")
    assert response.status_code == 201
    body = response.json()
    assert body["id"]
    assert body["disclaimer"] == DISCLAIMER_TEXT
    assert body["turn_count"] == 0
    assert "created_at" in body


def test_ask_json_shape(client, stub_hits, monkeypatch):
    monkeypatch.setattr(
        "backend.app.coach.complete",
        lambda _prompt: '{"reply": "Hãy viết bio cụ thể.", "improved_draft": null, "openers": null}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/ask",
        json={"question": "Bio hẹn hò ngắn nên viết thế nào?"},
    )
    assert response.status_code == 200
    body = response.json()
    for key in ("reply", "citations", "refused", "hedged", "disclaimer", "intent"):
        assert key in body
    assert body["intent"] == "ask"
    assert body["disclaimer"] == DISCLAIMER_TEXT


def test_ask_unknown_session(client):
    response = client.post(
        "/v1/sessions/00000000-0000-0000-0000-000000000000/ask",
        json={"question": "hello"},
    )
    assert response.status_code == 404


def test_ask_whitespace_rejected(client):
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(f"/v1/sessions/{sid}/ask", json={"question": "   "})
    assert response.status_code == 400
