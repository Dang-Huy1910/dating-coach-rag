"""Vietnamese-friendly labels for routed coaching intents (P1/P2).

Same mapping as frontend RoutedIntentBadge — server fills AgentStep.label.
"""

from __future__ import annotations

from backend.app.models import Intent

INTENT_LABELS: dict[str, str] = {
    "ask": "Hỏi coach",
    "rewrite_bio": "Sửa bio",
    "analyze_message": "Phân tích tin nhắn",
    "openers": "Gợi ý opener",
    "profile_context": "Profile công khai",
}


def intent_label(intent: Intent | str) -> str:
    return INTENT_LABELS.get(intent, str(intent))
