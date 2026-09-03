# Quickstart: Public Profile Context Coaching

Validate this feature after implementation. Types live in [data-model.md](./data-model.md); HTTP shapes in [contracts/openapi.yaml](./contracts/openapi.yaml).

## Prerequisites

- Python 3.12, repo root as cwd
- `.env` with `GROQ_API_KEY` **or** `LLM_PROVIDER=gemini` + `GEMINI_API_KEY` (same as 001)
- Index built (`data/knowledge/*.md` including `07-public-profile-context.md` after this slice)

## Setup

```bash
source .venv/bin/activate
pip install -e ".[dev]"
DATING_COACH_EMBEDDER=hash python -m backend.app.rag.ingest
```

Re-run ingest after adding `07-public-profile-context.md`.

## Run

Terminal A — API:

```bash
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Terminal B — React (HTTP only via Vite proxy):

```bash
cd frontend && npm run dev -- --host 127.0.0.1 --port 5173
```

Open the **profile-context** mode (Vietnamese label). Confirm the standing disclaimer. There must be **no** “Đăng nhập Instagram” control.

## Automated checks

```bash
pytest tests/unit/test_profile_gate.py tests/unit/test_safety.py tests/contract/test_profile_context.py tests/golden/test_profile_context_golden.py -q
```

Expected: gate unit tests; contract against OpenAPI examples; golden cases with LLM mocked.

## Validation sitting (maps to success criteria)

Create a session (`POST /v1/sessions`). Disclaimer visible in UI and on replies.

1. **SC-001 happy path** — Paste a public-visible bio/caption (with or without handle) and a short question. Expect `intent=profile_context`, `refused=false`, at least one library citation (`path` under `data/knowledge/`), and approach advice plus opener/next-message suggestion. No Instagram login.

2. **SC-002 handle/URL only** — Submit `handle` or `profile_url` with empty `visible_text`. Expect **400** `code=need_visible_text` and copy asking to paste what they already see. Must **not** return a fabricated profile summary.

3. **SC-003 scrape** — Ask to scrape/crawl/download an Instagram or dating profile. Expect **200** `refused=true`, empty `citations`, no downloaded posts.

4. **SC-004 private** — `privacy=private` or “tài khoản riêng tư, tải dùm.” Expect **200** `refused=true`, cannot-fetch copy, no invented bio/posts. Session still usable for a later paste of chat text.

5. **SC-005 matchmaking** — Named person + pasted bio + “ghép đôi / % hợp / người này có thích mình không.” Expect **200** `refused=true` matchmaking; may still allow a *follow-up* that is only communication hygiene (not required in the same request).

6. **SC-006 timebox** — Reviewer completes steps 1–2 on a laptop in under five minutes including reading.

Also confirm: after DELETE session or “phiên mới,” the UI does not offer a saved crush dossier (FR-008).

## Smoke with curl (no UI)

```bash
curl -s http://127.0.0.1:8000/health
SID=$(curl -s -X POST http://127.0.0.1:8000/v1/sessions | python -c "import sys,json; print(json.load(sys.stdin)['id'])")

# Happy path
curl -s -X POST "http://127.0.0.1:8000/v1/sessions/$SID/profile-context" \
  -H 'content-type: application/json' \
  -d '{"handle":"@example","privacy":"public","visible_text":"Thích chạy bộ và cà phê trứng","question":"Gợi ý opener lịch sự"}'

# Handle only — expect 400 need_visible_text
curl -s -o /tmp/pc-handle.json -w "%{http_code}\n" \
  -X POST "http://127.0.0.1:8000/v1/sessions/$SID/profile-context" \
  -H 'content-type: application/json' \
  -d '{"handle":"@example","visible_text":""}'
python -c "import json; print(json.load(open('/tmp/pc-handle.json')))"

# Private — expect 200 refused
curl -s -X POST "http://127.0.0.1:8000/v1/sessions/$SID/profile-context" \
  -H 'content-type: application/json' \
  -d '{"handle":"@locked","privacy":"private","question":"Tải profile riêng tư giúp mình"}'
```

## Done when

- Health `index_ready: true` after ingest of the new guide
- Five golden/contract bars above pass with mocked LLM
- UI happy path works without Instagram login
- No outbound fetch of `profile_url` (code review: no social HTTP client in this slice)
