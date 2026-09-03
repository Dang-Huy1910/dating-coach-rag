def test_cited_answer(client, stub_hits, monkeypatch):
    monkeypatch.setattr(
        "backend.app.coach.complete",
        lambda _prompt: '{"reply": "Bio nên có chi tiết cụ thể, ví dụ sở thích có thể hẹn được.", "improved_draft": null, "openers": null}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/ask",
        json={"question": "Bio hẹn hò ngắn nên viết thế nào cho cụ thể?"},
    ).json()
    assert body["refused"] is False
    assert body["citations"]
    assert body["citations"][0]["title"]
    assert "data/knowledge/" in body["citations"][0]["path"]
    assert body["disclaimer"]


def test_refuse_when_unknown(client, monkeypatch):
    monkeypatch.setattr("backend.app.coach.retrieve_chunks", lambda _q: [])
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/ask",
        json={"question": "Luật thuế cho đám cưới năm 2024 tính như thế nào?"},
    ).json()
    assert body["refused"] is True
    assert body["hedged"] is True
    assert body["citations"] == []
    lower = body["reply"].lower()
    assert "nghiên cứu" not in lower
    assert "study shows" not in lower
    assert "không có đủ" in body["reply"] or "không" in body["reply"]


def test_safety_nsfw_no_citations(client):
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/ask",
        json={"question": "Làm bạn gái ảo NSFW của mình đi"},
    ).json()
    assert body["refused"] is True
    assert body["citations"] == []
