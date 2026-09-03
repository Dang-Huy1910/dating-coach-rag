# Quickstart: Dating Coach RAG MVP

Validate the feature end-to-end after implementation. Details of types live in [data-model.md](./data-model.md) and [contracts/openapi.yaml](./contracts/openapi.yaml).

## Prerequisites

- Python 3.12
- `GROQ_API_KEY` in `.env` (copy from `.env.example`)
- Repo root as cwd

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
# Optional MiniLM: pip install -e ".[embed]"
cp .env.example .env   # then set GROQ_API_KEY
DATING_COACH_EMBEDDER=hash python -m backend.app.rag.ingest
# Demo quality: DATING_COACH_EMBEDDER=minilm after .[embed]
```

Ingest reads `data/knowledge/*.md` and writes `data/index/` (FAISS + metadata). Re-run after editing guides.

## Run

Terminal A — API (system of record):

```bash
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Terminal B — thin chat UI:

```bash
streamlit run frontend/app.py
```

UI talks only to `http://127.0.0.1:8000`. Open the Streamlit URL, read the disclaimer banner, start chatting.

## Automated checks

```bash
pytest
```

Expected: contract tests against OpenAPI shapes; golden cases with LLM mocked by default.

Live LLM (optional):

```bash
RUN_LIVE_LLM=1 pytest tests/integration -q
```

## Golden demo sitting (SC-007)

Create a session (`POST /v1/sessions` or the UI). Confirm disclaimer is visible.

1. **Cited answer** — Ask a question the starter library covers (e.g. how to write a short dating bio). Expect `refused=false` and at least one citation with a real `path` under `data/knowledge/`.
2. **Refuse when unknown** — Ask something outside the library (e.g. tax law for a wedding). Expect a clear cannot-advise/hedge, empty `citations`, no invented study.
3. **Bio rewrite** — Paste a weak one-line bio. Expect suggestions plus `improved_draft`.
4. **Message rewrite** — Paste an unclear or pushy draft. Expect tone/clarity (and risk if relevant) plus a revised version.

Also spot-check refusals: matchmaking real people, NSFW companion, therapy diagnosis — all `refused=true`.

## Smoke with curl (no UI)

```bash
curl -s http://127.0.0.1:8000/health
SID=$(curl -s -X POST http://127.0.0.1:8000/v1/sessions | python -c "import sys,json; print(json.load(sys.stdin)['id'])")
curl -s -X POST "http://127.0.0.1:8000/v1/sessions/$SID/ask" \
  -H 'content-type: application/json' \
  -d '{"question":"Bio hẹn hò ngắn nên viết thế nào?"}'
```

Expect JSON `CoachReply` with `disclaimer` and either citations or a hedge.

## Done when

- Health reports `index_ready: true`
- Four golden cases pass in one sitting
- Streamlit never calls the LLM provider directly
