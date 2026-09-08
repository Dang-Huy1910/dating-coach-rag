# Research: Session Coaching Kit (P3)

**Branch**: `010-session-kit` | **Date**: 2026-09-08

---

## Decision 1: Kit on SessionStore, not React-only

**Decision**: `CoachingSession.kit` in `backend/app/session_store.py`. `GET /v1/sessions/{id}/kit`. Writes from API layer after a **non-refused** reply that has artifacts.

**Rationale**: FR-004 / constitution III. Tab-local `useState` dies on unmount — that is the P2 gap (copy between tabs).

**Alternatives considered**:
- Lift React context only — refresh/new component instance loses data unless also on server; split-brain.
- localStorage — survives “new sitting” incorrectly; not system of record.

---

## Decision 2: Independent slots, last successful write wins

**Decision**: Slots `bio`, `openers`, `message`. Update a slot only when that job **completed** with payload (`improved_draft` for bio/message, `openers` len≥1, plus analyze metrics on message). Do not clear other slots. Do not write on `refused=true`. Do not write empty strings over a good slot from a skipped job.

**Rationale**: FR-006, FR-007. Partial P2 turns.

---

## Decision 3: Shared `apply_reply_to_kit` for agent + dedicated

**Decision**: `backend/app/kit.py` `apply_reply_to_kit(store, session_id, reply) -> list[str]` of slot names written. Call from `_run` and `run_agent` / agent router after success. Dedicated rewrite-bio / analyze-message / openers included.

**Rationale**: FR-009. One write path.

**Alternatives considered**: Only `/agent` writes — Bio Studio refine would desync.

---

## Decision 4: `CoachReply.kit_updated: list[str] | null`

**Decision**: Additive field e.g. `["bio","openers"]`. Ask Coach shows Vietnamese: “Đã lưu vào Bio Studio và Gợi ý opener trong phiên này.” Never “đã đăng Tinder”.

**Rationale**: FR-008, SC-007.

---

## Decision 5: Frontend hydrate on view mount + after agent

**Decision**: `SessionContext` holds `kit` + `refreshKit()`. BioStudio / Openers / Message on mount and when `kit` changes: if slot filled, set local draft/result state and show banner “Đã điền từ phiên coach”. User can still edit and re-run dedicated generate.

**Rationale**: Switching modes remounts views today (`App.tsx` switch). Context + GET survives remount.

---

## Decision 6: New session empties kit

**Decision**: `SessionStore.create()` starts `kit` empty. `resetSession` / `createNewSession` fetches new empty kit. DELETE session drops it.

---

## Decision 7: Tests

**Decision**: `tests/unit/test_kit.py` apply rules. `tests/contract/test_session_kit.py`: GET empty, agent rewrite fills bio, two-job fills bio+openers, GET after, safety refuse leaves kit empty, new session empty. No extra LLM beyond existing stubs.
