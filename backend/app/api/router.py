from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
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
    ProfileContextRequest,
    SessionResponse,
)
from backend.app.profile_gate import classify, has_visible_context, validate_images
from backend.app.prompts import PROFILE_CONTEXT_EXTRA
from backend.app.public_fetch import fetch_public_profile, merge_fetched_text
from backend.app.rag.retrieve import index_ready
from backend.app.session_store import SessionStore

HANDLE_MAX = 128
URL_MAX = 500
VISIBLE_MAX = 8000
QUESTION_MAX = 2000
RELATIONSHIP_MAX = 2000
TOO_LONG_DETAIL = "Nội dung quá dài, hãy rút ngắn dưới 8000 ký tự."
EMPTY_DETAIL = (
    "Hãy dán link YouTube/Reddit, bio/caption, hoặc thêm ảnh chụp bài bạn đã thấy."
)

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


def _json_error(status: int, detail: str, code: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"detail": detail, "code": code})


def _is_blank_profile_request(body: ProfileContextRequest) -> bool:
    return not (
        (body.handle or "").strip()
        or (body.profile_url or "").strip()
        or (body.visible_text or "").strip()
        or (body.question or "").strip()
        or (body.relationship_progress or "").strip()
        or (body.images or [])
        or body.privacy == "private"
    )


def _profile_too_long(body: ProfileContextRequest) -> bool:
    handle = body.handle or ""
    url = body.profile_url or ""
    question = body.question or ""
    visible = body.visible_text or ""
    progress = body.relationship_progress or ""
    return (
        len(handle) > HANDLE_MAX
        or len(url) > URL_MAX
        or len(visible) > VISIBLE_MAX
        or len(question) > QUESTION_MAX
        or len(progress) > RELATIONSHIP_MAX
    )


def _run(
    request: Request,
    session_id: str,
    intent,
    user_text: str,
    extra: str = "",
    profile_request: ProfileContextRequest | None = None,
) -> CoachReply:
    _session_or_404(request, session_id)
    try:
        return handle(
            store=_store(request),
            session_id=session_id,
            intent=intent,
            user_text=user_text,
            extra=extra,
            profile_request=profile_request,
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


@router.post("/v1/sessions/{session_id}/profile-context", response_model=CoachReply)
def profile_context(session_id: UUID, body: ProfileContextRequest, request: Request):
    sid = str(session_id)
    _session_or_404(request, sid)
    if _profile_too_long(body):
        return _json_error(400, TOO_LONG_DETAIL, "too_long")
    image_code, image_detail = validate_images(body.images)
    if image_code and image_detail:
        return _json_error(400, image_detail, image_code)
    if _is_blank_profile_request(body):
        return _json_error(400, EMPTY_DETAIL, "empty_input")
    fetched = fetch_public_profile(body.profile_url)
    if fetched.text:
        body = body.model_copy(
            update={"visible_text": merge_fetched_text(body.visible_text, fetched.text)}
        )
    elif fetched.error_code and not has_visible_context(body):
        return _json_error(
            400,
            fetched.error_detail or "Không đọc được link công khai này.",
            fetched.error_code,
        )
    gate = classify(body)
    if gate.code == "need_visible_text":
        return _json_error(400, gate.user_message, "need_visible_text")
    return _run(
        request,
        sid,
        "profile_context",
        user_text="",
        extra=PROFILE_CONTEXT_EXTRA,
        profile_request=body,
    )
