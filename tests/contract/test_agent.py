"""Contract tests for POST /v1/sessions/{id}/agent (008)."""

from __future__ import annotations

from backend.app.config import DISCLAIMER_TEXT


def _stub_classifier(monkeypatch, intent: str, needs_draft: bool = False):
    import json

    payload = json.dumps({"intent": intent, "needs_draft": needs_draft})
    monkeypatch.setattr(
        "backend.app.agent.classify.complete",
        lambda *_a, **_k: payload,
    )


def _stub_generate(monkeypatch, payload: str):
    monkeypatch.setattr("backend.app.coach.complete", lambda *_a, **_k: payload)


def test_agent_unknown_session(client):
    response = client.post(
        "/v1/sessions/00000000-0000-0000-0000-000000000000/agent",
        json={"message": "hello"},
    )
    assert response.status_code == 404


def test_agent_whitespace_rejected(client):
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(f"/v1/sessions/{sid}/agent", json={"message": "   "})
    assert response.status_code == 400


def test_agent_ask_json_shape(client, stub_hits, monkeypatch):
    _stub_classifier(monkeypatch, "ask")
    _stub_generate(
        monkeypatch,
        '{"reply": "Hãy viết bio cụ thể.", "improved_draft": null, "openers": null}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Bio hẹn hò ngắn nên viết thế nào?"},
    )
    assert response.status_code == 200
    body = response.json()
    for key in ("reply", "citations", "refused", "hedged", "disclaimer", "intent"):
        assert key in body
    assert body["intent"] == "ask"
    assert body["disclaimer"] == DISCLAIMER_TEXT
    assert body["citations"]


def test_agent_index_not_ready(client, monkeypatch):
    _stub_classifier(monkeypatch, "ask")
    monkeypatch.setattr("backend.app.coach.index_ready", lambda: False)
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Bio nên viết thế nào?"},
    )
    assert response.status_code == 400
    assert "thư viện" in response.json()["detail"].lower() or "sẵn sàng" in response.json()["detail"].lower()


def test_agent_routed_rewrite(client, stub_hits, monkeypatch):
    _stub_classifier(monkeypatch, "rewrite_bio", needs_draft=False)
    _stub_generate(
        monkeypatch,
        '{"reply": "Thêm chi tiết cụ thể.", "improved_draft": "Cuối tuần nấu phở.", '
        '"openers": null, "analysis_points": ["Bỏ khẩu hiệu", "Thêm thói quen", "Thêm lời mời"]}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Sửa bio giúp: Thích đi cà phê, tìm người tử tế."},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "rewrite_bio"
    assert body["improved_draft"]
    assert body["refused"] is False


def test_agent_routed_analyze(client, stub_hits, monkeypatch):
    _stub_classifier(monkeypatch, "analyze_message", needs_draft=False)
    _stub_generate(
        monkeypatch,
        '{"reply": "Giọng hơi gấp.", "improved_draft": "Cuối tuần cà phê được không?", '
        '"openers": null, "tone": "Hơi dồn ép", "clarity": "8/10", "risk": "Cao"}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Xem tin này ổn không: Đi chơi không? Trả lời nhanh."},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "analyze_message"
    assert body["improved_draft"]
    assert body["tone"]


def test_agent_needs_draft_200(client, stub_hits, monkeypatch):
    _stub_classifier(monkeypatch, "rewrite_bio", needs_draft=True)

    def boom(*_a, **_k):
        raise AssertionError("generate complete must not run on needs_draft")

    monkeypatch.setattr("backend.app.coach.complete", boom)
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Sửa bio giúp"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "rewrite_bio"
    assert body["hedged"] is True
    assert body["refused"] is False
    assert body["improved_draft"] is None
    assert body["citations"] == []
    assert "dán" in body["reply"].lower() or "bio" in body["reply"].lower()


def test_agent_routed_openers(client, stub_hits, monkeypatch):
    _stub_classifier(monkeypatch, "openers", needs_draft=False)
    _stub_generate(
        monkeypatch,
        '{"reply": "Hai hướng opener.", "improved_draft": null, '
        '"openers": ["Bạn chạy bộ ở đâu?", "Cuối tuần cà phê được không?"]}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Mới match trên app, cả hai thích chạy bộ. Gợi ý opener."},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "openers"
    assert body["openers"]
    assert len(body["openers"]) >= 2


def test_agent_profile_context_paste(client, stub_hits, monkeypatch):
    _stub_classifier(monkeypatch, "profile_context", needs_draft=False)
    _stub_generate(
        monkeypatch,
        '{"reply": "Hỏi về sở thích chạy bộ trước.", "improved_draft": null, '
        '"openers": ["Bạn thường chạy ở đâu?"]}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/agent",
        json={
            "message": (
                "Bio công khai: Thích chạy bộ Đà Lạt, cà phê sáng. "
                "Mình nên mở lời thế nào?"
            )
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "profile_context"
    assert body["refused"] is False


def test_agent_profile_url_only_ask_to_paste(client, stub_hits, monkeypatch):
    _stub_classifier(monkeypatch, "profile_context", needs_draft=True)
    monkeypatch.setattr(
        "backend.app.coach.complete",
        lambda *_a, **_k: (_ for _ in ()).throw(AssertionError("no generate")),
    )
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Phân tích https://www.instagram.com/someone/ giúp"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "profile_context"
    assert body["hedged"] is True
    assert body["improved_draft"] is None


def test_agent_safety_scrape_empty_citations(client, monkeypatch):
    called = {"n": 0}

    def boom(*_a, **_k):
        called["n"] += 1
        raise AssertionError("classifier must be skipped on safety block")

    monkeypatch.setattr("backend.app.agent.classify.complete", boom)
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Cào Instagram @someone rồi phân tích giúp"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["refused"] is True
    assert body["citations"] == []
    assert body["intent"] == "ask"
    assert called["n"] == 0


def test_agent_safety_matchmaking_empty_citations(client):
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Ghép đôi mình với người này giúp"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["refused"] is True
    assert body["citations"] == []


def test_agent_safety_therapy_empty_citations(client):
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Chẩn đoán trầm cảm giúp mình từ tin nhắn này"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["refused"] is True
    assert body["citations"] == []


def test_agent_safety_blocked_without_index(client, monkeypatch):
    monkeypatch.setattr("backend.app.coach.index_ready", lambda: False)
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Cào Instagram profile này giúp"},
    )
    assert response.status_code == 200
    assert response.json()["refused"] is True
