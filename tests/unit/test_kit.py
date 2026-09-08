"""Unit tests for apply_reply_to_kit (010 session kit)."""

from __future__ import annotations

from backend.app.config import DISCLAIMER_TEXT
from backend.app.kit import apply_reply_to_kit
from backend.app.models import AgentStep, CoachReply
from backend.app.session_store import SessionStore


def _reply(**kwargs) -> CoachReply:
    base = {
        "reply": "ok",
        "citations": [],
        "refused": False,
        "hedged": False,
        "disclaimer": DISCLAIMER_TEXT,
        "intent": "ask",
    }
    base.update(kwargs)
    return CoachReply(**base)


def test_empty_kit_on_create():
    store = SessionStore()
    session = store.create()
    assert session.kit.improved_bio is None
    assert session.kit.openers == []
    assert session.kit.improved_message is None
    assert session.kit.updated_at is None


def test_ask_reply_writes_nothing():
    store = SessionStore()
    session = store.create()
    written = apply_reply_to_kit(
        store,
        session.id,
        _reply(intent="ask", reply="Hãy viết bio cụ thể."),
    )
    assert written == []
    assert session.kit.improved_bio is None


def test_bio_write():
    store = SessionStore()
    session = store.create()
    written = apply_reply_to_kit(
        store,
        session.id,
        _reply(
            intent="rewrite_bio",
            improved_draft="  Cà phê sáng cuối tuần.  ",
            analysis_points=["Cụ thể hóa sở thích", ""],
        ),
    )
    assert written == ["bio"]
    assert session.kit.improved_bio == "Cà phê sáng cuối tuần."
    assert session.kit.analysis_points == ["Cụ thể hóa sở thích"]
    assert session.kit.updated_at is not None


def test_openers_write():
    store = SessionStore()
    session = store.create()
    written = apply_reply_to_kit(
        store,
        session.id,
        _reply(
            intent="openers",
            openers=["Bạn chạy ở đâu?", "  ", "Cuối tuần cà phê?"],
        ),
    )
    assert written == ["openers"]
    assert session.kit.openers == ["Bạn chạy ở đâu?", "Cuối tuần cà phê?"]


def test_message_write():
    store = SessionStore()
    session = store.create()
    written = apply_reply_to_kit(
        store,
        session.id,
        _reply(
            intent="analyze_message",
            reply="Giọng hơi gấp, nên nới nhịp.",
            improved_draft="Cuối tuần cà phê được không?",
            tone="Thân thiện",
            clarity="8/10",
            risk="Thấp",
        ),
        user_text="Xem tin này ổn không: Đi chơi không? Trả lời nhanh.",
    )
    assert written == ["message"]
    assert session.kit.improved_message == "Cuối tuần cà phê được không?"
    assert session.kit.message_draft == "Xem tin này ổn không: Đi chơi không? Trả lời nhanh."
    assert session.kit.message_analysis == "Giọng hơi gấp, nên nới nhịp."
    assert session.kit.tone == "Thân thiện"
    assert session.kit.clarity == "8/10"
    assert session.kit.risk == "Thấp"


def test_refuse_no_op_even_with_leaked_draft():
    store = SessionStore()
    session = store.create()
    session.kit.improved_bio = "Giữ bản cũ"
    written = apply_reply_to_kit(
        store,
        session.id,
        _reply(
            intent="rewrite_bio",
            refused=True,
            improved_draft="Draft độc hại bị leak",
            openers=["Opener leak"],
        ),
    )
    assert written == []
    assert session.kit.improved_bio == "Giữ bản cũ"
    assert session.kit.openers == []


def test_skip_does_not_wipe_other_slot():
    store = SessionStore()
    session = store.create()
    apply_reply_to_kit(
        store,
        session.id,
        _reply(intent="openers", openers=["Opener A", "Opener B"]),
    )
    assert session.kit.openers == ["Opener A", "Opener B"]

    written = apply_reply_to_kit(
        store,
        session.id,
        _reply(
            intent="rewrite_bio",
            improved_draft=None,
            steps=[
                AgentStep(
                    intent="rewrite_bio",
                    status="skipped_needs_draft",
                    label="Sửa bio",
                ),
                AgentStep(
                    intent="openers",
                    status="skipped_needs_draft",
                    label="Gợi ý opener",
                ),
            ],
        ),
    )
    assert written == []
    assert session.kit.openers == ["Opener A", "Opener B"]
    assert session.kit.improved_bio is None


def test_independent_slots_last_write_wins():
    store = SessionStore()
    session = store.create()
    apply_reply_to_kit(
        store,
        session.id,
        _reply(
            intent="rewrite_bio",
            improved_draft="Bio 1",
            analysis_points=["a"],
        ),
    )
    apply_reply_to_kit(
        store,
        session.id,
        _reply(intent="openers", openers=["O1", "O2"]),
    )
    written = apply_reply_to_kit(
        store,
        session.id,
        _reply(
            intent="rewrite_bio",
            improved_draft="Bio 2",
            analysis_points=["b"],
        ),
    )
    assert written == ["bio"]
    assert session.kit.improved_bio == "Bio 2"
    assert session.kit.openers == ["O1", "O2"]


def test_two_job_steps_write_bio_and_openers():
    store = SessionStore()
    session = store.create()
    written = apply_reply_to_kit(
        store,
        session.id,
        _reply(
            intent="rewrite_bio",
            improved_draft="Bio mới",
            openers=["Op1", "Op2"],
            analysis_points=["x"],
            steps=[
                AgentStep(intent="rewrite_bio", status="completed", label="Sửa bio"),
                AgentStep(intent="openers", status="completed", label="Gợi ý opener"),
            ],
        ),
    )
    assert written == ["bio", "openers"]
    assert session.kit.improved_bio == "Bio mới"
    assert session.kit.openers == ["Op1", "Op2"]


def test_whitespace_only_draft_ignored():
    store = SessionStore()
    session = store.create()
    written = apply_reply_to_kit(
        store,
        session.id,
        _reply(intent="rewrite_bio", improved_draft="   \n  "),
    )
    assert written == []
    assert session.kit.improved_bio is None


def test_profile_context_openers_write():
    store = SessionStore()
    session = store.create()
    written = apply_reply_to_kit(
        store,
        session.id,
        _reply(
            intent="profile_context",
            openers=["Bạn chạy ở đâu?"],
        ),
    )
    assert written == ["openers"]
    assert session.kit.openers == ["Bạn chạy ở đâu?"]
