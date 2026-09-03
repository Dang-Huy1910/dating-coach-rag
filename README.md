# Dating Coach RAG

Personal project: an **AI Dating Coach chatbot** powered by **RAG + Backend API**.

Not a Tinder clone. Not an AI girlfriend. This is a coach that helps with profiles, openers, and message analysis — grounded in a curated knowledge base.

## Product in one sentence

> Chatbot hỗ trợ hẹn hò thông minh: tư vấn profile, gợi ý cách nhắn tin và phân tích hội thoại bằng RAG từ knowledge base đã kiểm duyệt.

## Scope v1 (in)

- RAG over curated dating guides (Markdown/PDF)
- Backend API (FastAPI): chat + analyze message + session
- Minimal chat UI (Streamlit)
- Cite sources; refuse / hedge when knowledge is missing
- Safety: no matchmaking of real people, no storing intimate user data by default

## Scope v1 (out)

- Swipe / match / map / payments
- Real-user social graph
- Voice, WhatsApp, mobile app
- 18+ companion / NSFW roleplay

## Stack intent (locked later in Spec Kit plan)

| Layer | Preference |
|-------|------------|
| RAG | Chunk → embed → FAISS (local) → retrieve → LLM |
| Backend | FastAPI + streaming |
| LLM | Groq or Gemini (API) |
| UI | Streamlit (thin) |

## Spec Kit workflow

This repo was initialized with [GitHub Spec Kit](https://github.com/github/spec-kit) + **Grok Build** integration.

**Do specs before code.** Suggested order:

1. `/speckit-constitution` — project principles (seed exists; refine if needed)
2. `/speckit-specify` — feature spec from the prompt in `docs/SPECKIT_START.md`
3. `/speckit-clarify` — optional, de-risk ambiguities
4. `/speckit-plan` — tech plan
5. `/speckit-tasks` — task breakdown
6. `/speckit-implement` — build

See:

- `docs/PRODUCT_BRIEF.md` — product vision
- `docs/SPECKIT_START.md` — copy-paste prompts for Spec Kit skills
- `.specify/memory/constitution.md` — non-negotiable principles

## Status

Scaffold + Spec Kit ready. **No application code yet** — start with Spec Kit.
