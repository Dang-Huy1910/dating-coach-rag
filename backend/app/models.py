from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Intent = Literal["ask", "rewrite_bio", "analyze_message", "openers", "profile_context"]
PrivacyFlag = Literal["public", "private", "unknown"]
ErrorCode = Literal[
    "empty_input",
    "too_long",
    "not_found",
    "index_not_ready",
    "need_visible_text",
    "too_many_images",
    "invalid_image",
    "fetch_failed",
]




class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    index_ready: bool = False


class DisclaimerResponse(BaseModel):
    text: str


class SessionResponse(BaseModel):
    id: str
    created_at: datetime
    disclaimer: str
    turn_count: int = 0


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=8000)
    stream: bool = False


class DraftRequest(BaseModel):
    draft: str = Field(min_length=1, max_length=8000)
    notes: str | None = Field(default=None, max_length=2000)


class OpenersRequest(BaseModel):
    context: str = Field(min_length=1, max_length=8000)


class ProfileImage(BaseModel):
    """Screenshot the user already saw. Request-scoped only — never persisted."""

    mime_type: str
    data_base64: str
    caption: str | None = Field(default=None, max_length=2000)
    comments: str | None = Field(default=None, max_length=4000)


class ProfileContextRequest(BaseModel):
    """Public profile context: YouTube/Reddit fetch + optional paste/screenshots."""

    model_config = ConfigDict(extra="forbid")

    handle: str | None = None
    profile_url: str | None = None
    visible_text: str = ""
    privacy: PrivacyFlag = "unknown"
    relationship_progress: str | None = Field(default=None, max_length=2000)
    question: str | None = None
    images: list[ProfileImage] = Field(default_factory=list)


class Citation(BaseModel):
    source_id: str
    title: str
    heading: str | None = None
    path: str
    score: float


class CoachReply(BaseModel):
    reply: str
    citations: list[Citation] = Field(default_factory=list)
    refused: bool = False
    hedged: bool = False
    disclaimer: str
    intent: Intent
    improved_draft: str | None = None
    openers: list[str] | None = None
    # Optional coaching diagnostics (filled by LLM for analyze_message)
    tone: str | None = None
    clarity: str | None = None
    risk: str | None = None
    # Bullet points for bio (and optionally message) evaluation — LLM only
    analysis_points: list[str] | None = None


class ErrorResponse(BaseModel):
    detail: str
    code: ErrorCode | None = None


class KnowledgeFormat(BaseModel):
    ext: str
    label: str
    note: str


class KnowledgeSourceInfo(BaseModel):
    source_id: str
    title: str
    path: str
    kind: str
    bytes: int | None = None
    updated_at: str | None = None


class KnowledgeListResponse(BaseModel):
    formats: list[KnowledgeFormat]
    sources: list[KnowledgeSourceInfo]
    index_ready: bool = False
    chunk_count: int | None = None


class KnowledgeUploadResponse(BaseModel):
    source: KnowledgeSourceInfo
    chunk_count: int
    detail: str = "Đã thêm vào thư viện và dựng lại index."


class KnowledgeReindexResponse(BaseModel):
    chunk_count: int
    detail: str = "Đã dựng lại index."
