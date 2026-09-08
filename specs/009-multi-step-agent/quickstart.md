# Quickstart: Multi-Step Coach Agent (P2)

Validate after implementation. Types: [data-model.md](./data-model.md). HTTP: [contracts/openapi.yaml](./contracts/openapi.yaml).

## Prerequisites

Same as 008: Python 3.12, `.env` with Groq or Gemini, hash index ingested.

```bash
source .venv/bin/activate
DATING_COACH_EMBEDDER=hash python -m backend.app.rag.ingest
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
# other terminal
cd frontend && npm run dev -- --host 127.0.0.1 --port 5173
```

Open **Hỏi coach**. No new nav item.

## Automated checks

```bash
pytest tests/unit/test_agent_classify.py tests/unit/test_agent_run.py \
  tests/contract/test_agent.py tests/golden/test_agent_golden.py \
  tests/contract/test_ask.py tests/contract/test_rewrite_bio.py \
  tests/contract/test_openers.py -q
```

## Validation sitting

1. **SC-001 two-job** — `Sửa bio giúp rồi gợi ý opener: Thích cà phê, tìm người tử tế.` Expect `steps` with Sửa bio then Gợi ý opener, `improved_draft` set, `openers` length ≥ 2.
2. **SC-003 P1 regression** — `Bio hẹn hò ngắn nên viết thế nào?` Expect single ask, citations, **no** unsolicited improved bio/opener list.
3. **Missing draft** — `Sửa bio rồi viết opener giúp` (no paste). Expect ask-to-paste, no invented draft/openers.
4. **SC-004 safety** — scrape/match + “viết opener”. Expect refused, empty citations, no copy-ready playbook.
5. **SC-006** — Bio Studio dedicated path still rewrites via `/rewrite-bio`.
6. **SC-007** — Steps 1–2 in under five minutes including reading.

## Out of this sitting

- Do not expect the app to send the opener to Tinder.
- Do not expect five jobs in one turn (cap 4; remainder is a follow-up).
- Do not expect simulation to start from Hỏi coach.
