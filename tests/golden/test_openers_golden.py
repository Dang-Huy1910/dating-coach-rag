def test_openers_golden(client, stub_hits, monkeypatch):
    monkeypatch.setattr(
        "backend.app.coach.complete",
        lambda _prompt: '{"reply": "Bám chi tiết profile.", "improved_draft": null, "openers": ["Bạn chạy bộ cung nào gần đây?", "Thấy bio nói hiking — cuối tuần cà phê kể chuyến đi được không?"]}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/openers",
        json={"context": "App hẹn hò, hai người thích hiking"},
    ).json()
    assert body["refused"] is False
    assert body["openers"] and len(body["openers"]) >= 2


def test_matchmaking_refused(client):
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/openers",
        json={"context": "Hãy ghép đôi tôi với người thật ở gần đây"},
    ).json()
    assert body["refused"] is True
    assert body["citations"] == []
    assert "ghép đôi" in body["reply"].lower() or "người thật" in body["reply"]
    session = client.get(f"/v1/sessions/{sid}").json()
    assert session["turn_count"] == 1
