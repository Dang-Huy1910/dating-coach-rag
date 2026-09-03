# Frontend

**Target:** React + Vite thin client (`http://127.0.0.1:5173`) → FastAPI `http://127.0.0.1:8000` only.

**Stopgap:** `app.py` (Streamlit) until Antigravity ships the React screens.

- Design prompt: [`docs/STITCH_PROMPT.md`](../docs/STITCH_PROMPT.md)
- Implement brief: [`docs/ANTIGRAVITY_FE.md`](../docs/ANTIGRAVITY_FE.md)
- API contract: [`specs/001-dating-coach-rag/contracts/openapi.yaml`](../specs/001-dating-coach-rag/contracts/openapi.yaml)

The browser must never call Groq/Gemini/FAISS. Coaching logic stays in `backend/`.
