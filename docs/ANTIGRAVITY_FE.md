# Antigravity — React FE brief

Use this after Stitch screens exist. Backend is already the system of record.

## Do not change

- Python FastAPI in `backend/` (RAG, safety, LLM, sessions)
- Knowledge files in `data/knowledge/`
- Contract in `specs/001-dating-coach-rag/contracts/openapi.yaml`

## Build

Vite + React + TypeScript. Dev server `http://127.0.0.1:5173`. CORS is already allowed on the API.

```bash
# API must be running
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
# then
cd frontend   # or frontend/web after scaffold
npm run dev
```

Env: `VITE_API_BASE=http://127.0.0.1:8000`

## API the UI must call

| Screen / intent | Method | Path | Body |
|-----------------|--------|------|------|
| Boot | POST | `/v1/sessions` | — |
| Disclaimer | GET | `/v1/disclaimer` | — |
| Health | GET | `/health` | — |
| Hỏi coach | POST | `/v1/sessions/{id}/ask` | `{ "question": "..." }` |
| Sửa bio | POST | `/v1/sessions/{id}/rewrite-bio` | `{ "draft": "..." }` |
| Phân tích tin | POST | `/v1/sessions/{id}/analyze-message` | `{ "draft": "..." }` |
| Opener | POST | `/v1/sessions/{id}/openers` | `{ "context": "..." }` |

Reply JSON (`CoachReply`): `reply`, `citations[]`, `refused`, `hedged`, `disclaimer`, `intent`, optional `improved_draft`, optional `openers[]`.

## Product rules in the UI

- Vietnamese labels/buttons.
- Disclaimer always visible (banner), not buried in settings.
- If `refused`: show the reply, **do not** invent sources; `citations` will be empty.
- Show citations as human titles + path when present.
- Copy buttons for `improved_draft` and each opener.
- Empty draft → show the API 400 message; do not fake a bio/person.
- `index_ready: false` on `/health` → “Thư viện chưa sẵn sàng”, do not chat as if the coach knows.
- No login, no swipe, no matching, no history persistence.

## Routes (suggested)

`/` welcome + disclaimer → `/coach` workspace with four modes (tabs or segmented control). One session id in memory for the tab lifetime.

## Tasks

See `specs/001-dating-coach-rag/tasks.md` Phase 9 (T050–T054).
