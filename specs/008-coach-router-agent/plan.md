# Implementation Plan: Coach Router Agent (P1)

**Branch**: `008-coach-router-agent` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-coach-router-agent/spec.md`

## Summary

Add a **P1 router agent**: one unified-chat turn is safety-screened, classified into **exactly one** existing coaching intent, then handed to the current `handle()` path. No tool loop, no multi-agent crew, no LangGraph.

New FastAPI resource `POST /v1/sessions/{id}/agent` is the system of record. Dedicated `/ask`, `/rewrite-bio`, `/analyze-message`, `/openers`, `/profile-context` stay unchanged. The React Ask Coach view becomes the unified chat (HTTP-only) and shows a Vietnamese label for the routed capability.

## Technical Context

**Language/Version**: Python 3.12 (backend); TypeScript + React 18 (thin UI)

**Primary Dependencies**: Existing stack only — FastAPI, Pydantic v2, FAISS, Groq/Gemini via `complete()`. **No** LangGraph, LangChain agents, CrewAI, or extra LLM SDK.

**Storage**: Unchanged — in-process `SessionStore`. Router does not persist a people dossier or a separate routing log.

**Testing**: pytest, TestClient, golden fixtures with mocked LLM (classifier + coach `complete`). Contract + unit classify + golden routing cases.

**Target Platform**: Linux laptop / local demo (`127.0.0.1:8000` API, `:5173` Vite proxy).

**Project Type**: Web service (backend core) + thin web UI

**Performance Goals**: Single demo user. Primary sitting (one ask + one routed rewrite, including reading) under five minutes (SC-010). Classifier is one extra `complete()` call per unified-chat turn, then the existing generate path (one capability).

**Constraints**: RAG-grounded coaching; safety **before** classify; exactly one `handle()` per agent request; Vietnamese UX; English identifiers; constitution II–V; dedicated screens remain.

**Scale/Scope**: One new endpoint, one small `backend/app/agent/` module, Ask Coach UI switch + capability badge. No new vector store, ingest, or simulation entry.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Spec-First | Feature `spec.md` exists before application code; this `plan.md` before implement | PASS — spec + plan artifacts only |
| II. RAG-Grounded Coaching | Retrieve-then-generate from curated corpus; citations; refuse/hedge; routing is not a free-form advisor | PASS — agent calls existing `handle()`; FR-003 |
| III. Backend-First | FastAPI is system of record; React only HTTP | PASS — `/v1/.../agent`; UI does not classify or call the LLM |
| IV. Safety, Ethics & Privacy | Coach only; refuse matchmaking/scrape/therapy; ephemeral; disclaimer | PASS — `safety.screen` before classify; simulation not started from router |
| V. Solo YAGNI | No extra agent framework, no second orchestrator | PASS — constrained JSON classifier + one `handle()` call |

Post-design re-check: contracts expose one additive coaching resource. Existing endpoints stay. No tool loop. Gates still PASS. Complexity Tracking remains empty.

## Project Structure

### Documentation (this feature)

```text
specs/008-coach-router-agent/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
├── spec.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
  app/
    api/router.py                 # add POST /v1/sessions/{id}/agent
    models.py                     # AgentRequest; CoachReply unchanged (intent = routed capability)
    agent/
      __init__.py
      classify.py                 # NEW: safety-aware classify → one Intent or missing-draft
      run.py                      # NEW: classify then handle() with dedicated extras
    coach.py                      # reuse handle(); do not fork a second generate path
    safety.py                     # reuse screen()
    prompts.py                    # classifier system/user prompt; dedicated extras reused
frontend/
  src/
    api/client.ts                 # askAgent()
    api/types.ts                  # AgentRequest
    views/AskCoachView.tsx        # call /agent instead of /ask
    components/CoachBubble.tsx    # optional subtitle from routed intent
    components/RoutedIntentBadge.tsx  # NEW Vietnamese capability label
tests/
  contract/test_agent.py
  golden/test_agent_golden.py
  unit/test_agent_classify.py
```

**Structure Decision**: Keep the 001 layout. Product core stays `backend/`. Router is a thin module that **selects** an existing intent and calls `handle()`. UI change is confined to Ask Coach plus a small badge. Dedicated views stay on their current endpoints.

## Complexity Tracking

> No constitution violations. Table left empty on purpose.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
