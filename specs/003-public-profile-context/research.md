# Research: Public Profile Context Coaching

**Branch**: `003-public-profile-context` | **Date**: 2026-09-04

All Technical Context unknowns resolved. Stack stays constitution-compliant (backend-first, local FAISS, one LLM path, thin React, no scrape).

---

## Decision: Dedicated endpoint `POST /v1/sessions/{session_id}/profile-context` + intent `profile_context`

**Rationale**: Spec user stories are a distinct sitting (paste public-visible context, private-out-of-scope, no scrape) — not “just another opener prompt.” A dedicated resource makes FR-002/007 enforceable in the API (handle-only → 400; private → refused) without parsing free-text on `/openers` or `/ask`. Existing four coaching paths stay unchanged.

**Alternatives considered**:
- Reuse `POST /openers` with a fatter `context` string: cheapest, but handle-only vs private vs scrape cannot be validated cleanly; UI would hide product rules in prompt glue.
- Reuse `/ask` only: same problem; openers array is optional and easy to skip.
- Instagram Graph / login-for-public: violates FR-011, constitution IV, and YAGNI.

---

## Decision: Deterministic `profile_gate` before retrieve/generate

**Rationale**: Spec SC-002/003/004 require 100% of review runs to ask for paste, refuse scrape, and refuse private load. An LLM-only “please don’t fetch” instruction is not a testable gate. A small Python classifier on the request DTO + concatenated text is unit-testable and short-circuits before FAISS/LLM.

**Outcomes**:
| Gate result | HTTP | CoachReply |
|-------------|------|------------|
| `need_visible_text` (handle/URL only, empty paste) | **400** `code=need_visible_text` | none — UI shows “hãy dán bio/caption bạn đã thấy” |
| `private_out_of_scope` | **200** | `refused=true`, Vietnamese cannot-fetch copy, empty citations |
| `scrape` / other `safety.screen` block | **200** | existing `_refusal_reply` (empty citations) |
| `ok` | **200** | retrieve → generate as today |

Private uses 200 (not 400) so the same session stays usable: user can then paste chat text as ordinary coaching (US2 scenario 2).

**Alternatives considered**:
- Prompt-only: fails SC 100% bars.
- New ML classifier / moderation API: YAGNI and extra vendor.
- Treat private as 400: worse UX; sitting feels like a dead form error instead of a coach boundary.

---

## Decision: Handle and profile URL are labels only — never fetched

**Rationale**: FR-002, FR-006, FR-011. Implementation MUST NOT `httpx`/`requests` to Instagram (or any social host), MUST NOT add instaloader/Graph/OAuth, MUST NOT use the URL as a retrieval document. The fields exist so the user can name the sitting (“@handle”) and so the gate can detect “I only sent a link.”

**Alternatives considered**:
- “Public scrape is legal, fetch oEmbed”: still a crawler; constitution IV + spec P3 forbid it.
- oEmbed / Open Graph preview: extra failure mode, looks like “we loaded the profile,” violates FR-002.

---

## Decision: Pasted visible text is user context, not a knowledge source

**Rationale**: Principle II — citations come from the curated library. Instagram captions must not become FAISS chunks and must not appear as `Citation.path`. Retrieval query = `visible_text` + optional `question`. Prompt extra states: do not invent posts, follower counts, photos, or “studies about this person”; do not claim a live load.

**Alternatives considered**:
- Index the paste into FAISS for the session: feels smart, but creates a mini-dossier and fake citations from the other person’s words.
- Skip retrieval and free-generate from the paste: violates RAG-grounded coaching.

---

## Decision: Add builder-written `data/knowledge/07-public-profile-context.md`

**Rationale**: Happy path (SC-001) needs library support for “how to open from a public bio/caption without being creepy.” Existing `02-openers.md` helps but does not cover the public-vs-private boundary or anti-stalking hygiene. One short original Markdown file, ingested like the rest. **Not** scraped Instagram posts.

**Alternatives considered**:
- No new file: retrieval may still hit openers/pacing, but grounding for this intent is weaker.
- Dump real IG captions into `data/knowledge/`: silent scrape / people-data; forbidden.

