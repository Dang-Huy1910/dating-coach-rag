"""Unit tests for P2 multi-step run_agent merge / skip / safety."""

from __future__ import annotations

import backend.app.agent.run as run_mod
from backend.app.agent.run import run_agent
from backend.app.config import DISCLAIMER_TEXT
from backend.app.models import Citation, CoachReply
from backend.app.session_store import SessionStore


def _store_with_session() -> tuple[SessionStore, str]:
    store = SessionStore()
    session = store.create()
    return store, session.id


def _stub_plan(monkeypatch, intents: list[str], needs_draft: bool = False, truncated: bool = False):
    from backend.app.agent.classify import RoutingDecision

    monkeypatch.setattr(
        run_mod,
        "classify_message",
        lambda _text: RoutingDecision(
            intents=intents,  # type: ignore[arg-type]
            needs_draft=needs_draft,
            blocked=False,
            safety=None,
            truncated=truncated,
        ),
    )


def test_merge_bio_then_openers_passes_draft(monkeypatch):
    store, sid = _store_with_session()
    _stub_plan(monkeypatch, ["rewrite_bio", "openers"])

    seen_texts: list[str] = []

    def fake_handle(**kwargs):
        intent = kwargs["intent"]
        user_text = kwargs.get("user_text") or ""
        seen_texts.append(user_text)
        if intent == "rewrite_bio":
            return CoachReply(
                reply="Đã làm rõ bio.",
                citations=[
                    Citation(
                        source_id="01-profile-bio",
                        title="Bio",
                        path="data/knowledge/01-profile-bio.md",
                        score=0.9,
                    )
                ],
                refused=False,
                hedged=False,
                disclaimer=DISCLAIMER_TEXT,
                intent="rewrite_bio",
                improved_draft="Cà phê sáng, tìm người tử tế.",
                openers=None,
                analysis_points=["Cụ thể hơn"],
            )
        return CoachReply(
            reply="Hai opener.",
            citations=[
                Citation(
                    source_id="02-openers",
                    title="Openers",
                    path="data/knowledge/02-openers.md",
                    score=0.8,
                )
            ],
            refused=False,
            hedged=False,
            disclaimer=DISCLAIMER_TEXT,
            intent="openers",
            improved_draft=None,
            openers=["Opener A?", "Opener B?"],
        )

    monkeypatch.setattr(run_mod, "handle", fake_handle)
    reply = run_agent(store, sid, "Sửa bio rồi opener: Thích cà phê.")

    assert reply.intent == "rewrite_bio"
    assert reply.improved_draft == "Cà phê sáng, tìm người tử tế."
    assert reply.openers and len(reply.openers) >= 2
    assert reply.steps is not None and len(reply.steps) == 2
    assert [s.intent for s in reply.steps] == ["rewrite_bio", "openers"]
    assert all(s.status == "completed" for s in reply.steps)
    assert "Sửa bio" in reply.reply
    assert "Gợi ý opener" in reply.reply
    assert len(reply.citations) == 2
    # Second job must see improved draft
    assert any("Cà phê sáng" in t for t in seen_texts)


def test_needs_draft_skips_rewrite_and_dependent_openers(monkeypatch):
    store, sid = _store_with_session()
    _stub_plan(monkeypatch, ["rewrite_bio", "openers"], needs_draft=True)

    def boom(**_kwargs):
        raise AssertionError("handle must not run when needs_draft skips jobs")

    monkeypatch.setattr(run_mod, "handle", boom)
    reply = run_agent(store, sid, "Sửa bio rồi viết opener giúp")

    assert reply.improved_draft is None
    assert not reply.openers
    assert reply.hedged is True
    assert reply.refused is False
    assert reply.steps is not None
    assert [s.status for s in reply.steps] == [
        "skipped_needs_draft",
        "skipped_needs_draft",
    ]
    assert "dán" in reply.reply.lower() or "bio" in reply.reply.lower()


def test_needs_draft_still_runs_independent_ask(monkeypatch):
    store, sid = _store_with_session()
    _stub_plan(monkeypatch, ["rewrite_bio", "ask"], needs_draft=True)

    def fake_handle(**kwargs):
        assert kwargs["intent"] == "ask"
        return CoachReply(
            reply="Bio ngắn nên cụ thể.",
            citations=[],
            refused=False,
            hedged=False,
            disclaimer=DISCLAIMER_TEXT,
            intent="ask",
        )

    monkeypatch.setattr(run_mod, "handle", fake_handle)
    reply = run_agent(store, sid, "Sửa bio giúp rồi cho thêm tips chung")
    assert reply.steps is not None
    assert reply.steps[0].status == "skipped_needs_draft"
    assert reply.steps[1].intent == "ask"
    assert reply.steps[1].status == "completed"
    assert reply.hedged is True


def test_safety_short_circuit_no_handle(monkeypatch):
    store, sid = _store_with_session()
    called = {"n": 0}

    def boom(**_k):
        called["n"] += 1
        raise AssertionError("handle must not run on safety block")

    monkeypatch.setattr(run_mod, "handle", boom)
    # Real classify_message safety path (no stub) — scrape language
    reply = run_agent(store, sid, "Cào Instagram @x rồi sửa bio và viết opener")
    assert reply.refused is True
    assert reply.citations == []
    assert reply.improved_draft is None
    assert called["n"] == 0


def test_over_cap_truncated_mentions_follow_up(monkeypatch):
    store, sid = _store_with_session()
    _stub_plan(
        monkeypatch,
        ["rewrite_bio", "analyze_message", "openers", "profile_context"],
        truncated=True,
    )

    def fake_handle(**kwargs):
        intent = kwargs["intent"]
        return CoachReply(
            reply=f"Done {intent}",
            citations=[],
            refused=False,
            hedged=False,
            disclaimer=DISCLAIMER_TEXT,
            intent=intent,
            improved_draft="draft" if intent == "rewrite_bio" else None,
            openers=["A?", "B?"] if intent == "openers" else None,
        )

    monkeypatch.setattr(run_mod, "handle", fake_handle)
    reply = run_agent(store, sid, "Làm hết mọi thứ giúp")
    assert len(reply.steps or []) == 4
    assert "lượt sau" in reply.reply.lower() or "bốn" in reply.reply.lower()


def test_cap_normalize_unit():
    from backend.app.agent.classify import normalize_intents

    intents, truncated = normalize_intents(
        [
            "rewrite_bio",
            "analyze_message",
            "openers",
            "profile_context",
            "ask",
            "rewrite_bio",
        ]
    )
    assert truncated is True
    assert len(intents) == 4
