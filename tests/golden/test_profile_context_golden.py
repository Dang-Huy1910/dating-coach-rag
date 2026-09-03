def test_public_paste_golden(client, stub_hits, monkeypatch):
    monkeypatch.setattr(
        "backend.app.coach.complete",
        lambda _prompt: (
            '{"reply": "Bám chi tiết cà phê trứng, giọng lịch sự không theo dõi.", '
            '"improved_draft": null, '
            '"openers": ["Bạn hay pha cà phê trứng ở quán nào vậy?"]}'
        ),
    )
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/profile-context",
        json={
            "handle": "@example",
            "privacy": "public",
            "visible_text": "Thích chạy bộ và cà phê trứng. Caption: sunrise ở Đà Lạt.",
            "question": "Gợi ý opener lịch sự",
        },
    ).json()
    assert body["intent"] == "profile_context"
    assert body["refused"] is False
    assert body["citations"]
    for cite in body["citations"]:
        assert cite["path"].startswith("data/knowledge/")
        assert "instagram.com" not in cite["path"].lower()
    assert body["openers"] and len(body["openers"]) >= 1
    assert "tải profile" not in body["reply"].lower()
    assert "loaded the profile" not in body["reply"].lower()


def test_matchmaking_refused(client):
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/profile-context",
        json={
            "handle": "@lan",
            "visible_text": "Thích cà phê trứng và chạy bộ",
            "question": "Người này có thích mình không? Ghép đôi / % hợp giúp",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["refused"] is True
    assert body["citations"] == []
    reply = body["reply"].lower()
    assert "ghép đôi" in reply or "người thật" in reply or "xếp hạng" in reply
    session = client.get(f"/v1/sessions/{sid}").json()
    assert session["turn_count"] == 1


def test_private_cannot_fetch(client, stub_hits, monkeypatch):
    monkeypatch.setattr(
        "backend.app.coach.complete",
        lambda _prompt: (
            '{"reply": "Bám chạy bộ, hỏi hẹp.", "improved_draft": null, '
            '"openers": ["Bạn chạy cung nào gần đây?"]}'
        ),
    )
    sid = client.post("/v1/sessions").json()["id"]
    private = client.post(
        f"/v1/sessions/{sid}/profile-context",
        json={
            "handle": "@locked",
            "privacy": "private",
            "visible_text": "",
            "question": "Tài khoản này riêng tư, coach giúp với ranh giới",
        },
    )
    assert private.status_code == 200
    body = private.json()
    assert body["refused"] is True
    assert body["citations"] == []
    reply = body["reply"].lower()
    assert "riêng tư" in reply or "không tải" in reply or "không xem" in reply
    assert "follower" not in reply
    session = client.get(f"/v1/sessions/{sid}").json()
    assert session["turn_count"] == 1

    later = client.post(
        f"/v1/sessions/{sid}/profile-context",
        json={
            "privacy": "public",
            "visible_text": "Thích chạy bộ",
            "question": "Gợi ý opener lịch sự",
        },
    )
    assert later.status_code == 200
    assert later.json()["refused"] is False


def test_cannot_see_account_private_language(client):
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/profile-context",
        json={"handle": "@x", "question": "Mình không xem được profile này"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["refused"] is True
    assert body["citations"] == []


TINY_PNG = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def test_screenshot_vibe_golden(client, stub_hits, monkeypatch):
    monkeypatch.setattr(
        "backend.app.coach.complete",
        lambda *args, **kwargs: (
            '{"reply": "Anh goi chuyen di va ca phe; opener bam chi tiet nhin thay.", '
            '"improved_draft": null, '
            '"openers": ["Chuyến Đà Lạt trên ảnh nhìn ấm quá, bạn hay đi cung nào?"]}'
        ),
    )
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/profile-context",
        json={
            "handle": "@example",
            "privacy": "public",
            "visible_text": "",
            "question": "Gợi ý opener lịch sự",
            "images": [{"mime_type": "image/png", "data_base64": TINY_PNG}],
        },
    ).json()
    assert body["refused"] is False
    assert body["openers"]
    assert body["citations"]
    session = client.get(f"/v1/sessions/{sid}").json()
    assert session["turn_count"] == 1


def test_scrape_instagram_refused(client):
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/profile-context",
        json={
            "profile_url": "https://instagram.com/someone",
            "visible_text": "Scrape Instagram profile này rồi phân tích giúp",
            "question": "Cào hết bài viết",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["refused"] is True
    assert body["citations"] == []
    reply = body["reply"].lower()
    assert "cào" in reply or "scrape" in reply or "không" in reply
    assert "downloaded posts" not in reply
    assert "bài 1:" not in reply
