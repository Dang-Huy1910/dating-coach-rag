# Data Model: Coach Router Agent (P1)

**Branch**: `008-coach-router-agent` | **Date**: 2026-09-08  
**Source entities**: `spec.md` Key Entities

Persistence: **unchanged** — in-process sessions; knowledge + FAISS on disk. Routing is not a durable entity.

---

## AgentRequest (request DTO)

Unified-chat user message. **Not stored as its own row**; the sitting records a normal `Turn` after `handle()`.

| Field | Type | Rules |
|-------|------|--------|
| `message` | string | Required; trim; 1–8000 chars. Whitespace-only → 400 `empty_input` |
| `stream` | bool | Optional, default `false`. JSON is the test surface |

**Not this entity**: screenshot list, handle/url form fields, simulation persona id.

---

## RoutingDecision (computed, not persisted)

Result of `agent.classify` **after** safety screen, **before** `handle()`.

| Field | Type | Rules |
|-------|------|--------|
| `intent` | Intent | One of `ask` \| `rewrite_bio` \| `analyze_message` \| `openers` \| `profile_context` |
| `needs_draft` | bool | True when the chosen specialized intent has no usable paste/context |
| `blocked` | bool | True when safety refused; skip classify |
| `safety` | SafetyVerdict \| null | Set when blocked |

**Transitions**:

```text
message
  → empty/too long: HTTP 400 (no RoutingDecision)
  → index not ready: same as /ask (400), except safety-blocked may still 200 refuse
  → safety.screen
        → blocked: RoutingDecision(blocked=true, intent=ask) → CoachReply refused
        → classify JSON (allowlisted)
              → invalid → intent=ask, needs_draft=false
              → needs_draft=true → 200 ask-to-paste CoachReply (no handle() generate)
              → else → handle(intent, extras)
```

Order: **safety before classify**. Invalid classifier output **never** invents a sixth intent.

---

## Routed Capability (user-visible)

`CoachReply.intent` **is** the routed capability. No extra persisted field.

| `intent` | Vietnamese label (UI) |
|----------|------------------------|
| `ask` | Hỏi coach |
| `rewrite_bio` | Sửa bio |
| `analyze_message` | Phân tích tin nhắn |
| `openers` | Gợi ý opener |
| `profile_context` | Profile công khai |

UI maps this enum; backend does not send a separate label string (YAGNI). Reviewers still satisfy SC-009 because the badge is visible.

---

## Capability Outcome

Reuse `CoachReply` from 001/003. Agent path MUST populate the same fields the dedicated path would for that intent:

| Intent | Must populate (when not refused / not needs-draft) |
|--------|------------------------------------------------------|
| `ask` | `reply`, `citations` or hedge/refuse |
| `rewrite_bio` | `reply`, `improved_draft`, `analysis_points` when generate succeeds |
| `analyze_message` | `reply`, `improved_draft`, `tone`, `clarity`, `risk` |
| `openers` | `reply`, `openers` (at least two when generate succeeds) |
| `profile_context` | `reply`; `openers` when library supports; citations from library paths only |

Needs-draft reply: `reply` asks for paste; `improved_draft`/`openers` null; `refused=false`; `hedged=true`; `citations=[]`.

Safety refuse: `refused=true`; `citations=[]`.

---

## CoachingSession / Turn

Unchanged from 001. `Turn.intent` stores the routed capability so follow-up history shows `User (rewrite_bio): …`. No `route_trace` or tool-call list on the turn.

**Lifecycle**: `created` → `active` → `expired`. Classifier tokens are not stored.

---

## Validation rules (from spec)

- Exactly one intent per successful agent turn
- `profile_context` from agent: `visible_text` = message; optional YouTube/Reddit URL extracted from the message; no images
- Simulation is not an `Intent` value on this path
- Analytics emit (if enabled) uses the **routed** intent, same as dedicated endpoints
