"""Golden routing cases for P1 coach router (008) — mocked LLM."""

from __future__ import annotations

import json


def _stub_classifier(monkeypatch, intent: str, needs_draft: bool = False):
    payload = json.dumps({"intent": intent, "needs_draft": needs_draft})
    monkeypatch.setattr(
        "backend.app.agent.classify.complete",
        lambda *_a, **_k: payload,
    )


def _stub_generate(monkeypatch, payload: str):
    monkeypatch.setattr("backend.app.coach.complete", lambda *_a, **_k: payload)


def test_cited_ask_via_agent(client, stub_hits, monkeypatch):
    _stub_classifier(monkeypatch, "ask")
    _stub_generate(
        monkeypatch,
        '{"reply": "Bio nên có chi tiết cụ thể, ví dụ sở thích có thể hẹn được.", '
        '"improved_draft": null, "openers": null}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Bio hẹn hò ngắn nên viết thế nào cho cụ thể?"},
    ).json()
    assert body["intent"] == "ask"
    assert body["refused"] is False
    assert body["citations"]
    assert "data/knowledge/" in body["citations"][0]["path"]
    assert body["disclaimer"]


def test_refuse_when_unknown_via_agent(client, monkeypatch):
    _stub_classifier(monkeypatch, "ask")
    monkeypatch.setattr("backend.app.coach.retrieve_chunks", lambda _q: [])
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Luật thuế cho đám cưới năm 2024 tính như thế nào?"},
    ).json()
    assert body["refused"] is True
    assert body["hedged"] is True
    assert body["citations"] == []
    lower = body["reply"].lower()
    assert "nghiên cứu" not in lower
    assert "study shows" not in lower


def test_bio_rewrite_via_agent(client, stub_hits, monkeypatch):
    _stub_classifier(monkeypatch, "rewrite_bio")
    _stub_generate(
        monkeypatch,
        '{"reply": "Thêm một chi tiết cụ thể.", "improved_draft": '
        '"Cuối tuần nấu phở và đi chợ hoa.", "openers": null, '
        '"analysis_points": ["Bỏ khẩu hiệu chung", "Thêm thói quen", "Thêm lời mời"]}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Sửa bio giúp: Yêu cuộc sống."},
    ).json()
    assert body["intent"] == "rewrite_bio"
    assert body["improved_draft"]
    assert body["refused"] is False


def test_message_analysis_via_agent(client, stub_hits, monkeypatch):
    _stub_classifier(monkeypatch, "analyze_message")
    _stub_generate(
        monkeypatch,
        '{"reply": "Giọng hơi gấp. Hãy hỏi thay vì đòi.", '
        '"improved_draft": "Cuối tuần này cà phê 30 phút được không?", '
        '"openers": null, "tone": "Hơi dồn ép", "clarity": "8/10 • Rõ ý", '
        '"risk": "Cao — dễ phòng thủ"}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Xem tin này ổn không: Đi chơi ngay đi, đừng đọc trốn."},
    ).json()
    assert body["intent"] == "analyze_message"
    assert body["improved_draft"]
    assert body["tone"]
    assert body["clarity"]
    assert body["risk"]


def test_openers_via_agent(client, stub_hits, monkeypatch):
    _stub_classifier(monkeypatch, "openers")
    _stub_generate(
        monkeypatch,
        '{"reply": "Hai hướng opener.", "improved_draft": null, '
        '"openers": ["Bạn chạy bộ ở đâu?", "Cuối tuần cà phê được không?"]}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Dating app, bio nói thích chạy bộ. Gợi ý opener."},
    ).json()
    assert body["intent"] == "openers"
    assert body["openers"]
    assert len(body["openers"]) >= 2


def test_ambiguous_falls_back_to_ask(client, stub_hits, monkeypatch):
    _stub_classifier(monkeypatch, "ask")
    _stub_generate(
        monkeypatch,
        '{"reply": "Khi nhắn tin, hãy rõ ý và tôn trọng nhịp của đối phương.", '
        '"improved_draft": null, "openers": null}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Mình đang hơi rối chuyện nhắn tin"},
    ).json()
    assert body["intent"] == "ask"
    assert body["improved_draft"] is None
    assert not body.get("openers")


def test_two_job_message_still_one_intent(client, stub_hits, monkeypatch):
    # Classifier picks the clearest single job (rewrite_bio); never both.
    _stub_classifier(monkeypatch, "rewrite_bio")
    _stub_generate(
        monkeypatch,
        '{"reply": "Ưu tiên sửa bio trước.", "improved_draft": "Thích cà phê sách.", '
        '"openers": null, "analysis_points": ["Cụ thể hơn", "Thêm sở thích", "Thêm lời mời"]}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Sửa bio rồi viết opener: Thích cà phê."},
    ).json()
    assert body["intent"] == "rewrite_bio"
    assert body["improved_draft"]
    # P1: one capability — openers array not required on rewrite path
    assert body["intent"] != "openers"


def test_scrape_refused_via_agent(client):
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Scrape Instagram profile này rồi phân tích giúp"},
    ).json()
    assert body["refused"] is True
    assert body["citations"] == []
    assert body["intent"] == "ask"


def test_matchmaking_refused_via_agent(client):
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Tìm người yêu hộ mình với người này"},
    ).json()
    assert body["refused"] is True
    assert body["citations"] == []


def test_profile_context_paste_via_agent(client, stub_hits, monkeypatch):
    _stub_classifier(monkeypatch, "profile_context")
    _stub_generate(
        monkeypatch,
        '{"reply": "Mở lời về sở thích chạy bộ.", "improved_draft": null, '
        '"openers": ["Bạn thường chạy trail ở đâu?"]}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/agent",
        json={
            "message": (
                "Profile công khai: Thích trail Đà Lạt, cà phê sáng. "
                "Mình follow mới — nên nhắn gì?"
            )
        },
    ).json()
    assert body["intent"] == "profile_context"
    assert body["refused"] is False
