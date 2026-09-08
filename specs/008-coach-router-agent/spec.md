# Feature Specification: Coach Router Agent (P1)

**Feature Branch**: `008-coach-router-agent`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description: "P1 router agent: Users type naturally in one coaching chat without picking a mode. The coach classifies the request and routes it to exactly one existing coaching capability (ask, rewrite bio, analyze message, openers, or public-profile context when enough visible text is in the message). Dedicated mode screens remain as explicit shortcuts. No multi-step tool chaining. Safety screening happens before routing. Grounding, citations, hedge/refuse, and disclaimer of the chosen capability are unchanged."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ask a grounded question without picking a mode (Priority: P1)

A demo user opens the unified coaching chat (the existing “Hỏi coach” sitting) and types a dating-communication question in ordinary language — they do not choose Bio Studio, Message, or Openers. The coach treats this as general coaching, replies in the same chat with advice grounded in the knowledge library, and shows sources when material was used. If the library does not support the question, the coach refuses or hedges the same way the dedicated ask path already does.

**Why this priority**: The product promise of P1 is “type naturally, still get a grounded coach.” If this slice works, the unified chat is already useful even when routing to specialized help is not ready.

**Independent Test**: From a fresh session, send a covered coaching question through the unified chat (not the dedicated Bio/Message/Openers screens) and confirm a cited reply with general-coaching behavior. Dedicated rewrite/analysis/opener screens are not required.

**Acceptance Scenarios**:

1. **Given** a coaching session and a knowledge library that covers the topic, **When** the user submits a general dating-communication question in the unified chat, **Then** they receive a coaching reply in that chat with at least one visible source citation.
2. **Given** a coaching session and a question the library cannot support, **When** the user submits it in the unified chat, **Then** the coach clearly states it cannot advise or must hedge, and does not invent studies, statistics, or clinical claims.
3. **Given** the user has already sent at least one message in this session, **When** they ask a follow-up general question in the unified chat, **Then** the coach can use recent turns in that sitting without requiring the user to paste the prior question.
4. **Given** a session is open in the unified chat, **When** the user reads the sitting, **Then** the short not-therapy disclaimer remains visible.

---

### User Story 2 - Route a bio rewrite or message analysis from the same chat (Priority: P2)

The user pastes their own bio or a message draft into the unified chat and asks for help in natural language (for example “sửa bio giúp” or “xem tin nhắn này ổn không”). The coach uses **exactly one** matching specialized capability for that turn — bio rewrite or message analysis — and returns the same kind of outcome the dedicated screen already provides (improved draft they can copy; for a message, tone/clarity and interpersonal-risk notes when relevant). The user does not have to open Bio Studio or Message.

**Why this priority**: This is the main reason to add a router: specialized help without tab-switching. It is independently valuable once general ask works, and it still uses one capability per turn (P1, not multi-step chaining).

**Independent Test**: Paste a weak bio plus a rewrite request into the unified chat and confirm an improved bio; separately paste a message draft plus an analysis request and confirm tone/clarity feedback plus a revised version. Openers and profile-context screens are not required.

**Acceptance Scenarios**:

1. **Given** a non-empty bio draft in the unified chat with a clear rewrite request, **When** the user sends that message, **Then** they receive at least one concrete rewrite suggestion and an improved bio they can copy, as if they had used Bio Studio.
2. **Given** a non-empty message draft in the unified chat with a clear analysis or rewrite request, **When** the user sends that message, **Then** they receive feedback covering tone and clarity, an interpersonal-risk note when relevant, and a revised version they can copy.
3. **Given** a rewrite or analysis request whose draft is empty or only a request with no paste (“sửa bio giúp” with no bio), **When** the user sends it, **Then** the coach asks them to paste the draft instead of inventing a bio or conversation.
4. **Given** retrieval is weak on a routed rewrite/analysis turn, **When** the user still asked for writing help, **Then** the coach MAY offer writing-craft suggestions but MUST NOT invent dating studies, statistics, or clinical claims.

