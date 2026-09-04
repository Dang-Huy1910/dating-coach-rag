# Feature Specification: User RAG Document Upload

**Feature Branch**: `005-rag-doc-upload`  
**Created**: 2026-09-04  
**Status**: Draft  

**Input**: Người dùng tự thêm tài liệu vào RAG bằng cách tải lên; hỗ trợ nhiều định dạng.

## User Scenarios

### US1 — Upload a document into the coaching library (P1)
A demo user opens a library screen, uploads a coaching-related document in an allowed format, and after indexing can ask questions that cite that document.

### US2 — See supported formats and manage uploads (P2)
The user sees which formats are accepted, which sources are curated vs uploaded, and can remove an upload then re-index.

## Requirements

- **FR-001**: Accept uploads in at least: Markdown (`.md`), plain text (`.txt`), PDF (`.pdf`), Word (`.docx`), HTML (`.html`/`.htm`).
- **FR-002**: Store user uploads separately from curated starter guides; do not overwrite curated files.
- **FR-003**: After a successful upload, rebuild the local vector index so new text is retrievable.
- **FR-004**: List knowledge sources with kind `curated` | `upload`.
- **FR-005**: Allow delete of **upload** sources only, then re-index.
- **FR-006**: Enforce size/type limits and reject unsafe extensions with a clear error.
- **FR-007**: Citations for uploaded docs must use a path under the uploads tree (never pretend to be curated starter guides).
- **FR-008**: Vietnamese-friendly UI copy for the library screen.

## Success Criteria

- **SC-001**: Upload a `.txt` or `.md` guide → ask a related question → citation path under uploads.
- **SC-002**: Upload unsupported type → rejected 100% of review runs.
- **SC-003**: Delete an upload → that source no longer appears in list / citations after re-index.
- **SC-004**: Reviewer completes upload → ask → cite in under five minutes.

## Assumptions

- Uploads are project-local demo knowledge (not a multi-tenant cloud drive).
- No OCR for scanned image-only PDFs in this slice (text-extractable PDFs only).
- NSFW/scrape safety still applies to coaching answers; upload content is treated as user-provided coaching notes.
