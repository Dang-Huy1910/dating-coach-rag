# Implementation Plan: Dating Coach RAG (MVP Coaching Chat)

**Branch**: `001-dating-coach-rag` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-dating-coach-rag/spec.md`

## Summary

Ship a personal dating-communication coach: a **FastAPI** service is the system of record for ephemeral sessions, grounded Q&A, bio rewrite, message analysis, and openers. Retrieval uses **local sentence-transformers + FAISS** over a small curated Markdown corpus. Generation uses **Groq** (Gemini optional via env). A **Streamlit** chat is a thin client. Safety refusals, citations, and a not-therapy disclaimer are mandatory. No auth, no database, no matchmaking.

## Technical Context

**Language/Version**: Python 3.12

**Primary Dependencies**: FastAPI, Uvicorn, Pydantic v2, sse-starlette, sentence-transformers (`all-MiniLM-L6-v2`), faiss-cpu, groq, python-dotenv, pydantic-settings, Streamlit, httpx

**Storage**: In-process session dict (ephemeral). Markdown corpus `data/knowledge/`. FAISS index + sidecar metadata `data/index/`. No RDBMS.

**Testing**: pytest, pytest-asyncio, httpx `TestClient`, golden fixtures with mocked LLM by default

**Target Platform**: Linux laptop / local demo (`127.0.0.1`). Optional later deploy of the same API.

**Project Type**: Web service (backend core) + thin web UI

**Performance Goals**: Single demo user. Complete ask/bio/message task in under 5 minutes including reading (SC-008). JSON ask path preferred for tests; SSE optional for UI.

**Constraints**: RAG-grounded answers; cite or refuse; no invented studies/clinical claims; ephemeral PII; Vietnamese UX copy; English identifiers; one LLM provider in the default path; no auth suite

**Scale/Scope**: One demo user, five starter guides, in-memory sessions (max 50 turns), top_k=4 chunks, retrieval min score 0.35

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Spec-First | Feature `spec.md` exists before application code; this `plan.md` before implement | PASS — spec + plan artifacts only |
| II. RAG-Grounded Coaching | Retrieve-then-generate; citations; refuse/hedge on weak retrieval; no invented studies | PASS — FAISS retrieve, score gate 0.35, citation schema, golden refuse case |
| III. Backend-First | FastAPI is system of record; Streamlit only HTTP client | PASS — UI has no direct LLM calls |
| IV. Safety, Ethics & Privacy | Coach only; refuse matchmaking/NSFW/therapy; ephemeral sessions; disclaimer | PASS — SafetyVerdict + FR-009/011/012 in API |
| V. Solo YAGNI | Local FAISS, one default LLM, no auth/admin/hybrid search | PASS — in-memory sessions, no extra search stack |

Post-design re-check: contracts expose coaching resources only (no match, no history store, no ingest-upload API). Ingest is a local CLI. Gates still PASS. Complexity Tracking remains empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-dating-coach-rag/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
├── spec.md
├── checklists/
└── tasks.md              # /speckit-tasks — not created by /speckit-plan
```

### Source Code (repository root)

```text
pyproject.toml
.env.example
backend/
  app/
    main.py                 # FastAPI app factory
    config.py               # pydantic-settings
    api/
      router.py             # /health, /v1/*
    models.py               # Pydantic schemas matching OpenAPI
    session_store.py
    safety.py
    coach.py                # orchestrate retrieve → prompt → generate
    prompts.py
    rag/
      ingest.py             # CLI + library
      chunk.py
      embed.py
      index.py
      retrieve.py
frontend/
  app.py                    # Streamlit thin client
data/
  knowledge/                # starter Markdown guides
  index/                    # generated FAISS + meta (gitignored binaries)
tests/
  contract/
  integration/
  golden/
  unit/
```

**Structure Decision**: Single Python repo (web service + thin UI), not a Node frontend and not a monorepo of many packages. Backend owns all coaching logic; `frontend/app.py` only calls HTTP.

## Complexity Tracking

> No constitution violations requiring justification.
