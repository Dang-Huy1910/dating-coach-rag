# Quickstart: Coach Router Agent (P1)

Validate this feature after implementation. Types live in [data-model.md](./data-model.md); HTTP shapes in [contracts/openapi.yaml](./contracts/openapi.yaml).

## Prerequisites

- Python 3.12, repo root as cwd
- `.env` with `GROQ_API_KEY` **or** `LLM_PROVIDER=gemini` + `GEMINI_API_KEY` (same as 001)
- Index built (`DATING_COACH_EMBEDDER=hash python -m backend.app.rag.ingest`)

## Setup

```bash
source .venv/bin/activate
pip install -e ".[dev]"
DATING_COACH_EMBEDDER=hash python -m backend.app.rag.ingest
```

## Run

Terminal A — API:

```bash
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Terminal B — React (HTTP only via Vite proxy):

```bash
cd frontend && npm run dev -- --host 127.0.0.1 --port 5173
```

Open **Hỏi coach**. Confirm the standing disclaimer. There must be **no** new “Agent” nav item; this screen **is** the unified chat.

## Automated checks

```bash
pytest tests/unit/test_agent_classify.py tests/contract/test_agent.py tests/golden/test_agent_golden.py tests/contract/test_ask.py tests/contract/test_rewrite_bio.py -q
```

Expected: classifier unit tests; `/agent` contract against OpenAPI examples; golden routing cases with LLM mocked; dedicated `/ask` and `/rewrite-bio` still pass.

## Validation sitting (maps to success criteria)

Create a session (`POST /v1/sessions`). Disclaimer visible in UI and on replies.

1. **SC-001 general ask** — In Hỏi coach, send a covered question (no specialized tab). Expect `intent=ask`, at least one library citation, not a fabricated study.

2. **SC-003 bio rewrite** — Same chat: paste a weak bio plus “sửa giúp”. Expect `intent=rewrite_bio` and a copy-ready `improved_draft`. Badge/label visible (SC-009).

3. **SC-004 message analysis** — Paste a draft plus “xem tin này ổn không”. Expect `intent=analyze_message`, tone/clarity, revised draft.

4. **SC-005 openers** — Describe a first-contact context and ask for openers. Expect `intent=openers` and at least two options.

5. **SC-006 ambiguous** — Send something like “mình đang hơi rối chuyện nhắn tin”. Expect `intent=ask`, not an invented bio or opener list.

6. **Missing draft** — Send only “sửa bio giúp”. Expect 200, `intent=rewrite_bio`, ask-to-paste, no invented bio.

7. **SC-007 safety** — Ask to scrape Instagram or match a named person. Expect 200 `refused=true`, empty citations.

8. **SC-008 dedicated screens** — Bio Studio still rewrites via its own screen; `/v1/sessions/{id}/ask` still returns `intent=ask`.

9. **SC-010 timebox** — Reviewer completes steps 1–2 on a laptop in under five minutes including reading.

## Out of this sitting

- Do not expect one message to both rewrite a bio **and** emit openers (P2).
- Do not expect simulation to start from Hỏi coach.
- Do not expect screenshot upload on `/agent`.
