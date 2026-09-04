from __future__ import annotations

import base64
import re
from dataclasses import dataclass
from typing import Literal

from backend.app.models import ProfileContextRequest, ProfileImage
from backend.app.safety import SafetyCategory, screen

GateCode = Literal["ok", "need_visible_text", "private_out_of_scope", "blocked_safety"]

NEED_VISIBLE_TEXT_MSG = (
    "Mình chỉ tự đọc link YouTube hoặc Reddit công khai. "
    "Hãy dán URL YouTube/Reddit, hoặc bio/caption, hoặc ảnh chụp bài bạn đã thấy. "
    "Link Instagram/TikTok không được tải."
)

MAX_IMAGES = 3
MAX_IMAGE_BYTES = 2 * 1024 * 1024
ALLOWED_IMAGE_MIMES = {"image/jpeg", "image/png", "image/webp"}

PRIVATE_OUT_OF_SCOPE_MSG = (
    "Mình không tải tài khoản riêng tư hay bị khóa trong tính năng này, "
    "và không bịa bio, bài viết hay ảnh. Nếu đối phương đã gửi bạn đoạn chat hoặc bio, "
    "hãy dán nội dung đó để mình coach cách nhắn tin."
)

_PRIVATE_LANGUAGE = re.compile(
    r"tài khoản (riêng tư|private|bị khóa)|"
    r"private account|locked account|"
    r"mình không xem được|không xem được (profile|bài|acc)|"
    r"acc(ount)? (private|riêng tư)|"
    r"profile (riêng tư|private|bị khóa)",
    re.I,
)


@dataclass(frozen=True)
class ProfileGateVerdict:
    allowed: bool
    code: GateCode
    safety_category: SafetyCategory | None
    user_message: str


def concat_request_text(request: ProfileContextRequest) -> str:
    caption_bits: list[str] = []
    for image in request.images or []:
        caption_bits.append(image.caption or "")
        caption_bits.append(image.comments or "")
    return "\n".join(
        [
            request.handle or "",
            request.profile_url or "",
            request.visible_text or "",
            request.question or "",
            request.relationship_progress or "",
            *caption_bits,
        ]
    )


def compose_snapshot(request: ProfileContextRequest) -> str:
    lines: list[str] = []
    handle = (request.handle or "").strip()
    url = (request.profile_url or "").strip()
    question = (request.question or "").strip()
    if handle:
        lines.append(f"handle: {handle}")
    if url:
        lines.append(f"url: {url}")
    lines.append(f"privacy: {request.privacy}")
    if question:
        lines.append(f"question: {question}")
    progress = (request.relationship_progress or "").strip()
    if progress:
        lines.append(f"relationship_progress: {progress}")
    for index, image in enumerate(request.images or [], start=1):
        lines.append(f"image {index}: screenshot attached (bytes not stored)")
        if (image.caption or "").strip():
            lines.append(f"image {index} caption: {image.caption.strip()}")
        if (image.comments or "").strip():
            lines.append(f"image {index} comments: {image.comments.strip()}")
    lines.append("visible:")
    lines.append(request.visible_text or "")
    return "\n".join(lines)


def has_visible_context(request: ProfileContextRequest) -> bool:
    return bool((request.visible_text or "").strip() or (request.images or []))


def strip_base64_payload(raw: str) -> str:
    text = (raw or "").strip()
    if text.lower().startswith("data:") and "," in text:
        return text.split(",", 1)[1]
    return text


def validate_images(images: list[ProfileImage] | None) -> tuple[str | None, str | None]:
    """Return (code, detail) on error, else (None, None)."""
    items = images or []
    if len(items) > MAX_IMAGES:
        return (
            "too_many_images",
            f"Chỉ gửi tối đa {MAX_IMAGES} ảnh chụp bài/story mỗi lần.",
        )
    for image in items:
        mime = (image.mime_type or "").lower()
        if mime not in ALLOWED_IMAGE_MIMES:
            return (
                "invalid_image",
                "Ảnh phải là JPEG, PNG hoặc WebP — screenshot bài/story bạn đã thấy.",
            )
        payload = strip_base64_payload(image.data_base64)
        if not payload:
            return ("invalid_image", "Ảnh không hợp lệ hoặc bị trống.")
        try:
            raw = base64.b64decode(payload, validate=False)
        except Exception:
            return ("invalid_image", "Không đọc được dữ liệu ảnh.")
        if not raw:
            return ("invalid_image", "Ảnh không hợp lệ hoặc bị trống.")
        if len(raw) > MAX_IMAGE_BYTES:
            return (
                "too_long",
                "Ảnh quá lớn, hãy gửi screenshot dưới 2MB mỗi tấm.",
            )
        image.data_base64 = payload
    return (None, None)


def classify(request: ProfileContextRequest) -> ProfileGateVerdict:
    blob = concat_request_text(request)
    safety = screen(blob)
    if not safety.allowed:
        return ProfileGateVerdict(
            allowed=False,
            code="blocked_safety",
            safety_category=safety.category,
            user_message=safety.user_message,
        )
    if request.privacy == "private" or _PRIVATE_LANGUAGE.search(blob):
        return ProfileGateVerdict(
            allowed=False,
            code="private_out_of_scope",
            safety_category=None,
            user_message=PRIVATE_OUT_OF_SCOPE_MSG,
        )
    if not has_visible_context(request):
        return ProfileGateVerdict(
            allowed=False,
            code="need_visible_text",
            safety_category=None,
            user_message=NEED_VISIBLE_TEXT_MSG,
        )
    return ProfileGateVerdict(
        allowed=True,
        code="ok",
        safety_category=None,
        user_message="",
    )
