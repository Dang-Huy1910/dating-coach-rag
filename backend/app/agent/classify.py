"""Safety-aware intent classifier for the P1 coach router.

See specs/008-coach-router-agent/plan.md and data-model.md.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass

from backend.app.coach import complete
from backend.app.models import Intent
from backend.app.safety import SafetyVerdict, screen

ALLOWED_INTENTS: frozenset[str] = frozenset(
    {"ask", "rewrite_bio", "analyze_message", "openers", "profile_context"}
)

_JSON_BLOCK = re.compile(r"\{.*\}", re.S)

CLASSIFIER_SYSTEM = (
    "You classify dating-coach chat messages into exactly one intent. "
    "Reply with JSON only. No markdown, no commentary."
)

CLASSIFIER_PROMPT = """Classify this dating-coach user message into exactly one intent.

Allowed intents:
- ask: general dating-communication question / advice (default when unclear)
- rewrite_bio: rewrite the user's own dating bio/profile text
- analyze_message: analyze or rewrite a message draft the user will send
- openers: suggest first-message openers for a first-contact context
- profile_context: coach how to approach someone from pasted public-visible bio/caption (not rewriting the user's own bio)

Rules:
- Exactly one intent. If the message asks for two jobs, pick the clearest single job; if still unclear, use ask.
- Ambiguous messages → ask (do not invent a bio rewrite or opener list).
- needs_draft=true when the chosen specialized intent has no usable paste/context:
  - rewrite_bio / analyze_message: no draft text beyond the request itself
  - openers: no usable first-contact context
  - profile_context: only a handle/URL (esp. Instagram/TikTok) with no pasted visible text
- needs_draft=false for ask, or when a usable draft/context/paste is present.
- Chat simulation / roleplay-as-the-other-person is NOT an intent here → use ask.

Return JSON only:
{{"intent": "<one of allowlist>", "needs_draft": <true|false>}}

User message:
{message}
"""


@dataclass(frozen=True)
class RoutingDecision:
    intent: Intent
    needs_draft: bool
    blocked: bool
    safety: SafetyVerdict | None


def parse_classifier_json(raw: str) -> tuple[Intent, bool]:
    """Parse classifier output; invalid/missing → ask, needs_draft=False."""
    text = (raw or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text).strip()
    match = _JSON_BLOCK.search(text)
    candidate = match.group(0) if match else text
    try:
        data = json.loads(candidate)
    except (json.JSONDecodeError, TypeError, ValueError):
        return "ask", False
    if not isinstance(data, dict):
        return "ask", False
    intent_raw = str(data.get("intent") or "").strip()
    intent: Intent = intent_raw if intent_raw in ALLOWED_INTENTS else "ask"  # type: ignore[assignment]
    needs = data.get("needs_draft")
    needs_draft = bool(needs) if isinstance(needs, bool) else bool(needs)
    if intent == "ask":
        needs_draft = False
    return intent, needs_draft


def classify_message(text: str) -> RoutingDecision:
    """Screen for safety first; if blocked skip classify; else one JSON complete() call."""
    verdict = screen(text)
    if not verdict.allowed:
        return RoutingDecision(
            intent="ask",
            needs_draft=False,
            blocked=True,
            safety=verdict,
        )
    raw = complete(
        CLASSIFIER_PROMPT.format(message=text),
        system_prompt=CLASSIFIER_SYSTEM,
        temperature=0.0,
    )
    intent, needs_draft = parse_classifier_json(raw)
    if intent not in ALLOWED_INTENTS:
        intent = "ask"
        needs_draft = False
    return RoutingDecision(
        intent=intent,  # type: ignore[arg-type]
        needs_draft=needs_draft,
        blocked=False,
        safety=None,
    )
