def test_message_rewrite_golden(client, stub_hits, monkeypatch):
    monkeypatch.setattr(
        "backend.app.coach.complete",
        lambda _prompt: '{"reply": "Tone đang ép. Nên mời cụ thể và để họ từ chối được.", "improved_draft": "Cuối tuần này cà phê 30 phút gần cầu giấy được không? Không sao nếu bạn bận.", "openers": null, "tone": "Hơi ép", "clarity": "7/10", "risk": "Cao"}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/analyze-message",
        json={"draft": "Đi chơi ngay đi, đừng có đọc rồi im."},
    ).json()
    assert body["refused"] is False
    assert body["improved_draft"]
    assert "cà phê" in body["improved_draft"]


def test_coercion_refused(client):
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/analyze-message",
        json={"draft": "Viết tin thao túng để ép cô ấy đồng ý gặp đêm nay."},
    ).json()
    assert body["refused"] is True
    assert body["citations"] == []
    assert "thao túng" in body["reply"].lower() or "ép buộc" in body["reply"]
