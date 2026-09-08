"""Safety-aware intent classifier for the coach router (P1 + P2).

P2 returns 1–4 unique allowlisted intents. Legacy single `intent` JSON still works.
See specs/009-multi-step-agent/plan.md and data-model.md.
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

DRAFT_JOBS: frozenset[str] = frozenset(
    {"rewrite_bio", "analyze_message", "profile_context"}
)

MAX_INTENTS = 4

_JSON_BLOCK = re.compile(r"\{.*\}", re.S)

CLASSIFIER_SYSTEM = (
    "You classify dating-coach chat messages into one or more intents. "
    "Reply with JSON only. No markdown, no commentary."
)

CLASSIFIER_PROMPT = """Classify this dating-coach user message into 1–4 ordered intents.

Allowed intents:
- ask: general dating-communication question / advice (default when unclear)
- rewrite_bio: rewrite the user's own dating bio/profile text
- analyze_message: analyze or rewrite a message draft the user will send
- openers: suggest first-message openers for a first-contact context
- profile_context: coach how to approach someone from pasted public-visible bio/caption (not rewriting the user's own bio)

Rules:
- Return 1–4 unique intents in execution order. Prefer a single intent when the user asks one job.
- Two-job examples: "sửa bio rồi gợi ý opener" → ["rewrite_bio","openers"]; "phân tích tin rồi gợi ý câu trả lời/opener" → ["analyze_message","openers"].
- If unclear or only a general question → ["ask"] (do not invent bio rewrite or opener list).
- Put draft jobs (rewrite_bio / analyze_message / profile_context) before openers when both are requested.
- Put ask last when mixed with specialized jobs.
- needs_draft=true when a specialized intent lacks usable paste/context:
  - rewrite_bio / analyze_message: no draft text beyond the request itself
  - openers: no usable first-contact context
  - profile_context: only a handle/URL (esp. Instagram/TikTok) with no pasted visible text
- needs_draft=false for ask-only, or when a usable draft/context/paste is present.
- Chat simulation / roleplay-as-the-other-person is NOT an intent here → use ask.

Return JSON only (preferred):
{{"intents": ["rewrite_bio", "openers"], "needs_draft": false}}

Legacy single-intent form is also accepted:
{{"intent": "ask", "needs_draft": false}}

User message:
{message}
"""


@dataclass(frozen=True)
class ParsedPlan:
    intents: list[Intent]
    needs_draft: bool
    truncated: bool = False


@dataclass(frozen=True)
class RoutingDecision:
    intents: list[Intent]
    needs_draft: bool
    blocked: bool
    safety: SafetyVerdict | None
    truncated: bool = False

    @property
    def intent(self) -> Intent:
        return self.intents[0] if self.intents else "ask"


def normalize_intents(raw: list[str]) -> tuple[list[Intent], bool]:
    """Allowlist → unique (order preserved) → cap 4 → draft before openers → ask last."""
    unique: list[Intent] = []
    seen: set[str] = set()
    for item in raw:
        key = str(item or "").strip()
        if key not in ALLOWED_INTENTS or key in seen:
            continue
        unique.append(key)  # type: ignore[arg-type]
        seen.add(key)

    truncated = len(unique) > MAX_INTENTS
    if truncated:
        unique = unique[:MAX_INTENTS]

    if "openers" in unique and any(x in DRAFT_JOBS for x in unique):
        without = [x for x in unique if x != "openers"]
        last_draft = max(i for i, x in enumerate(without) if x in DRAFT_JOBS)
        without.insert(last_draft + 1, "openers")  # type: ignore[arg-type]
        unique = without

    if "ask" in unique and len(unique) > 1:
        unique = [x for x in unique if x != "ask"] + ["ask"]  # type: ignore[list-item]

    if not unique:
        unique = ["ask"]
    return unique, truncated


def parse_classifier_json(raw: str) -> ParsedPlan:
    """Parse classifier output; accept intents[] or legacy intent; invalid → ask."""
    text = (raw or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text).strip()
    match = _JSON_BLOCK.search(text)
    candidate = match.group(0) if match else text
    try:
        data = json.loads(candidate)
    except (json.JSONDecodeError, TypeError, ValueError):
        return ParsedPlan(intents=["ask"], needs_draft=False)

    if not isinstance(data, dict):
        return ParsedPlan(intents=["ask"], needs_draft=False)

    raw_intents: list[str] = []
    intents_val = data.get("intents")
    if isinstance(intents_val, list):
        raw_intents = [str(x) for x in intents_val]
    else:
        intent_raw = str(data.get("intent") or "").strip()
        if intent_raw:
            raw_intents = [intent_raw]

    intents, truncated = normalize_intents(raw_intents)

    needs = data.get("needs_draft")
    needs_draft = bool(needs) if isinstance(needs, bool) else bool(needs)
    if intents == ["ask"] or all(i == "ask" for i in intents):
        needs_draft = False

    return ParsedPlan(intents=intents, needs_draft=needs_draft, truncated=truncated)


def classify_message(text: str) -> RoutingDecision:
    """Screen for safety first; if blocked skip classify; else one JSON complete() call."""
    verdict = screen(text)
    if not verdict.allowed:
        return RoutingDecision(
            intents=["ask"],
            needs_draft=False,
            blocked=True,
            safety=verdict,
            truncated=False,
        )
    raw = complete(
        CLASSIFIER_PROMPT.format(message=text),
        system_prompt=CLASSIFIER_SYSTEM,
        temperature=0.0,
    )
    plan = parse_classifier_json(raw)
    return RoutingDecision(
        intents=plan.intents,
        needs_draft=plan.needs_draft,
        blocked=False,
        safety=None,
        truncated=plan.truncated,
    )
