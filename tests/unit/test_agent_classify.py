"""Unit tests for coach router classifier (P1 legacy + P2 intents[])."""

from __future__ import annotations

import backend.app.agent.classify as classify_mod
from backend.app.agent.classify import (
    ALLOWED_INTENTS,
    classify_message,
    normalize_intents,
    parse_classifier_json,
)
from backend.app.agent.run import extract_fetchable_url


def test_allowlist_contains_five_intents():
    assert ALLOWED_INTENTS == {
        "ask",
        "rewrite_bio",
        "analyze_message",
        "openers",
        "profile_context",
    }


def test_parse_legacy_single_intent():
    plan = parse_classifier_json('{"intent": "rewrite_bio", "needs_draft": false}')
    assert plan.intents == ["rewrite_bio"]
    assert plan.needs_draft is False
    assert plan.truncated is False


def test_parse_intents_array():
    plan = parse_classifier_json(
        '{"intents": ["rewrite_bio", "openers"], "needs_draft": false}'
    )
    assert plan.intents == ["rewrite_bio", "openers"]
    assert plan.needs_draft is False


def test_invalid_json_defaults_to_ask():
    plan = parse_classifier_json("not json at all")
    assert plan.intents == ["ask"]
    assert plan.needs_draft is False


def test_unknown_intent_defaults_to_ask():
    plan = parse_classifier_json('{"intent": "simulation", "needs_draft": true}')
    assert plan.intents == ["ask"]
    assert plan.needs_draft is False


def test_markdown_fenced_json():
    raw = '```json\n{"intent": "openers", "needs_draft": false}\n```'
    plan = parse_classifier_json(raw)
    assert plan.intents == ["openers"]
    assert plan.needs_draft is False


def test_unique_preserves_order():
    plan = parse_classifier_json(
        '{"intents": ["rewrite_bio", "openers", "rewrite_bio"], "needs_draft": false}'
    )
    assert plan.intents == ["rewrite_bio", "openers"]


def test_cap_four_truncated():
    plan = parse_classifier_json(
        '{"intents": ["rewrite_bio", "analyze_message", "openers", '
        '"profile_context", "ask"], "needs_draft": false}'
    )
    assert len(plan.intents) == 4
    assert plan.truncated is True
    assert "ask" not in plan.intents  # capped before ask-last reorder of 5th


def test_draft_before_openers_and_ask_last():
    intents, truncated = normalize_intents(
        ["openers", "ask", "rewrite_bio", "analyze_message"]
    )
    assert truncated is False
    assert intents[0] in {"rewrite_bio", "analyze_message"}
    assert intents.index("openers") > intents.index("rewrite_bio")
    assert intents[-1] == "ask"


def test_empty_intents_become_ask():
    plan = parse_classifier_json('{"intents": [], "needs_draft": true}')
    assert plan.intents == ["ask"]
    assert plan.needs_draft is False


def test_safety_short_circuit_skips_classifier(monkeypatch):
    called = {"n": 0}

    def boom(_prompt, **_kwargs):
        called["n"] += 1
        raise AssertionError("classifier complete must not be called when blocked")

    monkeypatch.setattr(classify_mod, "complete", boom)
    decision = classify_message("Cào Instagram @someone rồi phân tích giúp")
    assert decision.blocked is True
    assert decision.intent == "ask"
    assert decision.intents == ["ask"]
    assert decision.safety is not None
    assert decision.safety.allowed is False
    assert called["n"] == 0


def test_safety_matchmaking_short_circuit(monkeypatch):
    monkeypatch.setattr(
        classify_mod,
        "complete",
        lambda *_a, **_k: (_ for _ in ()).throw(AssertionError("no classify")),
    )
    decision = classify_message("Ghép đôi mình với người này giúp")
    assert decision.blocked is True
    assert decision.intent == "ask"


def test_needs_draft_rewrite_without_paste(monkeypatch):
    monkeypatch.setattr(
        classify_mod,
        "complete",
        lambda *_a, **_k: '{"intent": "rewrite_bio", "needs_draft": true}',
    )
    decision = classify_message("Sửa bio giúp")
    assert decision.blocked is False
    assert decision.intent == "rewrite_bio"
    assert decision.needs_draft is True


def test_needs_draft_analyze_without_paste(monkeypatch):
    monkeypatch.setattr(
        classify_mod,
        "complete",
        lambda *_a, **_k: '{"intent": "analyze_message", "needs_draft": true}',
    )
    decision = classify_message("Xem tin nhắn giúp")
    assert decision.intent == "analyze_message"
    assert decision.needs_draft is True


def test_needs_draft_openers_without_context(monkeypatch):
    monkeypatch.setattr(
        classify_mod,
        "complete",
        lambda *_a, **_k: '{"intent": "openers", "needs_draft": true}',
    )
    decision = classify_message("Gợi ý opener đi")
    assert decision.intent == "openers"
    assert decision.needs_draft is True


def test_multi_intent_classify(monkeypatch):
    monkeypatch.setattr(
        classify_mod,
        "complete",
        lambda *_a, **_k: (
            '{"intents": ["rewrite_bio", "openers"], "needs_draft": false}'
        ),
    )
    decision = classify_message("Sửa bio rồi gợi ý opener: Thích cà phê.")
    assert decision.intents == ["rewrite_bio", "openers"]
    assert decision.intent == "rewrite_bio"
    assert decision.needs_draft is False


def test_instagram_url_not_fetchable():
    assert extract_fetchable_url("https://www.instagram.com/someone/") is None
    assert extract_fetchable_url("Phân tích https://instagram.com/x") is None


def test_youtube_url_is_fetchable():
    url = extract_fetchable_url("Xem https://youtu.be/abcdefghijk giúp")
    assert url == "https://youtu.be/abcdefghijk"


def test_ask_intent_forces_needs_draft_false():
    plan = parse_classifier_json('{"intent": "ask", "needs_draft": true}')
    assert plan.intents == ["ask"]
    assert plan.needs_draft is False


def test_has_images_clears_openers_needs_draft(monkeypatch):
    monkeypatch.setattr(
        classify_mod,
        "complete",
        lambda *_a, **_k: '{"intent": "openers", "needs_draft": true}',
    )
    decision = classify_message("Gợi ý opener", has_images=True)
    assert decision.intent == "openers"
    assert decision.needs_draft is False


def test_has_images_empty_ask_becomes_openers(monkeypatch):
    monkeypatch.setattr(
        classify_mod,
        "complete",
        lambda *_a, **_k: '{"intent": "ask", "needs_draft": false}',
    )
    decision = classify_message(
        "Gợi ý opener từ ảnh profile/screenshot mình đã thấy.",
        has_images=True,
    )
    assert decision.intents == ["openers"]
    assert decision.needs_draft is False
