"""Dedicated-path extras shared by /agent and specialized endpoints.

See specs/008-coach-router-agent/plan.md.
"""

from backend.app.prompts import PROFILE_CONTEXT_EXTRA

REWRITE_BIO_EXTRA = (
    "REQUIRED: return analysis_points as 2–4 short Vietnamese bullets evaluating THIS bio "
    "(what is vague/generic, what to make concrete, what natural invite/hook to add). "
    "Also return improved_draft as a copy-ready bio. Do not put the product disclaimer inside reply."
)

ANALYZE_MESSAGE_EXTRA = (
    "REQUIRED: populate tone, clarity, and risk from YOUR analysis of this draft "
    "(short Vietnamese labels, max ~10 words each; interpersonal risk only, not clinical). "
    "Also return improved_draft. Do not put the product disclaimer inside reply."
)

OPENERS_EXTRA = "Suggest at least two distinct opener options in the openers array."

__all__ = [
    "REWRITE_BIO_EXTRA",
    "ANALYZE_MESSAGE_EXTRA",
    "OPENERS_EXTRA",
    "PROFILE_CONTEXT_EXTRA",
]
