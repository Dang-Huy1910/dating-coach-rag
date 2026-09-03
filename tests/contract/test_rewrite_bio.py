def test_rewrite_bio_contract(client, stub_hits, monkeypatch):
    monkeypatch.setattr(
        "backend.app.coach.complete",
        lambda _prompt: '{"reply": "Thêm một chi tiết cụ thể.", "improved_draft": "Cuối tuần nấu phở và đi chợ hoa.", "openers": null, "analysis_points": ["Bỏ khẩu hiệu chung", "Thêm thói quen cuối tuần", "Thêm lời mời cà phê"]}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/rewrite-bio",
        json={"draft": "Yêu cuộc sống."},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "rewrite_bio"
    assert body["improved_draft"]
    assert "reply" in body


def test_empty_bio_rejected(client):
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(f"/v1/sessions/{sid}/rewrite-bio", json={"draft": "  "})
    assert response.status_code == 400
