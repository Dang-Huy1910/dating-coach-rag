# Data Model: Multi-Step Coach Agent (P2)

**Branch**: `009-multi-step-agent` | **Date**: 2026-09-08

Persistence: unchanged. Plan is computed per request, not stored as its own row.

---

## AgentRequest

Unchanged from 008: `message` 1–8000, `stream` default false.

---

## JobPlan (computed)

| Field | Type | Rules |
|-------|------|--------|
| `intents` | list[Intent] | 1–4, unique, allowlisted; empty → `["ask"]` |
| `needs_draft` | bool | True when a specialized job lacks usable paste |
| `blocked` | bool | Safety refuse; skip plan |
| `safety` | SafetyVerdict \| null | Set when blocked |

**Normalize**:

```text
raw JSON intents[] or legacy intent
  → filter allowlist
  → unique preserve order
  → cap 4
  → if draft-job and openers: draft-job before openers
  → if ask with others: ask last
  → if empty: ["ask"]
```

**Transitions**: same as 008 safety-first, then classify, then execute 1..n handle() calls.

---

## AgentStep (response DTO, optional list)

| Field | Type | Rules |
|-------|------|--------|
| `intent` | Intent | One of the five existing |
| `status` | enum | `completed` \| `skipped_needs_draft` \| `refused` |
| `label` | string | Vietnamese label (server-filled so UI need not map) |

Not persisted. 1–4 items on a P2 reply. P1 single-job SHOULD still send a one-item `steps` list for a consistent UI (allowed to omit for old fixtures).

---

## CoachReply (additive)

Existing fields unchanged. New:

| Field | Type | Rules |
|-------|------|--------|
| `steps` | list[AgentStep] \| null | Ordered jobs for this turn |

`intent` remains **primary** = `intents[0]` after normalize (usually the draft job). Reviewers use `steps` for SC-005.

---

## Turn

Unchanged schema. `Turn.intent` stores primary intent. Combined `reply_text` is the merged narrative. No `steps` column.

---

## Validation

- Max 4 steps
- Simulation is not an Intent
- Safety block → `steps` empty or omitted; `refused=true`; `citations=[]`
- needs_draft skip → `status=skipped_needs_draft`; no invented `improved_draft`/`openers` for skipped jobs
