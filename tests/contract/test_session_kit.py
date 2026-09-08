"""Contract tests for sitting kit GET + writes (010)."""

from __future__ import annotations

import json


def _stub_classifier(
    monkeypatch,
    intent: str | None = None,
    needs_draft: bool = False,
    intents: list[str] | None = None,
):
    if intents is not None:
        payload = json.dumps({"intents": intents, "needs_draft": needs_draft})
    else:
        payload = json.dumps({"intent": intent or "ask", "needs_draft": needs_draft})
    monkeypatch.setattr(
        "backend.app.agent.classify.complete",
        lambda *_a, **_k: payload,
    )


def _stub_generate(monkeypatch, payload: str | list[str]):
    if isinstance(payload, list):
        responses = iter(payload)
        monkeypatch.setattr(
            "backend.app.coach.complete",
            lambda *_a, **_k: next(responses),
        )
    else:
        monkeypatch.setattr("backend.app.coach.complete", lambda *_a, **_k: payload)


def test_get_kit_unknown_session(client):
    response = client.get("/v1/sessions/00000000-0000-0000-0000-000000000000/kit")
    assert response.status_code == 404


def test_get_kit_empty(client):
    sid = client.post("/v1/sessions").json()["id"]
    response = client.get(f"/v1/sessions/{sid}/kit")
    assert response.status_code == 200
    body = response.json()
    assert body["improved_bio"] is None
    assert body["openers"] == []
    assert body["improved_message"] is None
    assert body["slots_filled"] == []
    assert body["updated_at"] is None


def test_agent_rewrite_fills_bio(client, stub_hits, monkeypatch):
    _stub_classifier(monkeypatch, "rewrite_bio", needs_draft=False)
    _stub_generate(
        monkeypatch,
        '{"reply": "Thêm chi tiết cụ thể.", "improved_draft": "Cuối tuần nấu phở.", '
        '"openers": null, "analysis_points": ["Bỏ khẩu hiệu", "Thêm thói quen", "Thêm lời mời"]}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    agent = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Sửa bio giúp: Thích đi cà phê, tìm người tử tế."},
    )
    assert agent.status_code == 200
    body = agent.json()
    assert body["kit_updated"] == ["bio"]
    assert body["improved_draft"]

    kit = client.get(f"/v1/sessions/{sid}/kit").json()
    assert kit["improved_bio"] == "Cuối tuần nấu phở."
    assert "bio" in kit["slots_filled"]
    assert kit["analysis_points"]


def test_two_job_fills_bio_and_openers(client, stub_hits, monkeypatch):
    _stub_classifier(
        monkeypatch,
        intents=["rewrite_bio", "openers"],
        needs_draft=False,
    )
    _stub_generate(
        monkeypatch,
        [
            '{"reply": "Thêm chi tiết cụ thể.", "improved_draft": '
            '"Cà phê sáng cuối tuần, đang tìm người nói chuyện tử tế.", '
            '"openers": null, "analysis_points": ["Bỏ khẩu hiệu", "Thêm thói quen", "Thêm lời mời"]}',
            '{"reply": "Hai hướng opener.", "improved_draft": null, '
            '"openers": ["Cuối tuần này quán cà phê nào bạn hay ngồi?", '
            '"Mình cũng thích cà phê chậm — bạn thường order gì?"]}',
        ],
    )
    sid = client.post("/v1/sessions").json()["id"]
    agent = client.post(
        f"/v1/sessions/{sid}/agent",
        json={
            "message": "Sửa bio giúp rồi gợi ý opener: Thích cà phê, tìm người tử tế."
        },
    )
    assert agent.status_code == 200
    body = agent.json()
    assert body["kit_updated"] == ["bio", "openers"]

    kit = client.get(f"/v1/sessions/{sid}/kit").json()
    assert "bio" in kit["slots_filled"]
    assert "openers" in kit["slots_filled"]
    assert kit["improved_bio"]
    assert len(kit["openers"]) >= 2