---

### User Story 3 - Route opener suggestions from the same chat (Priority: P3)

The user describes a first-contact context in the unified chat (app, mutual friend, shared interest) and asks for openers. The coach uses the opener capability for that turn and returns at least two distinct opener options they can copy, consistent with the knowledge library. The user does not have to open the Openers screen.

**Why this priority**: Openers are an existing coaching job; routing them from natural chat completes the P1 “one chat, one capability” set without requiring multi-step chaining.

**Independent Test**: In the unified chat only, describe a first-contact context and ask for openers; confirm at least two distinct options. Bio rewrite is not required.

**Acceptance Scenarios**:

1. **Given** a first-contact context with no request to match real people, **When** the user asks for openers in the unified chat, **Then** they receive at least two distinct opener options they can copy.
2. **Given** the user asks the product to find, rank, or introduce real people in the unified chat, **When** they request openers or matches, **Then** the coach refuses matchmaking and may still offer generic opener advice if the library supports it.

---

### User Story 4 - Route public-profile coaching when the paste is already in the message (Priority: P4)

The user pastes public-visible bio/caption text they already saw (optionally with a public YouTube or Reddit link) and asks how to approach that person as communication coaching — not as a request to scrape or match. The coach uses the existing public-profile coaching capability for that turn. If the message is only a handle/URL with no visible paste, the coach asks for what the user already saw instead of inventing a profile.

**Why this priority**: The capability already exists on a dedicated screen. Routing it from unified chat is valuable when the paste is in the message, but it is not required to prove P1 (ask + bio + message + openers). Screenshot upload and the dedicated profile form remain the richer path.

**Independent Test**: Paste a public-visible bio/caption plus an approach question in the unified chat; confirm profile-context coaching (not a rewrite of the user’s own dating bio). Dedicated screenshot upload is not required.

**Acceptance Scenarios**:

1. **Given** pasted public-visible profile text and an approach question in the unified chat, **When** the user sends that message, **Then** they receive communication-coaching advice grounded in the library, not a fabricated live profile load.
2. **Given** only a social handle or Instagram/TikTok URL with no visible paste, **When** the user asks the unified chat to analyze that profile, **Then** the coach asks them to paste what they already saw (or directs them to the dedicated public-profile screen) and does not invent posts or follower counts.
3. **Given** a request to scrape, log into Instagram, or fetch a private account, **When** sent in the unified chat, **Then** the coach refuses that tactic.

---

### User Story 5 - See which help was chosen; keep dedicated screens (Priority: P5)

After a unified-chat reply, the user can tell which kind of help the coach used for that turn (general ask, bio rewrite, message analysis, openers, or public-profile coaching). Dedicated Bio, Message, Openers, Profile, Simulation, and Library screens continue to work as they do today. An unclear message is treated as general coaching rather than a guessed rewrite. Each turn is classified independently (a follow-up may use a different capability).

**Why this priority**: Trust and non-regression. P1 must not silently replace specialized screens or hide what the coach decided.

**Independent Test**: Send one general question and one bio-rewrite request in the unified chat and confirm each reply labels a different kind of help; then complete a Bio Studio rewrite on the dedicated screen and confirm it still works.

**Acceptance Scenarios**:

1. **Given** a unified-chat reply, **When** the user looks at that turn, **Then** they can see which single coaching capability was used (human-readable, Vietnamese-friendly).
2. **Given** dedicated Bio / Message / Openers / Profile screens, **When** the user uses them as before, **Then** those paths still produce their existing outcomes and are not removed or forced through the unified chat.
3. **Given** an ambiguous message that is neither a clear draft-rewrite nor a clear opener request, **When** the user sends it in the unified chat, **Then** the coach uses general coaching (ask) rather than inventing a bio or fabricating openers.
4. **Given** two consecutive unified-chat messages with different jobs (for example a question, then “sửa bio này: …”), **When** both are sent in the same session, **Then** each turn uses its own single capability.