---

## Decision: Expand `safety.screen` scrape + matchmaking patterns; keep other categories

**Rationale**: Current scrape regex is Tinder/Bumble/Hinge-centric. Spec examples are Instagram crawl/download and “load this private account anyway.” Matchmaking must also catch “người này có thích mình không?” / match % / ranking a named real person (FR-005, edge cases). Coercion already covers stalking-adjacent phrasing; keep it.

**Alternatives considered**:
- New safety category `private_fetch`: overlapping with scrape; private is handled more clearly in `profile_gate` from the `privacy` field + phrases like “tài khoản riêng tư” / “mình không xem được.”
- LLM safety only: untestable 100% bars.

---

## Decision: No session field for a saved crush profile

**Rationale**: FR-008, US3. `CoachingSession` stays a list of ephemeral `Turn`s. Profile paste is `role_user_text` (plus structured fields only on the request). New session / process restart / DELETE drops it. UI MUST NOT offer “hồ sơ crush đã lưu.”

**Alternatives considered**:
- `session.profile_context` persisted in the dict for the sitting: tempting for multi-turn, but a dedicated dossier field invites a history UI. Multi-turn can use existing `recent_turns` like other intents.
- SQLite people table: constitution IV + YAGNI.

---

## Decision: JSON-only for this endpoint; reuse `CoachReply`

**Rationale**: Tests and the other three non-ask paths are JSON. SSE on `/ask` stays as-is. Reply shape already has `reply`, `openers`, `citations`, `refused`, `hedged`, `disclaimer`. Extend `intent` enum with `profile_context`. When the library supports it, require at least one opener or a concrete next-message in `openers` or `reply` (prompt extra); do not ship hardcoded opener fallbacks.

**Alternatives considered**:
- New reply type `ProfileCoachReply`: extra TS/Python/OpenAPI drift for no gain.
- SSE: not required by spec; skip for this slice.

---

## Decision: React `ProfileContextView` is HTTP-only; Vietnamese copy

**Rationale**: Principle III. Form: optional handle, optional public URL, required paste textarea, privacy note (`public` / `private` / unknown), optional question. Standing disclaimer already in `DisclaimerBar`. Handle-only shows the 400 detail. Private/scrape show `CoachBubble` refusal. Happy path shows analysis + copy-ready openers (`CopyReadyCard` / existing opener chips). No “Đăng nhập Instagram” control.

**Alternatives considered**:
- Stuff this into OpenersView: mixes generic first-contact with profile-boundary UX; harder to demo SC-002/004.
- Browser `fetch(instagram.com)` from Vite: still a scrape, plus CORS; forbidden.

---

## Decision: Tests = contract + unit gate + golden 100% bars (mocked LLM)

**Rationale**: Constitution evaluation constraint + SC-002–005. Live LLM remains opt-in (`RUN_LIVE_LLM=1`). Golden cases:
1. Public paste + question → not refused, citations from `data/knowledge/`, at least one opener or next-message suggestion.
2. Handle/URL only → 400 `need_visible_text`, no fabricated profile summary.
3. “Cào / scrape Instagram profile này” → 200 `refused`, empty citations.
4. `privacy=private` or “tài khoản riêng tư, tải dùm” → 200 `refused`, cannot-fetch copy, no invented posts.
5. Named person + bio + “ghép đôi / % hợp” → 200 `refused` matchmaking.

**Alternatives considered**:
- UI-only demo: cannot lock 100% bars.
- Live-LLM-only: flaky and costs quota.

---

## Decision: Max paste 8000 characters (existing `_require_text` rule)

**Rationale**: Spec edge case “extremely long paste.” Reuse 8000; oversize → 400 ask to shorten. Optional `question` ≤ 2000 (same as `DraftRequest.notes`). Handle ≤ 128; URL ≤ 500.

**Alternatives considered**:
- Unlimited: session RAM + LLM context blow-up.
- New chunking pipeline for pastes: YAGNI; ask the user to excerpt.
