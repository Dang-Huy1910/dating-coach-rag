# Research: Dating Coach RAG (MVP Coaching Chat)

**Branch**: `001-dating-coach-rag` | **Date**: 2026-09-03

All Technical Context unknowns resolved. Stack follows constitution (backend-first, local vector store, one LLM, thin UI) and `docs/SPECKIT_START.md` intent.

---

## Decision: LLM provider = Groq (primary), Gemini optional via env

**Rationale**: README/Spec Kit start already shortlist Groq or Gemini. Groq is low-latency (fits streaming chat demo) and needs only `GROQ_API_KEY`. Default model: `llama-3.3-70b-versatile` with `GROQ_MODEL` override. `LLM_PROVIDER=gemini` + `GEMINI_API_KEY` is a documented fallback, not a second code path in the hot demo.

**Alternatives considered**:
- Gemini-only: fine, but Groq is listed first and is typically faster for token streaming.
- Local GGUF: no GPU assumed on the demo laptop; setup cost violates Solo YAGNI.
- SpaceXAI / OpenAI / Anthropic: not in the locked v1 intent; constitution prefers one provider.

---

## Decision: Embeddings = local sentence-transformers; index = FAISS IndexFlatIP

**Rationale**: Constitution: local vector store (e.g. FAISS). Production path is `all-MiniLM-L6-v2` (384-d) via extra `.[embed]`. Tests and first boot use a token-hash embedder (`DATING_COACH_EMBEDDER=hash`) so CI does not download PyTorch. Normalize vectors and use inner product (= cosine). Persist index + metadata JSON under `data/index/`.

**Alternatives considered**:
- Gemini/OpenAI embeddings: extra key, extra failure mode, not needed at starter-corpus scale.
- Chroma/Qdrant: extra service; FAISS-in-process is enough for <10k chunks.
- Hybrid BM25: constitution forbids extra search complexity until coaching flows work.

---

## Decision: Chunk Markdown by heading, target 400–800 characters, 80-character overlap

**Rationale**: Knowledge is curated Markdown guides. Heading-aware chunks keep “bio” vs “openers” separable for citations. Overlap reduces mid-sentence cuts. Citation payload stores `source_id`, `title`, `heading`, `path`.

**Alternatives considered**:
- Fixed token windows only: worse citations on structured guides.
- Whole-file chunks: too coarse; retrieval cannot distinguish sections.

---

## Decision: Weak retrieval = refuse/hedge when top score < 0.35 or no hits

**Rationale**: Spec FR-005. A numeric gate is testable. Below threshold: no generation of factual dating claims; return a clear Vietnamese refusal/hedge. Bio/message rewrite may still comment on writing craft but MUST NOT invent studies or clinical claims.

**Alternatives considered**:
- Always generate: violates RAG-grounded coaching.
- LLM-only “I don’t know” without a score gate: untestable and easy to skip.

---

## Decision: Sessions = in-process memory, no database, no auth

**Rationale**: Spec FR-001, FR-012; constitution ephemeral by default. `SessionStore` dict keyed by UUID, list of turns, lost on process restart. No Redis, no SQLite history. DELETE session is optional cleanup.

**Alternatives considered**:
- SQLite/Postgres: durable history is out of scope and increases PII risk.
- Cookie auth: no multi-user product in v1.

---

## Decision: FastAPI JSON + SSE streaming on the same ask path

**Rationale**: Product prompt asked for streaming; spec user-visible requirement is “stay in chat and get a complete reply.” Implement `POST /v1/sessions/{id}/ask` with `stream=false` (JSON, easy golden tests) and `stream=true` (`text/event-stream` via `sse-starlette`). Streamlit uses JSON first; can switch to SSE later without changing contracts’ resource model.

**Alternatives considered**:
- WebSockets: more UI complexity than a demo needs.
- SSE-only: harder contract tests; JSON fallback is the test surface.

---

## Decision: Safety = input rules + prompt contract + output check (no ML classifier)

**Rationale**: Forbidden intents are finite (matchmaking, NSFW companion, therapy/diagnosis, coercion). Regex/keyword + structured intent flags + system prompt + a cheap output scan is enough for MVP and is unit-testable. Always attach the not-therapy disclaimer on session create and on replies.

**Alternatives considered**:
- Separate moderation API: extra vendor, extra latency.
- Prompt-only safety: too easy to jailbreak for a dating domain.

---

## Decision: Layout = Python `backend/` + thin React UI (Vite)

**Rationale**: Backend stays the system of record (RAG + safety + LLM). The destination demo UI is React so screens can be designed in Stitch and built in Antigravity without touching coaching logic. Browser talks only to `http://127.0.0.1:8000` (CORS includes `:5173`). Streamlit `frontend/app.py` is a stopgap, not the product UI.

**Alternatives considered**:
- Streamlit-only: fastest API demo, but blocks the intended React/Stitch workflow.
- Streamlit or React calling the LLM directly: violates backend-first.
- Full Next.js + auth: YAGNI for a single demo user.

---

## Decision: Starter corpus lives in `data/knowledge/*.md` (builder-written notes)

**Rationale**: Spec FR-014/FR-015. Five short original Markdown files (bio, openers, pacing, boundaries, informational red flags). No scraping. Ingest CLI rebuilds FAISS.

**Alternatives considered**:
- User upload in v1: out of scope.
- Empty corpus: golden “cited answer” cannot pass.

---

## Decision: Tests = pytest + golden cases (explicitly required)

**Rationale**: Constitution evaluation + spec FR-016/SC-007. Contract tests against OpenAPI; golden fixtures for cite, refuse-when-unknown, bio rewrite, message rewrite, and safety refusals. LLM calls mocked in unit/golden unless `RUN_LIVE_LLM=1`.

**Alternatives considered**:
- No tests until after UI: would miss the mandated golden set.
- Live-LLM-only tests: flaky and costs tokens in CI.

---

## Decision: UX copy Vietnamese; code/identifiers English

**Rationale**: Constitution language constraint. Streamlit labels and refusal strings in Vietnamese. API field names English.
