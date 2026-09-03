from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Intent = Literal["ask", "rewrite_bio", "analyze_message", "openers"]


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


class ErrorResponse(BaseModel):
    detail: str
    code: Literal["empty_input", "too_long", "not_found", "index_not_ready"] | None = None
