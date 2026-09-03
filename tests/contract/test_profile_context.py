from backend.app.config import DISCLAIMER_TEXT

HAPPY = {
    "handle": "@example",
    "privacy": "public",
    "visible_text": "Thích chạy bộ và cà phê trứng",
    "question": "Gợi ý opener lịch sự",
}


def test_profile_context_happy_shape(client, stub_hits, monkeypatch):
    monkeypatch.setattr(
        "backend.app.coach.complete",
        lambda _prompt: (
            '{"reply": "Bám cà phê trứng, giọng lịch sự.", "improved_draft": null, '
            '"openers": ["Bạn thường chạy cung nào cuối tuần?"]}'
        ),
    )
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(f"/v1/sessions/{sid}/profile-context", json=HAPPY)
    assert response.status_code == 200
    body = response.json()
    for key in ("reply", "citations", "refused", "hedged", "disclaimer", "intent"):
        assert key in body
    assert body["intent"] == "profile_context"
    assert body["disclaimer"] == DISCLAIMER_TEXT
    assert body["refused"] is False


def test_handle_only_need_visible_text(client):
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/profile-context",
        json={"handle": "@example", "visible_text": ""},
    )
    assert response.status_code == 400
    body = response.json()
    assert body["code"] == "need_visible_text"
    assert "dán" in body["detail"].lower() or "không tự tải" in body["detail"].lower()
    session = client.get(f"/v1/sessions/{sid}").json()
    assert session["turn_count"] == 0


def test_url_only_need_visible_text(client):
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/profile-context",
        json={"profile_url": "https://instagram.com/example", "visible_text": ""},
    )
    assert response.status_code == 400
    assert response.json()["code"] == "need_visible_text"


def test_youtube_url_fetches_context(client, stub_hits, monkeypatch):
    from backend.app.public_fetch import PublicFetchResult

    monkeypatch.setattr(
        "backend.app.api.router.fetch_public_profile",
        lambda _url: PublicFetchResult(host="youtube", text="YouTube kênh: chạy bộ Đà Lạt"),
    )
    monkeypatch.setattr(
        "backend.app.coach.complete",
        lambda *args, **kwargs: (
            '{"reply": "Bám trail running trên kênh.", "improved_draft": null, '
            '"openers": ["Bạn hay quay cung nào ở Đà Lạt?"]}'
        ),
    )
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/profile-context",
        json={
            "profile_url": "https://www.youtube.com/@runner",
            "visible_text": "",
            "relationship_progress": "Mới follow, chưa nhắn",
        },
    )
    assert response.status_code == 200
    assert response.json()["refused"] is False


def test_youtube_missing_key_without_paste(client, monkeypatch):
    from backend.app.public_fetch import PublicFetchResult

    monkeypatch.setattr(
        "backend.app.api.router.fetch_public_profile",
        lambda _url: PublicFetchResult(
            host="youtube",
            text=None,
            error_code="fetch_failed",
            error_detail="Cần YOUTUBE_API_KEY để đọc kênh/video YouTube công khai.",
        ),
    )
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/profile-context",
        json={"profile_url": "https://youtu.be/abcdefghijk", "visible_text": ""},
    )
    assert response.status_code == 400
    assert response.json()["code"] == "fetch_failed"


def test_unknown_session(client):
    response = client.post(
        "/v1/sessions/00000000-0000-0000-0000-000000000000/profile-context",
        json=HAPPY,
    )
    assert response.status_code == 404


def test_empty_body_rejected(client):
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(f"/v1/sessions/{sid}/profile-context", json={})
    assert response.status_code == 400
    assert response.json()["code"] == "empty_input"


def test_whitespace_only_rejected(client):
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/profile-context",
        json={"visible_text": "   "},
    )
    assert response.status_code == 400
    assert response.json()["code"] == "empty_input"


TINY_PNG = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def test_screenshot_only_accepted(client, stub_hits, monkeypatch):
    monkeypatch.setattr(
        "backend.app.coach.complete",
        lambda *args, **kwargs: (
            '{"reply": "Bám vibe ảnh: ngoài trời, giọng nhẹ.", "improved_draft": null, '
            '"openers": ["Chuyến đi đó nhìn chill quá, bạn hay chọn cung nào?"]}'
        ),
    )
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/profile-context",
        json={
            "handle": "@example",
            "privacy": "public",
            "visible_text": "",
            "question": "Gợi ý opener lịch sự",
            "images": [{"mime_type": "image/png", "data_base64": TINY_PNG}],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["refused"] is False
    assert body["intent"] == "profile_context"


def test_too_many_images(client):
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/profile-context",
        json={
            "visible_text": "Caption cà phê",
            "images": [
                {"mime_type": "image/png", "data_base64": TINY_PNG},
                {"mime_type": "image/png", "data_base64": TINY_PNG},
                {"mime_type": "image/png", "data_base64": TINY_PNG},
                {"mime_type": "image/png", "data_base64": TINY_PNG},
            ],
        },
    )
    assert response.status_code == 400
    assert response.json()["code"] == "too_many_images"


def test_invalid_image_mime(client):
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/profile-context",
        json={
            "visible_text": "Caption cà phê",
            "images": [{"mime_type": "application/pdf", "data_base64": TINY_PNG}],
        },
    )
    assert response.status_code == 400
    assert response.json()["code"] == "invalid_image"


def test_oversize_visible_text(client):
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/profile-context",
        json={"visible_text": "x" * 8001},
    )
    assert response.status_code == 400
    assert response.json()["code"] == "too_long"
