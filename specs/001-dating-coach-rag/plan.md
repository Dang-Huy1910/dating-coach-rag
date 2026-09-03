# Implementation Plan: Dating Coach RAG (MVP Coaching Chat)

**Branch**: `001-dating-coach-rag` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-dating-coach-rag/spec.md`

## Summary

Ship a personal dating-communication coach: a **FastAPI** service is the system of record for ephemeral sessions, grounded Q&A, bio rewrite, message analysis, and openers. Retrieval uses **local sentence-transformers + FAISS** over a small curated Markdown corpus. Generation uses **Groq or Gemini** via env. The demo UI is a thin **React** (Vite) client that only calls the API. A Streamlit `frontend/app.py` may remain as a stopgap until React ships. Safety refusals, citations, and a not-therapy disclaimer are mandatory. No auth, no database, no matchmaking.

## Technical Context

**Language/Version**: Python 3.12

**Primary Dependencies**: FastAPI, Uvicorn, Pydantic v2, sse-starlette, sentence-transformers (`all-MiniLM-L6-v2`), faiss-cpu, groq, python-dotenv, pydantic-settings, httpx. UI: React + Vite (HTTP client only). Streamlit optional stopgap.

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
| III. Backend-First | FastAPI is system of record; React (or stopgap Streamlit) only HTTP client | PASS — UI has no direct LLM calls |
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
  app.py                    # Streamlit stopgap until React
  # Target UI (Antigravity / later): Vite + React talking to :8000
  # CORS already allows localhost:5173
data/
  knowledge/                # starter Markdown guides
  index/                    # generated FAISS + meta (gitignored binaries)
tests/
  contract/
  integration/
  golden/
  unit/
```

**Structure Decision**: Python backend remains the product core (`backend/`). Demo UI target is a **thin React app** (Vite, port 5173) that only calls `http://127.0.0.1:8000`. React is implemented separately (Stitch → Antigravity). Streamlit `frontend/app.py` is a temporary demo client, not the destination UI.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| React (Node) UI instead of Streamlit-only | Builder will design screens in Stitch and implement in Antigravity; portfolio UI should be a real web client | Streamlit is enough for API demo but not for the intended FE workflow |