def test_dedicated_openers_writes_kit(client, stub_hits, monkeypatch):
    _stub_generate(
        monkeypatch,
        '{"reply": "Hai hướng.", "improved_draft": null, '
        '"openers": ["Bạn chạy bộ ở đâu?", "Cuối tuần cà phê được không?"]}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/openers",
        json={"context": "Mới match, cả hai thích chạy bộ."},
    )
    assert response.status_code == 200
    assert response.json()["kit_updated"] == ["openers"]

    kit = client.get(f"/v1/sessions/{sid}/kit").json()
    assert kit["slots_filled"] == ["openers"]
    assert len(kit["openers"]) >= 2


def test_dedicated_rewrite_writes_kit(client, stub_hits, monkeypatch):
    _stub_generate(
        monkeypatch,
        '{"reply": "Ok.", "improved_draft": "Bio đã sửa.", '
        '"openers": null, "analysis_points": ["a", "b", "c"]}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    response = client.post(
        f"/v1/sessions/{sid}/rewrite-bio",
        json={"draft": "Thích cà phê."},
    )
    assert response.status_code == 200
    assert response.json()["kit_updated"] == ["bio"]
    kit = client.get(f"/v1/sessions/{sid}/kit").json()
    assert kit["improved_bio"] == "Bio đã sửa."


def test_analyze_message_fills_message(client, stub_hits, monkeypatch):
    _stub_classifier(monkeypatch, "analyze_message", needs_draft=False)
    _stub_generate(
        monkeypatch,
        '{"reply": "Giọng hơi gấp.", "improved_draft": "Cuối tuần cà phê được không?", '
        '"openers": null, "tone": "Hơi dồn ép", "clarity": "8/10", "risk": "Cao"}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    agent = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Xem tin này ổn không: Đi chơi không? Trả lời nhanh."},
    )
    assert agent.status_code == 200
    assert agent.json()["kit_updated"] == ["message"]

    kit = client.get(f"/v1/sessions/{sid}/kit").json()
    assert kit["improved_message"] == "Cuối tuần cà phê được không?"
    assert kit["message_draft"] == "Xem tin này ổn không: Đi chơi không? Trả lời nhanh."
    assert kit["tone"] == "Hơi dồn ép"
    assert "message" in kit["slots_filled"]


def test_safety_refuse_leaves_kit_empty(client, monkeypatch):
    called = {"n": 0}

    def boom(*_a, **_k):
        called["n"] += 1
        raise AssertionError("no classify/generate on safety")

    monkeypatch.setattr("backend.app.agent.classify.complete", boom)
    monkeypatch.setattr("backend.app.coach.complete", boom)
    sid = client.post("/v1/sessions").json()["id"]
    agent = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Cào Instagram @someone rồi viết opener"},
    )
    assert agent.status_code == 200
    body = agent.json()
    assert body["refused"] is True
    assert body.get("kit_updated") in (None, [])

    kit = client.get(f"/v1/sessions/{sid}/kit").json()
    assert kit["slots_filled"] == []
    assert kit["improved_bio"] is None
    assert kit["openers"] == []
    assert kit["improved_message"] is None
    assert called["n"] == 0


def test_new_session_empty_kit(client, stub_hits, monkeypatch):
    _stub_classifier(monkeypatch, "rewrite_bio", needs_draft=False)
    _stub_generate(
        monkeypatch,
        '{"reply": "Ok.", "improved_draft": "Bio phiên 1.", '
        '"openers": null, "analysis_points": ["a", "b", "c"]}',
    )
    sid1 = client.post("/v1/sessions").json()["id"]
    client.post(
        f"/v1/sessions/{sid1}/agent",
        json={"message": "Sửa bio giúp: Thích cà phê."},
    )
    assert client.get(f"/v1/sessions/{sid1}/kit").json()["improved_bio"]

    sid2 = client.post("/v1/sessions").json()["id"]
    kit2 = client.get(f"/v1/sessions/{sid2}/kit").json()
    assert kit2["slots_filled"] == []
    assert kit2["improved_bio"] is None
    assert kit2["openers"] == []
