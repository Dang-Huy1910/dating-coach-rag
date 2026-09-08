# Implementation Plan: Multi-Step Coach Agent (P2)

**Branch**: `009-multi-step-agent` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-multi-step-agent/spec.md`

## Summary

Extend the P1 unified-chat `/agent` path so **one message can run 1–4 existing `handle()` jobs in order** (e.g. `rewrite_bio` then `openers`). No LangGraph, no new coaching domain, no simulation.

Classifier returns an ordered unique intent list (max 4). `run_agent()` executes each job, passing `improved_draft` into later opener/analyze steps. `CoachReply` gains optional `steps[]` for UI. Single-intent messages stay P1-compatible. Dedicated endpoints unchanged.

## Technical Context

**Language/Version**: Python 3.12 (backend); TypeScript + React 18 (thin UI)

**Primary Dependencies**: Existing stack only — FastAPI, Pydantic v2, FAISS, Groq/Gemini via `complete()`. **No** LangGraph, LangChain agents, CrewAI.

**Storage**: Unchanged in-process `SessionStore`. One `Turn` per user message (combined reply). No step archive table.

**Testing**: pytest, TestClient, golden fixtures with mocked classifier + per-job `complete()`. Contract + unit plan parse + golden two-job / P1 regression / safety.

**Target Platform**: Linux laptop / local demo (`127.0.0.1:8000`, `:5173`).

**Project Type**: Web service + thin web UI

**Performance Goals**: Single demo user. Two-job sitting including reading under five minutes (SC-007). Worst case: 1 classifier `complete()` + up to 4 `handle()` generates.

**Constraints**: Safety before any job; RAG per job via existing `handle()`; cap 4; copy-ready only; constitution II–V; P1 one-job regression.

**Scale/Scope**: Extend `backend/app/agent/classify.py` + `run.py`, additive `steps` on `CoachReply`, Ask Coach step chips + optional SSE `step` events. No new nav, no new vector store.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Spec-First | spec.md + this plan.md before application code | PASS |
| II. RAG-Grounded | Each job calls existing `handle()`; no free-form ungrounded chain | PASS |
| III. Backend-First | `/agent` remains system of record; UI HTTP-only | PASS |
| IV. Safety | `screen()` before the plan; no scrape/match/send | PASS |
| V. YAGNI | Ordered list + loop; no agent framework | PASS — complexity justified: P1 explicitly deferred two-job messages |

Post-design re-check: additive `steps` on CoachReply; `/ask` and dedicated routes untouched. Gates still PASS.

## Project Structure

### Documentation (this feature)

```text
specs/009-multi-step-agent/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/openapi.yaml
├── spec.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/app/agent/
  classify.py          # intents[] (1–4), needs_draft; keep single-intent parse fallback
  run.py               # loop handle(); pass improved_draft; merge CoachReply + steps
  extras.py            # unchanged
backend/app/models.py # AgentStep; CoachReply.steps optional
backend/app/api/router.py  # optional SSE event "step"; JSON still default
frontend/src/api/types.ts
frontend/src/views/AskCoachView.tsx          # render steps; keep copy-ready cards
frontend/src/components/RoutedIntentBadge.tsx  # reuse labels; optional StepList
tests/unit/test_agent_classify.py             # extend parse for intents[]
tests/unit/test_agent_run.py                  # NEW merge / cap / skip-after-needs-draft
tests/contract/test_agent.py
tests/golden/test_agent_golden.py
```

**Structure Decision**: Same 008 layout. P2 is a loop around P1 jobs, not a new service.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
