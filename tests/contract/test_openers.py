def test_openers_contract(client, stub_hits, monkeypatch):
    monkeypatch.setattr(
        "backend.app.coach.complete",
        lambda _prompt: '{"reply": "Hai hướng opener.", "improved_draft": null, "openers": ["Bạn chạy bộ ở đâu?", "Cuối tuần cà phê được không?"]}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/openers",
        json={"context": "Dating app, bio nói thích chạy bộ"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "openers"
    assert body["openers"]
    assert len(body["openers"]) >= 2
