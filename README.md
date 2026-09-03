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
# or DATING_COACH_EMBEDDER=minilm after installing .[embed]
```

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

See `specs/001-dating-coach-rag/quickstart.md` and `specs/003-public-profile-context/quickstart.md`.

## Scope v1 (in)

- RAG over curated dating guides (Markdown)
- Backend API (FastAPI): session, ask, rewrite-bio, analyze-message, openers, **profile-context** (YouTube/Reddit public fetch + paste/screenshots)
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

Feature artifacts: `specs/001-dating-coach-rag/`, `specs/003-public-profile-context/`. Constitution: `.specify/memory/constitution.md`.
