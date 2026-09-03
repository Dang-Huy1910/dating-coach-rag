# Dating Coach RAG Constitution

## Core Principles

### I. Spec-First (NON-NEGOTIABLE)

No application feature code until the relevant Spec Kit artifacts exist for that slice: constitution (this file), feature `spec.md`, and `plan.md`. Tasks and implementation follow the plan. Spikes to learn an API are allowed only if isolated and discarded or documented; they must not become the product by default.

**Rationale**: Solo projects fail by coding before scope is clear. Spec Kit is the delivery process for this repo.

### II. RAG-Grounded Coaching

Coaching answers MUST be grounded in retrieved knowledge from a curated corpus. The system MUST cite sources used. If retrieval is empty or weak, the coach MUST refuse or clearly hedge — no invented studies, statistics, or clinical claims. Prompting MUST discourage harmful, coercive, or deceptive dating advice.

**Rationale**: Trust and portfolio quality come from retrieval discipline, not free-form LLM chat.

### III. Backend-First Product Core

The FastAPI (or equivalent) backend is the system of record for chat, analysis, and ingestion. The UI is a thin **React** client that talks to the API over HTTP only — no direct LLM, FAISS, or knowledge-base access from the browser. New capabilities ship as API endpoints first; UI follows only when needed for demo.

**Rationale**: Matches the builder’s strengths (RAG + Backend). React is the demo UI so screens can be designed (Stitch) and implemented separately without changing the coaching core.

### IV. Safety, Ethics & Privacy

This product is a **coach**, not a matchmaker of real people and not an intimate AI companion. Forbidden in v1: swipe/match of real users, NSFW roleplay companion, deepfake, scraping private profiles, clinical therapy/diagnosis claims. Minimize retention of personal/intimate message content; prefer ephemeral session memory unless the user explicitly opts into history. Always surface a short disclaimer that the bot is not a substitute for professional mental-health care.

**Rationale**: Dating domains are sensitive; clear boundaries protect users and keep the academic/portfolio framing clean.

### V. Solo YAGNI Simplicity

Prefer the smallest stack that demonstrates RAG + API well: local vector store (e.g. FAISS), one LLM provider, thin UI. Do not add auth suites, ticketing, mobile apps, multi-tenant admin, or hybrid search until MVP coaching flows work end-to-end. Complexity requires explicit justification in the plan.

**Rationale**: One person must ship a demoable MVP.

## Product Constraints

- **Domain**: Dating communication coaching (bio, openers, message analysis, general advice from KB).
- **Languages**: Vietnamese-friendly UX copy where natural; code, APIs, and identifiers in English.
- **Knowledge**: Only curated, ethically sourced materials under project data paths — no silent scraping of paid dating apps.
- **Evaluation**: MVP must include a small set of golden questions/cases (correct cite, refuse-when-unknown, bio rewrite, message rewrite).

## Development Workflow

1. Refine constitution only when principles change; bump version below.
2. `/speckit-specify` → optional `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → optional analyze/checklist → `/speckit-implement`.
3. Keep README and `docs/PRODUCT_BRIEF.md` aligned with shipped scope.
4. Prefer small, reviewable commits after Spec Kit milestones.

## Governance

This constitution supersedes informal preferences and README slogans when they conflict. Amendments require updating this file (version bump + date) and a short note in the commit message. Any plan that violates Principles II–IV MUST be rejected or rewritten before implementation.

**Version**: 1.1.0 | **Ratified**: 2026-09-03 | **Last Amended**: 2026-09-03

**1.1.0**: Principle III — thin UI is React (HTTP-only), not Streamlit.
