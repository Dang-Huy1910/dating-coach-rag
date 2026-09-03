# Data Model: Dating Coach RAG (MVP)

**Branch**: `001-dating-coach-rag` | **Date**: 2026-09-03  
**Source entities**: `spec.md` Key Entities

Persistence: **in-process only** for sessions; **files** for knowledge + FAISS index. No relational database in v1.

---

## CoachingSession

A short-lived conversation for one demo user.

| Field | Type | Rules |
|-------|------|--------|
| `id` | UUID string | Generated on create; unique in the running process |
| `created_at` | datetime (UTC) | Set on create |
| `updated_at` | datetime (UTC) | Bumped on each turn |
| `messages` | list[Turn] | Recent turns only; no durable archive |
| `disclaimer_shown` | bool | True after session create response includes disclaimer |

**Lifecycle**: `created` → `active` (one or more turns) → `expired` (process restart or explicit delete). No pause/resume across restarts.

**Validation**:
- `id` required on subsequent calls; unknown id → not found
- Max 50 turns retained in memory; older turns dropped from the head (still ephemeral)

---

## Turn

One user message plus the coach reply.

| Field | Type | Rules |
|-------|------|--------|
| `id` | UUID string | Unique within session |
| `role_user_text` | string | Trimmed; 1–8000 characters after trim |
| `intent` | enum | `ask` \| `rewrite_bio` \| `analyze_message` \| `openers` |
| `reply_text` | string | Coach-facing text (Vietnamese or user language) |
| `refused` | bool | True when safety or weak-retrieval refusal |
| `hedged` | bool | True when retrieval is weak but a limited craft-only reply is allowed |
| `citations` | list[Citation] | Empty when refused for no-knowledge or safety (no fake sources) |
| `disclaimer` | string | Short not-therapy line included with the reply payload |

**Validation**:
- Empty / whitespace-only `role_user_text` rejected
- `intent` inferred from path (dedicated endpoints) or explicit field

---

## Citation

Human-readable pointer to a knowledge chunk used in the reply.

| Field | Type | Rules |
|-------|------|--------|
| `source_id` | string | Stable id of the knowledge file/section |
| `title` | string | Display title (may be Vietnamese) |
| `heading` | string \| null | Section heading if chunked by heading |
| `path` | string | Repo-relative path, e.g. `data/knowledge/01-profile-bio.md` |
| `score` | float | Retrieval score in `[0, 1]` after normalization |

**Rules**: Never invent citations. If no chunk used, `citations` is `[]`.

---

## KnowledgeSource

A curated Markdown guide on disk.

| Field | Type | Rules |
|-------|------|--------|
| `source_id` | string | Filename stem, e.g. `01-profile-bio` |
| `title` | string | From first H1 |
| `path` | string | Under `data/knowledge/` |
| `body` | Markdown string | Builder-owned; ethically sourced |

**Starter set (required for MVP)**:
- `01-profile-bio.md` — profile/bio writing
- `02-openers.md` — first messages / openers
- `03-pacing.md` — conversation pacing
- `04-boundaries.md` — boundaries & consent basics (non-clinical)
- `05-red-flags.md` — informational red flags (not diagnostic)

---

## KnowledgeChunk

Embeddable slice of a source.

| Field | Type | Rules |
|-------|------|--------|
| `chunk_id` | string | `{source_id}#{n}` |
| `source_id` | string | FK to KnowledgeSource |
| `heading` | string \| null | Nearest heading |
| `text` | string | 400–800 characters target |
| `embedding` | float[384] | L2-normalized MiniLM vector |
| `path` | string | Source path for citations |

**Index**: FAISS `IndexFlatIP` over normalized vectors; sidecar `data/index/meta.json`.

---

## SafetyVerdict

Result of input (and optional output) screening.

| Field | Type | Rules |
|-------|------|--------|
| `allowed` | bool | If false, do not retrieve-for-advice as requested |
| `category` | enum \| null | `matchmaking` \| `nsfw_companion` \| `therapy` \| `coercion` \| `scrape` \| null |
| `user_message` | string | Vietnamese refusal copy |

**Transitions**: any intent → `blocked` short-circuits generation of forbidden help. Generic coaching may still be offered only when the category is `matchmaking` and the user also asked a generic opener question (spec US4 scenario 2).

---

## Disclaimer

Standing notice, not a stored row.

| Field | Type | Rules |
|-------|------|--------|
| `text` | string | Vietnamese, short; not therapy, not matchmaking |
| `surface` | — | Returned on `POST /v1/sessions` and included on every coach reply |

---

## Relationships

```text
CoachingSession 1──* Turn
Turn 0──* Citation
Citation *──1 KnowledgeChunk
KnowledgeChunk *──1 KnowledgeSource
Turn 1──0..1 SafetyVerdict   (computed, not persisted)
```

---

## Validation summary (from spec)

| Rule | Where |
|------|--------|
| No account | Session has no user_id |
| Ephemeral | No disk write of Turn text |
| Cite or refuse | `citations` XOR honest refuse/hedge for factual coaching |
| Length | User text 1–8000 chars; oversize → 400 ask to shorten |
| Starter corpus | Five sources must exist before demo |
