# Implementation Plan: Public Profile Context Coaching

**Branch**: `003-public-profile-context` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-public-profile-context/spec.md`

## Summary

Add a **paste-only** coaching path for public-visible social profile context (Instagram as the primary example). The user supplies an optional handle/link **as a label** plus bio/caption text they can already see. A new FastAPI resource `POST /v1/sessions/{id}/profile-context` is the system of record. A deterministic **profile gate** runs before retrieve/generate: handle-only asks for paste; private/locked is out of scope; scrape/crawl and matchmaking are refused. Retrieval stays on the **curated Markdown + FAISS** library — pasted Instagram text is user context, never a live fetch and never a new knowledge corpus. The React UI is a thin HTTP client (new view + nav mode). No Instagram login, Graph API, OAuth, crawler, or durable “crush dossier.”

## Technical Context

**Language/Version**: Python 3.12 (backend); TypeScript + React 18 (thin UI)

**Primary Dependencies**: Existing stack only — FastAPI, Pydantic v2, FAISS, sentence-transformers or hash embedder, Groq/Gemini via env. UI: React + Vite, HTTP client only. **No** Instagram SDK, instaloader, Graph API, Playwright crawl, or OAuth library.

**Storage**: Unchanged — in-process `SessionStore` (ephemeral turns, max 50). Markdown under `data/knowledge/`. FAISS under `data/index/`. No people table, no profile archive on disk.

**Testing**: pytest, TestClient, golden fixtures with mocked LLM by default. New contract + unit gate + golden cases for P1–P3.

**Target Platform**: Linux laptop / local demo (`127.0.0.1:8000` API, `:5173` Vite proxy).

**Project Type**: Web service (backend core) + thin web UI

**Performance Goals**: Single demo user. Happy-path public-paste sitting (including reading) under five minutes (SC-006). JSON only for this endpoint (no SSE in this slice).

**Constraints**: RAG-grounded coaching from the curated library; cite or refuse/hedge; never invent posts/follower counts about a real person; never claim a live profile load; Vietnamese UX; English identifiers; ephemeral PII; constitution IV (no scrape, no matchmaking, no private fetch)

**Scale/Scope**: One new intent, one new endpoint, one React view, one optional knowledge guide (`07-public-profile-context.md`), expanded safety/gate patterns. Existing ask/bio/message/openers unchanged.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Spec-First | Feature `spec.md` exists before application code; this `plan.md` before implement | PASS — spec + plan artifacts only |
| II. RAG-Grounded Coaching | Retrieve-then-generate from curated corpus; citations; refuse/hedge on weak retrieval; no invented facts about the person | PASS — FAISS over `data/knowledge/`; pasted profile is prompt context, not KB; FR-004 in gate + prompt |
| III. Backend-First | FastAPI is system of record; React only HTTP | PASS — new `/v1/.../profile-context`; UI does not call Instagram or the LLM |
| IV. Safety, Ethics & Privacy | Coach only; refuse matchmaking/scrape/private fetch; ephemeral; disclaimer | PASS — profile gate + expanded `safety.screen`; no dossier; disclaimer on every reply |
| V. Solo YAGNI | No auth suite, no crawler, no people DB, no extra search stack | PASS — one endpoint, one gate module, reuse CoachReply |

Post-design re-check: contracts expose coaching only (no match, no history store, no ingest-upload, no Instagram fetch). Ingest remains local CLI. Gates still PASS. Complexity Tracking remains empty.

## Project Structure

### Documentation (this feature)

```text
specs/003-public-profile-context/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
├── spec.md
├── checklists/
│   └── requirements.md
└── tasks.md              # /speckit-tasks — not created by /speckit-plan
```

### Source Code (repository root)

```text
backend/
  app/
    main.py
    config.py
    api/router.py              # add POST /v1/sessions/{id}/profile-context
    models.py                  # ProfileContextRequest; Intent += profile_context
    session_store.py           # unchanged (no crush archive field)
    safety.py                  # expand scrape + matchmaking patterns
    profile_gate.py            # NEW: handle-only / private / scrape classification
    coach.py                   # handle() accepts new intent; prompt extra
    prompts.py                 # profile_context rules
    rag/                       # unchanged retrieve/ingest; optional new MD source
frontend/
  src/
    api/client.ts              # coachFromProfileContext()
    api/types.ts               # Intent + ProfileContextRequest
    App.tsx                    # new mode
    components/Header.tsx      # AppMode += profile
    views/ProfileContextView.tsx  # NEW thin form
    views/WelcomeView.tsx      # entry card
data/
  knowledge/
    07-public-profile-context.md  # NEW builder-written guide (not scraped posts)
tests/
  contract/test_profile_context.py
  golden/test_profile_context_golden.py
  unit/test_profile_gate.py
  unit/test_safety.py          # extra scrape/IG/matchmaking cases
```

**Structure Decision**: Keep the 001 layout. Product core stays `backend/`. This slice adds one router path, one small `profile_gate` module (deterministic, unit-testable), schema/intent extension, an optional knowledge file, and one React view that only calls the API. No new service, database, or third-party social client.

## Complexity Tracking

> No constitution violations. Table left empty on purpose.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