---

### Edge Cases

- Knowledge library empty, retrieval weak, or topic not covered: same refuse/hedge as the chosen capability; no invented studies, statistics, or clinical claims.
- Safety (matchmaking, NSFW companion, deepfake, scrape, therapy, coercion): refuse **before** choosing a specialized rewrite/opener path; empty citations; session remains usable for a later allowed question.
- Empty or whitespace-only unified-chat message: ask the user to type something; do not crash the session.
- Extremely long input: ask the user to shorten; same length limit spirit as existing coaching paths.
- Mixed Vietnamese and English: reply in the language of the latest user message when practical; capability labels Vietnamese-friendly.
- Message that asks for two jobs at once (“sửa bio rồi viết opener”): P1 uses **exactly one** capability this turn (prefer the clearest job; if still unclear, general ask) and MAY say the other job can be a follow-up. Multi-step chaining in one turn is out of scope.
- Chat-simulation / roleplay-as-the-other-person: do not silently enter simulation from the unified chat; the dedicated simulation screen remains the path for that.
- Knowledge index not ready: tell the user the library is not ready; do not invent answers.
- Forbidden intents MUST NOT attach knowledge citations.
- Follow-up after a refusal: stay refused on the forbidden intent; allow a related allowed coaching question in the same session.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A user MUST be able to send a natural-language coaching message in a unified chat without first choosing a specialized screen.
- **FR-002**: For each unified-chat turn, the coach MUST choose **exactly one** existing coaching capability: general ask, bio rewrite, message analysis, openers, or public-profile context.
- **FR-003**: The coach MUST apply the same grounding, citation, hedge/refuse, disclaimer, and safety rules as the chosen capability already uses. Routing MUST NOT become a second, ungrounded advice path.
- **FR-004**: Safety screening MUST run before the coach commits to a specialized capability. A blocked request MUST refuse and MUST NOT be rewritten as a helpful bio or opener playbook.
- **FR-005**: When the message is a covered general coaching question, the unified chat MUST behave as the existing ask path (cited reply or refuse/hedge).
- **FR-006**: When the message clearly asks to rewrite the user’s own bio and includes a usable draft, the unified chat MUST return rewrite help plus a copy-ready improved bio.
- **FR-007**: When the message clearly asks to analyze or rewrite a message draft and includes a usable draft, the unified chat MUST return tone and clarity feedback, interpersonal-risk notes when relevant, and a copy-ready revision.
- **FR-008**: When the message clearly asks for first-message openers and includes a usable context, the unified chat MUST return at least two distinct opener options.
- **FR-009**: When the message clearly asks to coach from pasted public-visible profile text and includes that paste, the unified chat MAY use public-profile coaching. Handle/URL-only messages MUST NOT be treated as a live profile load.
- **FR-010**: If a specialized capability is chosen but a required draft or context is missing, the coach MUST ask the user to paste it rather than inventing content.
- **FR-011**: If the intended capability is unclear, the coach MUST use general ask (not a guessed bio rewrite, message rewrite, or opener list).
- **FR-012**: The user MUST be able to see which single capability was used for that unified-chat turn.
- **FR-013**: Dedicated Bio, Message, Openers, Profile, Simulation, and Library paths MUST remain available and MUST keep their existing behavior. The unified chat is additive.
- **FR-014**: Chat simulation (roleplay as a dating persona) MUST NOT be started from the unified-chat router in this feature.
- **FR-015**: The coaching service MUST remain the system of record. The chat client MUST only talk to that service; it MUST NOT classify intents or call a language model in the browser.
- **FR-016**: Session memory MUST stay ephemeral by default. Routing MUST NOT create a durable people dossier or saved-history product.
- **FR-017**: A reviewer MUST be able to run a small set of known routing examples covering: general ask, bio rewrite, message analysis, openers, an ambiguous fallback to ask, a missing-draft ask-to-paste, and a safety refusal.
- **FR-018**: Multi-step chaining (retrieve then rewrite then openers in one turn) is OUT of scope for this feature.

