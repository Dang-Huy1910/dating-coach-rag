# Data Model: Session Coaching Kit (P3)

**Branch**: `010-session-kit` | **Date**: 2026-09-08

Persistence: RAM only, tied to `CoachingSession`.

---

## SessionKit (session field)

| Slot | Fields | Written when |
|------|--------|----------------|
| bio | `improved_bio: str \| None`, `analysis_points: list[str] \| None`, `source_intent: str \| None` | `intent` rewrite_bio (or steps include completed rewrite_bio) and `improved_draft` non-empty and not refused |
| openers | `openers: list[str]`, `source_intent: str \| None` | completed openers (or profile_context with openers) and list non-empty and not refused |
| message | `improved_message: str \| None`, `tone`, `clarity`, `risk`, `source_intent` | completed analyze_message and `improved_draft` non-empty and not refused |

| Field | Type | Rules |
|-------|------|--------|
| `updated_at` | datetime \| null | Last successful slot write |

**Empty kit**: all artifact fields null/empty lists.

**Independence**: writing bio does not null openers.

**Safety**: `reply.refused` → apply is a no-op.

**Skip**: `steps` status `skipped_needs_draft` / `refused` → do not write that step’s slot.

---

## SessionKitResponse (GET)

JSON mirror of SessionKit for the client. 404 if session missing. 200 with empty slots if session exists but unused.

---

## CoachReply (additive)

| Field | Type | Rules |
|-------|------|--------|
| `kit_updated` | list[str] \| null | Subset of `bio`, `openers`, `message` written this turn |

---

## CoachingSession

Add `kit: SessionKit`. Turns unchanged. Kit is not a Turn.

**Lifecycle**: create empty → writes → DELETE/process restart gone.

---

## Validation

- Strings trimmed; ignore whitespace-only drafts
- Openers: keep order, drop blanks; write if ≥1 (UI still prefers ≥2 from coaching rules)
- No image bytes, no social URLs as knowledge paths, no people table
