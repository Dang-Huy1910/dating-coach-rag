# Spec Kit — Start Here

Run these from a Grok session whose **cwd is this repo** (`dating-coach-rag`).

Constitution is already seeded in `.specify/memory/constitution.md`. You can refine it, or skip straight to specify if you accept the seed.

---

## Step 0 (optional) — refine constitution

```
/speckit-constitution
```

Paste or say:

> Dating Coach RAG is a solo personal project. Principles: (1) Spec-first — no app code before constitution + feature spec + plan for the MVP slice. (2) RAG-grounded coaching — answers must retrieve from curated knowledge; refuse when unsupported; cite sources. (3) Backend-first — FastAPI is the product core; UI is a thin Streamlit client. (4) Safety & ethics — coach only, no matchmaking real people, no NSFW companion, no clinical therapy claims, minimize PII retention. (5) Solo YAGNI — v1 is coach chat + bio/message help + local FAISS; no swipe app, auth suite, or mobile. Prefer Vietnamese UX copy where natural; keep code/identifiers in English.

---

## Step 1 — create the feature specification (do this next)

```
/speckit-specify
```

Paste this description (what/why only — Spec Kit will ask about tech in plan later):

> Build Dating Coach RAG, a personal AI dating coach chatbot (not a dating app). Users chat with a coach that helps with profile/bio writing, first-message openers, and analyzing/rewriting message drafts. Answers must be grounded via RAG over a curated knowledge base of dating communication guides. Core value is a Backend API (chat session, ask, analyze-message) with streaming responses and source citations; UI is a minimal chat client for demo. When the knowledge base has no support, the coach must clearly say it cannot advise rather than invent facts or clinical guidance. Out of scope for this first feature: user matching, swipe UI, payments, voice, WhatsApp, real-user social graph, NSFW AI companion, therapy diagnosis, and heavy admin/auth. Success for MVP: a user can (1) ask a coaching question and get a cited answer, (2) submit a bio draft and get rewrite suggestions, (3) paste a message draft and get tone/clarity feedback with a revised version.

---

## Step 2+ (after specify)

| Order | Command | Purpose |
|------:|---------|---------|
| 2 | `/speckit-clarify` | Optional — resolve up to 5 ambiguities |
| 3 | `/speckit-plan` | Tech plan (FastAPI, FAISS, LLM, Streamlit) |
| 4 | `/speckit-checklist` | Optional quality gate |
| 5 | `/speckit-tasks` | Ordered implementation tasks |
| 6 | `/speckit-analyze` | Optional consistency check |
| 7 | `/speckit-implement` | Build code from tasks |

---

## Notes

- Prefer working in this repo only; do not invent university-chatbot scope.
- Product context lives in `docs/PRODUCT_BRIEF.md`.
- After `/speckit-specify`, feature artifacts appear under `specs/`.
