from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

SafetyCategory = Literal[
    "matchmaking",
    "nsfw_companion",
    "deepfake",
    "therapy",
    "coercion",
    "scrape",
]


@dataclass(frozen=True)
class SafetyVerdict:
    allowed: bool
    category: SafetyCategory | None
    user_message: str


_REFUSALS: dict[SafetyCategory, str] = {
    "matchmaking": (
        "Mình không ghép đôi, xếp hạng hay giới thiệu người thật. "
        "Mình chỉ coach cách nhắn tin. Bạn mô tả ngữ cảnh (app, bạn chung, sở thích) "
        "nếu muốn gợi ý opener chung."
    ),
    "nsfw_companion": (
        "Mình là coach giao tiếp, không phải bạn gái/bạn trai ảo hay companion 18+. "
        "Mình có thể giúp bio, opener hoặc soạn tin lịch sự."
    ),
    "deepfake": (
        "Mình không hỗ trợ deepfake, ghép mặt hay tạo ảnh/giọng giả của người khác."
    ),
    "therapy": (
        "Mình không chẩn đoán, không trị liệu và không thay thế chuyên gia sức khỏe tâm thần. "
        "Nếu bạn đang khó khăn, hãy tìm sự hỗ trợ chuyên nghiệp. "
        "Mình chỉ coach giao tiếp hẹn hò từ thư viện đã kiểm duyệt."
    ),
    "coercion": (
        "Mình không hướng dẫn thao túng, ép buộc hay lừa dối. "
        "Nếu muốn, mình có thể gợi ý cách nói rõ ràng và tôn trọng ranh giới."
    ),
    "scrape": (
        "Mình không cào profile hay dữ liệu từ app hẹn hò. "
        "Thư viện kiến thức do người làm dự án soạn, không scrape."
    ),
}

_PATTERNS: list[tuple[SafetyCategory, re.Pattern[str]]] = [
    (
        "deepfake",
        re.compile(
            r"\b(deepfake|deep fake|faceswap|face-swap|nude swap|voice clone)\b|"
            r"ghép mặt|ảnh khỏa thân giả|clone giọng",
            re.I,
        ),
    ),
    (
        "scrape",
        re.compile(
            r"\b(scrape|crawler|crawl)\b.+\b(tinder|bumble|hinge|profile)s?\b|"
            r"cào (profile|tinder|bumble)|kéo dữ liệu (hẹn hò|dating)",
            re.I,
        ),
    ),
    (
        "nsfw_companion",
        re.compile(
            r"\b(nsfw|erp|roleplay sex|sex chat)\b|"
            r"bạn gái ảo|bạn trai ảo|ai girlfriend|ai boyfriend|"
            r"người yêu ảo|companion 18\+|roleplay (tình dục|sex)",
            re.I,
        ),
    ),
    (
        "therapy",
        re.compile(
            r"\b(diagnos(?:e|is)|ptsd|bipolar|schizophrenia|prescribe|antidepressant)\b|"
            r"chẩn đoán (trầm cảm|lo âu|tâm thần)|trị liệu tâm lý|"
            r"kê đơn|điều trị trầm cảm|bạn là bác sĩ|bạn là therapist",
            re.I,
        ),
    ),
    (
        "coercion",
        re.compile(
            r"\b(gaslight|stalk|love[- ]bomb|guilt[- ]trip)\b|"
            r"thao túng|ép (cô ấy|cậu ấy|họ) |không cho (họ|đối phương) nói không|"
            r"lừa cho (nhắn|đồng ý)|cách nhắn để họ không từ chối",
            re.I,
        ),
    ),
    (
        "matchmaking",
        re.compile(
            r"\b(match me with|find me a (girl|boy|date)|set me up with)\b|"
            r"ghép đôi (tôi|mình)|tìm người yêu hộ|giới thiệu người thật|"
            r"xếp hạng (profile|người)|swipe hộ|kết nối hai người thật",
            re.I,
        ),
    ),
]


def screen(text: str) -> SafetyVerdict:
    blob = text or ""
    for category, pattern in _PATTERNS:
        if pattern.search(blob):
            return SafetyVerdict(
                allowed=False,
                category=category,
                user_message=_REFUSALS[category],
            )
    return SafetyVerdict(allowed=True, category=None, user_message="")
