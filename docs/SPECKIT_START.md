# Spec Kit — Start Here

Run these from a Grok session whose **cwd is this repo** (`dating-coach-rag`).

This guide follows the [Spec Kit](https://github.com/github/spec-kit) **v1.0** SDD quickstart. Grok skills use hyphens (`/speckit-specify`); upstream docs often show dots (`/speckit.specify`) — same commands.

Constitution is already seeded in `.specify/memory/constitution.md`. You can refine it, or skip straight to specify if you accept the seed.

---

## Core workflow

### 1 — Establish principles (one-time)

```
/speckit-constitution
```

Paste or say:

> Dating Coach RAG is a solo personal project. Principles: (1) Spec-first — no app code before constitution + feature spec + plan for the MVP slice. (2) RAG-grounded coaching — answers must retrieve from curated knowledge; refuse when unsupported; cite sources. (3) Backend-first — FastAPI is the product core; UI is a thin Streamlit client. (4) Safety & ethics — coach only, no matchmaking real people, no NSFW companion, no clinical therapy claims, minimize PII retention. (5) Solo YAGNI — v1 is coach chat + bio/message help + local FAISS; no swipe app, auth suite, or mobile. Prefer Vietnamese UX copy where natural; keep code/identifiers in English.

---

### 2 — Create the feature specification (do this next)

```
/speckit-specify
```

Paste this description (what/why only — Spec Kit will ask about tech in plan later):

> Build Dating Coach RAG, a personal AI dating coach chatbot (not a dating app). Users chat with a coach that helps with profile/bio writing, first-message openers, and analyzing/rewriting message drafts. Answers must be grounded via RAG over a curated knowledge base of dating communication guides. Core value is a Backend API (chat session, ask, analyze-message) with streaming responses and source citations; UI is a minimal chat client for demo. When the knowledge base has no support, the coach must clearly say it cannot advise rather than invent facts or clinical guidance. Out of scope for this first feature: user matching, swipe UI, payments, voice, WhatsApp, real-user social graph, NSFW AI companion, therapy diagnosis, and heavy admin/auth. Success for MVP: a user can (1) ask a coaching question and get a cited answer, (2) submit a bio draft and get rewrite suggestions, (3) paste a message draft and get tone/clarity feedback with a revised version.

---

### 3 — Technical plan

```
/speckit-plan
```

Provide stack choices when prompted (intent: FastAPI + streaming, local FAISS RAG, Groq or Gemini, thin Streamlit UI).

---

### 4 — Task breakdown

```
/speckit-tasks
```

---

### 5 — Implement

```
/speckit-implement
```

---

### 6 — Converge

```
/speckit-converge
```

Assess the codebase against spec, plan, and tasks; append any remaining unbuilt work as new tasks.

**Repeat steps 4 and 5** until `/speckit-converge` reports **Converged**.

---

## Optional commands

| When | Command | Purpose |
|------|---------|---------|
| After specify, **before** plan | `/speckit-clarify` | Resolve up to ~5 ambiguities (recommended) |
| After plan / around tasks | `/speckit-checklist` | Quality checklist for requirements completeness |
| After tasks, **before** implement | `/speckit-analyze` | Cross-artifact consistency & coverage |
| After tasks (tracking) | `/speckit-taskstoissues` | Sync tasks to GitHub issues |

Suggested insert points if you use the optionals:

1. constitution → 2. specify → **clarify** → 3. plan → **checklist** → 4. tasks → **analyze** → 5. implement → 6. converge → (loop 4–5)

---

## Notes

- Prefer working in this repo only; do not invent university-chatbot scope.
- Product context lives in `docs/PRODUCT_BRIEF.md`.
- After `/speckit-specify`, feature artifacts appear under `specs/`.
- Opt-in upstream extensions (`bug`, `assess`) are **not** installed here; add later with `specify extension add <name>` if needed.