### Key Entities

- **Unified Chat Turn**: One user message in the natural-language coaching chat plus the coach reply for that sitting. Independently classified; not a multi-step plan.
- **Routed Capability**: The single existing coaching job chosen for that turn (general ask, bio rewrite, message analysis, openers, public-profile coaching). Visible to the user; recorded as the turn’s intent.
- **Capability Outcome**: The same reply shape the dedicated path already returns (reply text, citations, optional improved draft, optional openers, optional tone/clarity/risk, refusal/hedge, disclaimer).
- **Routing Decision**: The choice of one capability (or ask-for-paste / refuse) made after safety screening. Not shown as an internal chain of tools.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time demo user can send a covered general coaching question in the unified chat, without opening a specialized screen, and receive a reply with at least one visible source citation in a single sitting.
- **SC-002**: On a labeled set of at least ten routing examples (general ask, bio rewrite, message analysis, openers, public-profile paste, ambiguous, missing draft, and at least one safety refusal), a reviewer finds the coach used the expected capability or refusal in at least 80% of cases.
- **SC-003**: For a known bio-rewrite example sent in the unified chat, the user receives a copy-ready improved bio in the same sitting.
- **SC-004**: For a known message-analysis example sent in the unified chat, the user receives tone and clarity feedback plus a revised version in the same sitting.
- **SC-005**: For a known opener-request example sent in the unified chat, the user receives at least two distinct opener options in the same sitting.
- **SC-006**: For a known ambiguous example, the coach uses general coaching and does not invent a bio rewrite or a pair of openers.
- **SC-007**: For known matchmaking, scrape, and therapy/diagnosis examples sent in the unified chat, the coach refuses in 100% of those cases and does not perform the forbidden action.
- **SC-008**: Dedicated Bio, Message, Openers, and Profile screens still complete their original happy-path tasks in the same demo sitting.
- **SC-009**: On each unified-chat reply, a reviewer can identify the capability used without reading server logs.
- **SC-010**: A reviewer can finish the primary unified-chat demo (one ask + one routed rewrite) in under five minutes including reading, on a typical laptop connection.

## Assumptions

- Target user is the same solo demo user as 001 — local or simply deployed app, no accounts.
- “Unified chat” is the existing Ask Coach sitting, not a new product brand or a second chatbot.
- P1 means **one capability per turn**. A message that names two jobs gets one job now; the rest is a follow-up. That is intentional, not a defect.
- Classifier mistakes that still produce grounded, safe coaching via general ask are acceptable; inventing drafts or skipping safety is not.
- Public-profile routing from unified chat is paste-in-the-message only. Screenshot upload and the dedicated form remain the complete profile-context experience.
- Simulation, knowledge upload, batch ingest, and usage analytics are unchanged and out of this feature’s scope except “do not break them.”
- Vietnamese-friendly labels for the routed capability (for example “Sửa bio”, “Phân tích tin nhắn”); English identifiers in the service.
- Existing length limits (~8000 characters) and ephemeral sessions continue to apply.
- Evaluation uses the project’s usual golden/contract style with a mocked language model for routing examples unless a live key is explicitly used in a manual sitting.

## Out of Scope

- Multi-step tool chaining in one turn (retrieve → rewrite → openers as a plan) — that is P2
- Multi-agent crews (planner, critic, researcher as separate agents)
- Starting chat simulation from the unified chat
- Removing or replacing dedicated Bio / Message / Openers / Profile screens
- New knowledge corpus, new embedder, or a second vector store
- Matchmaking, scraping, Instagram login, durable crush dossiers
- Auth, payments, mobile apps, voice
- Browser-side intent classification or direct model calls from the UI
