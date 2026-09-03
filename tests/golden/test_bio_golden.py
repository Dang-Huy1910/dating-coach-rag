def test_bio_rewrite_golden(client, stub_hits, monkeypatch):
    monkeypatch.setattr(
        "backend.app.coach.complete",
        lambda _prompt: '{"reply": "Bỏ khẩu hiệu chung, thêm việc bạn làm cuối tuần.", "improved_draft": "Cuối tuần mình hay đi chợ hoa rồi nấu phở. Tìm người cà phê cuối tuần, không vội.", "openers": null}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/rewrite-bio",
        json={"draft": "Sống hết mình, yêu cuộc sống."},
    ).json()
    assert body["refused"] is False
    assert body["improved_draft"]
    assert "phở" in body["improved_draft"]
    assert body["citations"] or body["hedged"]
