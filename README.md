# Dating Coach RAG

Personal project: an **AI Dating Coach chatbot** powered by **RAG + Backend API**.

Not a Tinder clone. Not an AI girlfriend. This is a coach that helps with profiles, openers, and message analysis — grounded in a curated knowledge base.

## Product in one sentence

> Chatbot hỗ trợ hẹn hò thông minh: tư vấn profile, gợi ý cách nhắn tin và phân tích hội thoại bằng RAG từ knowledge base đã kiểm duyệt.

## Run locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
# Optional semantic embeddings (downloads MiniLM): pip install -e ".[embed]"
cp .env.example .env   # set GROQ_API_KEY
DATING_COACH_EMBEDDER=hash python -m backend.app.rag.ingest
# or DATING_COACH_EMBEDDER=minilm after installing .[embed]
```

API (system of record):

```bash
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Thin chat UI:

```bash
streamlit run frontend/app.py
```

Tests (LLM mocked; hash embedder):

```bash
DATING_COACH_EMBEDDER=hash pytest
```

See `specs/001-dating-coach-rag/quickstart.md` for the golden demo sitting.

## Scope v1 (in)

- RAG over curated dating guides (Markdown)
- Backend API (FastAPI): session, ask, rewrite-bio, analyze-message, openers
- Minimal chat UI (Streamlit)
- Cite sources; refuse / hedge when knowledge is missing
- Safety: no matchmaking of real people, no NSFW companion, no therapy claims

## Scope v1 (out)

- Swipe / match / map / payments
- Real-user social graph
- Voice, WhatsApp, mobile app
- 18+ companion / NSFW roleplay

## Stack

| Layer | Choice |
|-------|--------|
| RAG | Chunk → MiniLM → FAISS (local) → retrieve → Groq |
| Backend | FastAPI + optional SSE |
| LLM | Groq (`llama-3.3-70b-versatile`) |
| UI | Streamlit (HTTP client only) |

## Spec Kit

Feature artifacts: `specs/001-dating-coach-rag/`. Constitution: `.specify/memory/constitution.md`.
