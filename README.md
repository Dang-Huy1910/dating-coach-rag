# Dating Coach RAG

Personal project: an **AI Dating Coach chatbot** powered by **RAG + Backend API**.

Not a Tinder clone. Not an AI girlfriend. This is a coach that helps with profiles, openers, and message analysis — grounded in a curated knowledge base.

## Product in one sentence

> Chatbot hỗ trợ hẹn hò thông minh: tư vấn profile, gợi ý cách nhắn tin, phân tích hội thoại, và coach từ bio/caption công khai **đã dán** — RAG từ knowledge base đã kiểm duyệt. Không scrape, không đăng nhập Instagram.

## Run locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
# Optional semantic embeddings (downloads MiniLM): pip install -e ".[embed]"
cp .env.example .env   # set GROQ_API_KEY; optional YOUTUBE_API_KEY for public YouTube fetch
DATING_COACH_EMBEDDER=hash python -m backend.app.rag.ingest
# one-shot path (still supported): dating-coach-ingest
# or DATING_COACH_EMBEDDER=minilm after installing .[embed]
```

### Batch ingest (Luigi)

Dependent batch jobs (Phase A): discover sources → chunk → build FAISS index → write report.
Uses Luigi `--local-scheduler` only (no central planner).

```bash
DATING_COACH_EMBEDDER=hash dating-coach-batch
# or: DATING_COACH_EMBEDDER=hash python -m backend.pipelines.ingest
# full rebuild (clears data/pipeline/ + reports/ingest-report.json, not curated knowledge):
DATING_COACH_EMBEDDER=hash dating-coach-batch --force
```

Artifacts:

- `data/pipeline/extract/manifest.json`
- `data/pipeline/chunks/chunks.jsonl` (+ `skipped.json`)
- `data/pipeline/index/complete.json` (Luigi marker)
- `data/index/index.faiss` + `meta.json` (same index the coaching API uses)
- `reports/ingest-report.json`

One-shot ingest remains available via `dating-coach-ingest` / `python -m backend.app.rag.ingest`.

### Usage analytics (Luigi + SQL)

Phase B — local-only demo (not a server deploy). Second Luigi DAG: Hive-style daily intent mart → Presto-style explore → CSV. DuckDB runs the SQL files under `sql/` (Treasure Data Hive/Presto analog on a laptop).

```bash
dating-coach-analytics --seed          # write demo lake partitions, exit 0
dating-coach-analytics                 # HiveDailyMetrics → PrestoExplore → ExportCsv
dating-coach-analytics --force         # rebuild SQL/export; keeps the event lake
# or: python -m backend.pipelines.analytics …
```

Artifacts:

- `data/lake/events/dt=YYYY-MM-DD/events.jsonl` (bronze; metrics only — no user text)
- `data/warehouse/mart_daily_intent.parquet`
- `data/pipeline/analytics/hive_complete.json` / `presto_result.json` (Luigi markers)
- `reports/analytics/presto_explore.csv` (+ optional `metrics-report.json`)

Phase A vs B: `dating-coach-batch` = knowledge ingest; `dating-coach-analytics` = usage SQL. Not Treasure Data production.

API (system of record):

```bash
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Stopgap UI (Streamlit, until React):

```bash
streamlit run frontend/app.py
```

UI is **React + Vite** (`http://127.0.0.1:5173`), HTTP-only to the API.

```bash
cd frontend && npm run dev -- --host 127.0.0.1 --port 5173
```

After adding knowledge files (including `data/knowledge/07-public-profile-context.md`), re-run ingest.

Tests (LLM mocked; hash embedder):

```bash
DATING_COACH_EMBEDDER=hash pytest
```

Quality + retrieval eval report (portfolio / reviewer sitting):

```bash
DATING_COACH_EMBEDDER=hash python -m backend.app.eval.report
# writes docs/EVAL.md — pass rate, safety refusals, Hit@4 / MRR
```

User RAG uploads (UI **Thư viện**): `.md` `.txt` `.pdf` `.docx` `.html` `.csv` — stored under `data/uploads/`, then re-indexed with curated guides.

See `docs/EVAL.md`, `specs/001-dating-coach-rag/quickstart.md`, `specs/003-public-profile-context/quickstart.md`, and `specs/004-coach-eval-report/`.

## Unified chat / coach agent (P1 + P2) + sitting kit (P3)

**Hỏi coach** is the unified chat: it calls `POST /v1/sessions/{id}/agent`, which safety-screens, classifies into **1–4** existing capabilities (`ask`, `rewrite_bio`, `analyze_message`, `openers`, `profile_context`), then reuses the same `handle()` path for each job in order (for example rewrite bio then openers). Single-job messages still behave like P1. Copy-ready drafts/openers are for the user to paste elsewhere — the app does not send to dating apps. Dedicated Bio / Message / Openers / Profile tabs stay as explicit shortcuts. No LangGraph / multi-agent crew, no second “Agent” nav item.

**Sitting kit (P3)**: after a successful rewrite / openers / message job (unified chat or dedicated screen), artifacts are written into the ephemeral session kit (`GET /v1/sessions/{id}/kit`). Bio Studio, Openers, and Message hydrate from that kit so you do not copy between tabs of this app. A new session starts empty; safety refusals do not fill the kit. The product still never posts or sends to Tinder/Zalo.

## Scope v1 (in)

- RAG over curated dating guides (Markdown)
- Backend API (FastAPI): session, ask, rewrite-bio, analyze-message, openers, **profile-context** (YouTube/Reddit public fetch + paste/screenshots), **agent** (unified-chat router; up to four jobs per turn), **session kit** (ephemeral Bio/Openers/Message artifacts)
- Thin chat UI (React; Streamlit stopgap)
- Cite sources; refuse / hedge when knowledge is missing
- Safety: no matchmaking of real people, no NSFW companion, no therapy claims, no Instagram login

## Scope v1 (out)

- Swipe / match / map / payments
- Real-user social graph / crush dossier
- Scraping Instagram or dating apps; fetching Instagram/TikTok (YouTube Data API and Reddit public JSON only)
- Voice, WhatsApp, mobile app
- 18+ companion / NSFW roleplay

## Stack

| Layer | Choice |
|-------|--------|
| RAG | Chunk → MiniLM → FAISS (local) → retrieve → Groq |
| Backend | FastAPI + optional SSE |
| LLM | Groq or Gemini (env `LLM_PROVIDER`) |
| UI | React + Vite (HTTP only); Streamlit stopgap |

## Spec Kit

Feature artifacts: `specs/001-dating-coach-rag/`, `specs/003-public-profile-context/`, `specs/008-coach-router-agent/`, `specs/009-multi-step-agent/`, `specs/010-session-kit/`. Constitution: `.specify/memory/constitution.md`.
