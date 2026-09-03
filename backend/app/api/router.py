from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from sse_starlette.sse import EventSourceResponse

from backend.app.coach import IndexNotReadyError, LLMProviderError, handle
from backend.app.config import DISCLAIMER_TEXT
from backend.app.models import (
    AskRequest,
    CoachReply,
    DisclaimerResponse,
    DraftRequest,
    HealthResponse,
    OpenersRequest,
    SessionResponse,
)
from backend.app.rag.retrieve import index_ready
from backend.app.session_store import SessionStore

router = APIRouter()


def _store(request: Request) -> SessionStore:
    return request.app.state.store


def _session_or_404(request: Request, session_id: str):
    session = _store(request).get(session_id)
    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy phiên chat.",
        )
    return session


def _require_text(value: str) -> str:
    text = (value or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Hãy nhập nội dung trước.")
    if len(text) > 8000:
        raise HTTPException(status_code=400, detail="Nội dung quá dài, hãy rút ngắn dưới 8000 ký tự.")
    return text


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", index_ready=index_ready())


@router.get("/v1/disclaimer", response_model=DisclaimerResponse)
def disclaimer() -> DisclaimerResponse:
    return DisclaimerResponse(text=DISCLAIMER_TEXT)


@router.post("/v1/sessions", response_model=SessionResponse, status_code=201)
def create_session(request: Request) -> SessionResponse:
    session = _store(request).create()
    return SessionResponse(
        id=session.id,
        created_at=session.created_at,
        disclaimer=DISCLAIMER_TEXT,
        turn_count=session.turn_count,
    )


@router.get("/v1/sessions/{session_id}", response_model=SessionResponse)
def get_session(session_id: UUID, request: Request) -> SessionResponse:
    session = _session_or_404(request, str(session_id))
    return SessionResponse(
        id=session.id,
        created_at=session.created_at,
        disclaimer=DISCLAIMER_TEXT,
        turn_count=session.turn_count,
    )


@router.delete("/v1/sessions/{session_id}", status_code=204)
def delete_session(session_id: UUID, request: Request) -> None:
    if not _store(request).delete(str(session_id)):
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat.")


def _run(request: Request, session_id: str, intent, user_text: str, extra: str = "") -> CoachReply:
    _session_or_404(request, session_id)
    try:
        return handle(
            store=_store(request),
            session_id=session_id,
            intent=intent,
            user_text=user_text,
            extra=extra,
        )
    except IndexNotReadyError as exc:
        raise HTTPException(
            status_code=400,
            detail="Thư viện kiến thức chưa sẵn sàng. Hãy chạy ingest rồi hỏi lại.",
        ) from exc
    except LLMProviderError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/v1/sessions/{session_id}/ask", response_model=CoachReply)
def ask(session_id: UUID, body: AskRequest, request: Request):
    text = _require_text(body.question)
    sid = str(session_id)
    if body.stream:
        _session_or_404(request, sid)
        if not index_ready():
            raise HTTPException(status_code=400, detail="Thư viện kiến thức chưa sẵn sàng.")

        def events():
            reply = handle(
                store=_store(request),
                session_id=sid,
                intent="ask",
                user_text=text,
            )
            for citation in reply.citations:
                yield {
                    "event": "citation",
                    "data": citation.model_dump_json(),
                }
            if reply.refused:
                yield {"event": "refusal", "data": reply.reply}
            else:
                yield {"event": "token", "data": reply.reply}
            yield {"event": "done", "data": reply.model_dump_json()}

        return EventSourceResponse(events())
    return _run(request, sid, "ask", text)


@router.post("/v1/sessions/{session_id}/rewrite-bio", response_model=CoachReply)
def rewrite_bio(session_id: UUID, body: DraftRequest, request: Request):
    text = _require_text(body.draft)
    notes = f" Notes: {body.notes}" if body.notes else ""
    extra = (
        "REQUIRED: return analysis_points as 2–4 short Vietnamese bullets evaluating THIS bio "
        "(what is vague/generic, what to make concrete, what natural invite/hook to add). "
        "Also return improved_draft as a copy-ready bio. Do not put the product disclaimer inside reply."
        + notes
    )
    return _run(request, str(session_id), "rewrite_bio", text, extra)


@router.post("/v1/sessions/{session_id}/analyze-message", response_model=CoachReply)
def analyze_message(session_id: UUID, body: DraftRequest, request: Request):
    text = _require_text(body.draft)
    extra = (
        "REQUIRED: populate tone, clarity, and risk from YOUR analysis of this draft "
        "(short Vietnamese labels, max ~10 words each; interpersonal risk only, not clinical). "
        "Also return improved_draft. Do not put the product disclaimer inside reply. "
        "Notes: " + (body.notes or "")
    )
    return _run(request, str(session_id), "analyze_message", text, extra)


@router.post("/v1/sessions/{session_id}/openers", response_model=CoachReply)
def openers(session_id: UUID, body: OpenersRequest, request: Request):
    text = _require_text(body.context)
    extra = "Suggest at least two distinct opener options in the openers array."
    return _run(request, str(session_id), "openers", text, extra)
