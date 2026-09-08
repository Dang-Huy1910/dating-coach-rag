# Research: Multi-Step Coach Agent (P2)

**Branch**: `009-multi-step-agent` | **Date**: 2026-09-08

All Technical Context items resolved. No remaining NEEDS CLARIFICATION.

---

## Decision 1: Extend `/agent` (do not add `/agent/plan`)

**Decision**: Same `POST /v1/sessions/{id}/agent`. Response remains `CoachReply` plus optional `steps`.

**Rationale**: UI already calls `/agent`. A second resource would split P1/P2 clients. Additive field keeps old clients (they ignore `steps`).

**Alternatives considered**:
- New `/agent/run` — extra client work, YAGNI.
- Overload dedicated endpoints — they stay single-intent by contract.

---

## Decision 2: Classifier returns `intents[]` with P1 fallback

**Decision**: Classifier JSON `{ "intents": ["rewrite_bio", "openers"], "needs_draft": false }`. Also accept legacy `{ "intent": "ask" }` so old stubs/tests keep working. Allowlist, unique, preserve order, cap 4. Empty/invalid → `["ask"]`.

**Rationale**: One `complete()` for the plan (YAGNI vs a planner agent). P1 tests that stub `{"intent":"ask"}` must not break.

**Alternatives considered**:
- Second LLM “planner” after classify — extra latency, constitution V.
- Regex split on “rồi/và” — brittle Vietnamese.
- LangGraph state machine — P2 is a list, not a graph.

---

## Decision 3: Deterministic order when the model is messy

**Decision**: After allowlist/unique/cap, if the list has both a draft job (`rewrite_bio` | `analyze_message` | `profile_context`) and `openers`, ensure draft job **before** `openers`. `ask` last if present with others. User-explicit order is kept when already satisfying that (rewrite then openers).

**Rationale**: FR-006 — openers should see `improved_draft`.

**Alternatives considered**:
- Strict user order only — “opener rồi sửa bio” would generate openers from the weak paste.
- Always rewrite first even if user only asked openers — violates FR-007.

---

## Decision 4: Loop `handle()`; merge one CoachReply

**Decision**: For each intent, call existing `handle()` with that intent’s extras. If previous step produced `improved_draft`, later `openers` / `analyze_message` user_text is that draft (plus a short note). Merge:

- `reply`: concatenate step sections with Vietnamese headings
- `citations`: unique by `source_id`+`path`, keep highest score
- `improved_draft`: last non-null from rewrite/analyze
- `openers`: last non-null list with len ≥ 2, else last non-null
- `tone`/`clarity`/`risk`/`analysis_points`: from analyze/rewrite steps
- `intent`: first job in the plan (P1 clients still see a primary intent); `steps` carries the full list
- `refused`: true only if **all** jobs refused or the turn was safety-blocked
- `hedged`: true if any job hedged or skipped for needs_draft

**Rationale**: One chat bubble, several copy-ready cards. Session records one turn with `intent` = primary.

**Alternatives considered**:
- N API responses — breaks thin client.
- Tool-calling Groq native — extra protocol; `handle()` already owns RAG.

---

## Decision 5: needs_draft stops dependent jobs only

**Decision**: `needs_draft` from classifier applies to specialized jobs lacking paste. If the **first specialized** job needs a draft, skip it **and** skip later jobs that depend on a draft (`openers` after rewrite/analyze). Independent `ask` MAY still run. Do not invent drafts.

**Rationale**: FR-009. “Sửa bio rồi opener” with no paste → ask-to-paste, no fake openers.

---

## Decision 6: SSE `step` events, JSON still canonical

**Decision**: When `stream=true`, emit `{event: step, data: AgentStep json}` before each job, then existing citation/token/refusal/done after the merged reply (same as P1: generate is not token-streamed today). Ask Coach may stay on JSON; optional UI can show “Đang sửa bio…”.

**Rationale**: FR-016. Do not invent a new protocol.

---

## Decision 7: UI step chips on Ask Coach

**Decision**: Render `reply.steps` above the bubble (reuse `intentLabel`). If `steps` absent/empty, keep P1 single `RoutedIntentBadge` from `intent`. Copy-ready cards unchanged (already show draft + openers).

**Rationale**: SC-005. No new nav.

---

## Decision 8: Tests

**Decision**: Extend unit parse tests; add `tests/unit/test_agent_run.py` for merge, cap, skip-after-needs-draft, safety short-circuit (no handle). Golden: bio+openers two-job, P1 ask regression, safety, missing draft, over-cap. Stub `classify.complete` with `intents` JSON and `coach.complete` for generate.

**Rationale**: Same 008 stubbing pattern.
