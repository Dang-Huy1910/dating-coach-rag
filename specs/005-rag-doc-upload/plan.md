# Plan: User RAG Document Upload

**Branch**: `005-rag-doc-upload` | **Date**: 2026-09-04

## Summary
Add extractors for md/txt/pdf/docx/html, store files in `data/uploads/`, extend ingest to merge curated + uploads, expose upload/list/delete/reindex API, and a thin React “Thư viện” view.

## Stack
- Existing FAISS ingest/retrieve
- New deps: `pypdf`, `python-docx`
- FastAPI `UploadFile` multipart

## Layout
```text
backend/app/rag/extract.py
backend/app/rag/uploads.py
backend/app/rag/ingest.py      # multi-format + uploads dir
backend/app/rag/chunk.py       # chunk_plain
backend/app/api/router.py      # /v1/knowledge/*
data/uploads/.gitkeep
frontend/src/views/KnowledgeView.tsx
```

## Limits
- Max 5 MB / file
- Extensions whitelist only
- source_id prefix `upload-` for user files
