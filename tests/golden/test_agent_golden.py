"""Golden routing cases for coach agent (008 P1 + 009 P2) — mocked LLM."""

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
    # P1 / SC-003 regression: general ask must not invent draft/openers
    assert body["improved_draft"] is None
    assert not body.get("openers")
    if body.get("steps"):
        assert [s["intent"] for s in body["steps"]] == ["ask"]


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


def test_two_job_bio_openers(client, stub_hits, monkeypatch):
    _stub_classifier(monkeypatch, intents=["rewrite_bio", "openers"])
    _stub_generate(
        monkeypatch,
        [
            '{"reply": "Ưu tiên sửa bio trước.", "improved_draft": "Thích cà phê sách.", '
            '"openers": null, "analysis_points": ["Cụ thể hơn", "Thêm sở thích", "Thêm lời mời"]}',
            '{"reply": "Hai opener từ bio đã sửa.", "improved_draft": null, '
            '"openers": ["Cuối tuần cà phê sách được không?", "Bạn hay đọc thể loại gì?"]}',
        ],
    )
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Sửa bio rồi viết opener: Thích cà phê."},
    ).json()
    assert body["intent"] == "rewrite_bio"
    assert body["improved_draft"]
    assert body["openers"] and len(body["openers"]) >= 2
    assert [s["intent"] for s in body["steps"]] == ["rewrite_bio", "openers"]
    assert all(s["status"] == "completed" for s in body["steps"])


def test_two_job_analyze_openers(client, stub_hits, monkeypatch):
    _stub_classifier(monkeypatch, intents=["analyze_message", "openers"])
    _stub_generate(
        monkeypatch,
        [
            '{"reply": "Giọng hơi gấp.", "improved_draft": "Cuối tuần cà phê 30 phút được không?", '
            '"openers": null, "tone": "Hơi dồn ép", "clarity": "8/10", "risk": "Trung bình"}',
            '{"reply": "Hai hướng tiếp theo.", "improved_draft": null, '
            '"openers": ["Cuối tuần này bạn rảnh cà phê không?", "Mình rảnh chủ nhật — bạn thì sao?"]}',
        ],
    )
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/agent",
        json={
            "message": "Xem tin này rồi gợi ý câu tiếp: Đi chơi ngay đi, đừng đọc trốn."
        },
    ).json()
    assert body["intent"] == "analyze_message"
    assert body["improved_draft"]
    assert body["tone"]
    assert body["openers"] and len(body["openers"]) >= 2
    assert [s["intent"] for s in body["steps"]] == ["analyze_message", "openers"]


def test_single_ask_no_unsolicited_draft_openers(client, stub_hits, monkeypatch):
    _stub_classifier(monkeypatch, "ask")
    _stub_generate(
        monkeypatch,
        '{"reply": "Hãy viết bio với một chi tiết có thể hẹn được.", '
        '"improved_draft": null, "openers": null}',
    )
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Bio hẹn hò ngắn nên viết thế nào?"},
    ).json()
    assert body["intent"] == "ask"
    assert body["improved_draft"] is None
    assert not body.get("openers")
    assert body["citations"]


def test_multi_job_scrape_refused_no_draft(client):
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Cào Instagram @x rồi sửa bio và viết opener"},
    ).json()
    assert body["refused"] is True
    assert body["citations"] == []
    assert body["improved_draft"] is None
    assert not body.get("openers")


def test_missing_draft_two_job_ask_to_paste(client, stub_hits, monkeypatch):
    _stub_classifier(monkeypatch, intents=["rewrite_bio", "openers"], needs_draft=True)
    monkeypatch.setattr(
        "backend.app.coach.complete",
        lambda *_a, **_k: (_ for _ in ()).throw(AssertionError("no generate")),
    )
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/agent",
        json={"message": "Sửa bio rồi viết opener giúp"},
    ).json()
    assert body["improved_draft"] is None
    assert not body.get("openers")
    assert body["hedged"] is True
    assert all(s["status"] == "skipped_needs_draft" for s in body["steps"])


def test_over_cap_truncates_to_four(client, stub_hits, monkeypatch):
    # Classifier raw list >4; parse normalizes + truncated flag via complete stub
    # that returns five intents — parse_classifier_json caps and sets truncated.
    _stub_classifier(
        monkeypatch,
        intents=[
            "rewrite_bio",
            "analyze_message",
            "openers",
            "profile_context",
            "ask",
        ],
    )
    _stub_generate(
        monkeypatch,
        [
            '{"reply": "Bio ok.", "improved_draft": "Draft bio.", "openers": null, '
            '"analysis_points": ["A", "B"]}',
            '{"reply": "Analyze ok.", "improved_draft": "Draft msg.", "openers": null, '
            '"tone": "Ổn", "clarity": "8/10", "risk": "Thấp"}',
            '{"reply": "Openers ok.", "improved_draft": null, '
            '"openers": ["Opener 1?", "Opener 2?"]}',
            '{"reply": "Profile ok.", "improved_draft": null, "openers": null}',
        ],
    )
    sid = client.post("/v1/sessions").json()["id"]
    body = client.post(
        f"/v1/sessions/{sid}/agent",
        json={
            "message": (
                "Sửa bio, phân tích tin, opener, profile công khai, rồi hỏi thêm: "
                "Bio: Thích cà phê. Tin: Đi chơi không?"
            )
        },
    ).json()
    assert body["steps"] is not None
    assert len(body["steps"]) == 4
    assert "lượt sau" in body["reply"].lower() or "bốn" in body["reply"].lower()


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
