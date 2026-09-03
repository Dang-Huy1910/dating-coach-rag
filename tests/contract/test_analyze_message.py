def test_analyze_message_contract(client, stub_hits, monkeypatch):
    monkeypatch.setattr(
        "backend.app.coach.complete",
        lambda _prompt: '{"reply": "Giọng hơi gấp. Hãy hỏi thay vì đòi.", "improved_draft": "Cuối tuần này cà phê 30 phút được không?", "openers": null}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/analyze-message",
        json={"draft": "Đi chơi ngay đi, đừng đọc trốn."},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "analyze_message"
    assert body["improved_draft"]
