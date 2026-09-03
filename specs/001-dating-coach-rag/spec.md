# Feature Specification: Dating Coach RAG (MVP Coaching Chat)

**Feature Branch**: `001-dating-coach-rag`

**Created**: 2026-09-03

**Status**: Draft

**Input**: User description: "Build Dating Coach RAG, a personal AI dating coach chatbot (not a dating app). Users chat with a coach that helps with profile/bio writing, first-message openers, and analyzing/rewriting message drafts. Answers must be grounded via RAG over a curated knowledge base of dating communication guides. Core value is a Backend API (chat session, ask, analyze-message) with streaming responses and source citations; UI is a minimal chat client for demo. When the knowledge base has no support, the coach must clearly say it cannot advise rather than invent facts or clinical guidance. Out of scope for this first feature: user matching, swipe UI, payments, voice, WhatsApp, real-user social graph, NSFW AI companion, therapy diagnosis, and heavy admin/auth. Success for MVP: a user can (1) ask a coaching question and get a cited answer, (2) submit a bio draft and get rewrite suggestions, (3) paste a message draft and get tone/clarity feedback with a revised version."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ask a grounded coaching question (Priority: P1)

A demo user opens the chat, starts (or continues) a coaching session, and asks a dating-communication question (for example: how to pace a conversation, how to set a boundary, or what a weak bio looks like). The coach replies in the same chat with advice drawn from the curated knowledge library and shows which sources were used. If the library does not support the question, the coach says it cannot advise (or clearly hedges) instead of inventing studies, statistics, or clinical guidance.

**Why this priority**: Grounded Q&A is the core product promise. If this slice works, the project already demonstrates a knowledge-grounded coach rather than a generic chatbot.

**Independent Test**: From a fresh session, ask a question that the starter library covers and confirm a cited reply; ask a question the library cannot support and confirm a refusal or hedge. No bio or message-rewrite tools are required.

**Acceptance Scenarios**:

1. **Given** a coaching session is available and the knowledge library covers the topic, **When** the user submits a dating-communication question, **Then** the user receives a coaching reply in the same chat and can see at least one source citation for material used.
2. **Given** a coaching session is available and the knowledge library does not support the question, **When** the user submits that question, **Then** the coach clearly states it cannot advise or must hedge, and does not invent facts, studies, or clinical claims.
3. **Given** the user has already asked at least one question in this session, **When** they ask a follow-up, **Then** the coach can use that session’s recent messages as context without requiring the user to paste the prior question again.
4. **Given** a session is open, **When** the user reads the chat, **Then** a short disclaimer is visible that this coach is not a substitute for professional mental-health care.

---

### User Story 2 - Rewrite a profile / bio draft (Priority: P2)

The user pastes a profile or bio draft and asks for help. The coach returns concrete rewrite suggestions (what to change and at least one improved version or set of alternatives), grounded in the library’s profile/bio guidance. The user stays in the same chat; they do not need a separate dating app or editor.

**Why this priority**: Bio help is a distinct, demoable outcome from the product brief and MVP success list. It can ship after grounded Q&A and still be valuable on its own.

**Independent Test**: Paste a short weak bio into the chat (or a dedicated bio-help action in the same client) and confirm rewrite suggestions plus an improved draft. Does not require message-analysis or opener flows.

**Acceptance Scenarios**:

1. **Given** a coaching session and a non-empty bio draft, **When** the user asks for bio help, **Then** they receive at least one specific rewrite suggestion and an improved bio they can copy.
2. **Given** a bio draft that is empty or only whitespace, **When** the user asks for bio help, **Then** the coach asks for a draft instead of inventing a biography of a real person.
3. **Given** bio guidance exists in the knowledge library, **When** rewrite suggestions are shown, **Then** the reply cites the bio/profile sources used (or clearly hedges if retrieval is weak).
4. **Given** retrieval is weak, **When** the user still asks for bio help, **Then** the coach MAY offer writing-craft suggestions (clarity, length, specificity) but MUST NOT invent dating studies, statistics, or clinical claims.

---

### User Story 3 - Analyze and rewrite a message draft (Priority: P3)

The user pastes a message they are about to send (or already sent) and asks for feedback. The coach comments on tone, clarity, and interpersonal risk (for example: sounding demanding, unclear, or boundary-crossing) and provides a revised version. Feedback follows the knowledge library; it does not diagnose mental health or score a real person as a match.

**Why this priority**: Message analysis is the third MVP success path and the most sensitive (users may paste personal text). It is independently valuable once Q&A works, but it is not required to prove grounded coaching.

**Independent Test**: Paste a message draft, receive tone/clarity (and risk) notes plus a revised version. Bio rewrite and opener generation are not required.

**Acceptance Scenarios**:

1. **Given** a non-empty message draft, **When** the user asks to analyze or rewrite it, **Then** they receive feedback covering tone and clarity, a note on interpersonal risk when relevant, and a revised version they can copy.
2. **Given** an empty draft, **When** the user asks for message analysis, **Then** the coach asks for the draft instead of fabricating a conversation with a real person.
3. **Given** the draft requests help that would be deceptive, coercive, or harmful, **When** the user asks for a rewrite, **Then** the coach refuses that tactic and, when possible, offers a respectful alternative or a clear refusal.

---

### User Story 4 - Suggest first-message openers (Priority: P4)

The user describes a first-contact context (for example: dating app, mutual friend, or after matching on shared interests) without identifying a real target as someone to be matched by the product. The coach suggests multiple opener options consistent with the knowledge library.

**Why this priority**: Openers are part of the stated coaching job, but MVP success can already be shown with P1–P3. This slice can wait until those three flows work.

**Independent Test**: Provide a context (app vs mutual friend, topic of common interest) and confirm at least two distinct opener suggestions with citations or a hedge.

**Acceptance Scenarios**:

1. **Given** a first-contact context with no request to match real people, **When** the user asks for openers, **Then** they receive at least two distinct opener options they can copy.
2. **Given** the user asks the product to find, rank, or introduce real people, **When** they request openers or matches, **Then** the coach refuses matchmaking and may still offer generic opener advice if the library supports it.

---

### Edge Cases

- Knowledge library is empty, retrieval is weak, or the topic is not covered: coach refuses or hedges; no invented studies, statistics, or clinical claims.
- User asks the product to match, rank, or introduce real people: refuse matchmaking; do not store a social graph.
- User requests NSFW companion / intimate roleplay, deepfakes, or scraping of private dating profiles: refuse.
- User asks for therapy, diagnosis, or treatment of mental-health conditions: refuse and point back to the not-therapy disclaimer; do not impersonate a clinician.
- User asks for deceptive, coercive, or non-consensual tactics: refuse; do not provide a “how to manipulate” playbook.
- Empty, whitespace-only, or extremely long bio/message input: ask for a usable draft or ask the user to shorten; do not crash the session.
- User pastes highly intimate or identifying content: coach may still give in-session help, but the product does not retain that content as a saved history feature by default.
- Follow-up questions after a refusal: stay refused on the forbidden intent; allow a related allowed coaching question in the same session.
- Mixed Vietnamese and English: reply in the language of the user’s latest message when practical; keep labels and buttons Vietnamese-friendly.
- Safety refusals (matchmaking, NSFW companion, deepfake, scrape, therapy, coercion) MUST NOT attach knowledge citations — an empty citation list, never invented sources.
- Knowledge index missing or not ready: the coach tells the user it cannot advise yet (same sitting, session stays up) rather than inventing answers. This is distinct from “library does not cover this topic” when the index is loaded but retrieval is empty or weak.
- After a blocked intent, the same session remains usable for a later allowed question; the user does not start over unless they close the client.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A user MUST be able to start a coaching session from a minimal chat client and send a message without creating an account.
- **FR-002**: The coaching service MUST be the system of record for the session, questions, analysis requests, and replies; the chat client MUST be a thin demo surface over that service, not a second source of truth.
- **FR-003**: Users MUST be able to ask a dating-communication coaching question and receive a reply in the same session.
- **FR-004**: Coaching answers MUST be grounded in retrieved material from a curated knowledge library. The user MUST be able to see which sources were used (title or equivalent human-readable citation).
- **FR-005**: If retrieval is empty or too weak to support the answer, the coach MUST refuse or clearly hedge. The coach MUST NOT invent studies, statistics, or clinical claims.
- **FR-006**: Users MUST be able to submit a profile/bio draft and receive concrete rewrite suggestions plus at least one improved version they can copy.
- **FR-007**: Users MUST be able to submit a message draft and receive feedback on tone and clarity, interpersonal-risk notes when relevant, and a revised version they can copy.
- **FR-008**: Users MUST be able to describe a first-contact context and receive multiple opener suggestions (this may ship after FR-003–FR-007).
- **FR-009**: The product MUST refuse: matching or ranking real people, NSFW companion/roleplay, deepfakes, scraping private profiles, and clinical therapy or diagnosis claims.
- **FR-010**: Coaching MUST discourage harmful, coercive, or deceptive dating advice. When a rewrite would enable that, the system MUST refuse the tactic.
- **FR-011**: Every coaching session MUST surface a short disclaimer that the bot is not a substitute for professional mental-health care.
- **FR-012**: Session memory MUST be ephemeral by default. The product MUST NOT persist intimate or identifying user content as a saved-history feature unless the user later opts in (opt-in history is out of scope for this feature).
- **FR-013**: User-facing copy MUST be Vietnamese-friendly where natural. Users MAY ask in Vietnamese or English; the coach SHOULD reply in the language of the latest user message when practical. Identifiers in the service remain English.
- **FR-014**: The product MUST include a small starter knowledge library covering at least: profile/bio writing, first messages/openers, conversation pacing, boundaries and consent basics (non-clinical), and informational red flags (not diagnostic).
- **FR-015**: Knowledge MUST come only from curated, ethically sourced project materials. The product MUST NOT silently scrape paid dating apps or private profiles to fill the library.
- **FR-016**: A reviewer MUST be able to run a small set of known example cases covering: a correctly cited answer, a refuse-when-unknown path, a bio rewrite, and a message rewrite.
- **FR-017**: Replies MUST be delivered in the chat without sending the user to a separate app, voice channel, or messaging platform.
- **FR-018**: The coach MUST remain a coach: it MUST NOT present itself as a romantic partner, matchmaker of real users, or clinician.

### Key Entities

- **Coaching Session**: A short-lived conversation between one demo user and the coach. Holds recent turns for follow-up in that sitting. Not a durable account profile.
- **User Message**: A question, bio draft, message draft, or context the user submits. May contain personal wording; treated as sensitive and not stored as a product archive by default.
- **Coach Reply**: The coach’s answer, rewrite, or refusal, including any hedge language.
- **Citation**: A human-readable pointer to a knowledge source used for a reply (name/title; optional short excerpt). Shown to the user when sources were used.
- **Knowledge Source**: A curated guide in the project library (bio, openers, pacing, boundaries, red flags). Owned by the project; not a live scrape of dating apps.
- **Disclaimer**: The standing not-therapy, not-matchmaking notice shown in the session.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time demo user can ask a covered coaching question and receive a reply with at least one visible source citation in a single sitting, without leaving the chat.
- **SC-002**: A user can paste a bio draft and receive at least one concrete rewrite plus an improved version they can copy, in the same sitting.
- **SC-003**: A user can paste a message draft and receive tone and clarity feedback plus a revised version they can copy, in the same sitting.
- **SC-004**: For a known “library does not cover this” example, the coach states it cannot advise or clearly hedges, and a reviewer finds no invented study, statistic, or clinical claim in that reply.
- **SC-005**: For known examples of matchmaking real people, NSFW companion requests, and therapy/diagnosis requests, the coach refuses in 100% of those cases and does not perform the forbidden action.
- **SC-006**: During a coaching session, a reviewer can always find the short not-therapy disclaimer without hunting through hidden settings.
- **SC-007**: A reviewer can complete the four golden cases (cited answer, refuse-when-unknown, bio rewrite, message rewrite) in one demo sitting.
- **SC-008**: A user can finish each primary task (ask, bio help, message help) in under five minutes, including reading the reply, on a typical laptop connection.

## Assumptions

- Target user is a single demo user (builder or reviewer) on a local or simply deployed app — not a multi-user social network.
- No account registration, payments, or admin console in this feature.
- Starter knowledge is a small curated set the builder supplies; quality matters more than coverage. Expanding the library later is expected.
- Bio help, message analysis, and openers may be invoked as ordinary chat messages with clear intent; a dedicated button per intent is optional if the chat path is obvious in the demo.
- “Risk” in message feedback means interpersonal/communication risk (tone, pressure, consent, clarity), not credit, legal, or clinical risk scoring.
- Bio/message rewrites may still comment on writing craft when retrieval is weak; they still MUST NOT invent dating-science or clinical claims (same rule as FR-005).
- Openers (User Story 4) may trail P1–P3 in delivery order; P1–P3 are the MVP success bar stated in the product brief.
- Vietnamese-friendly UI labels; English is acceptable in citations if the source itself is English.
- Session context is in-memory for the sitting; closing the client starts a new session.
- Voice, WhatsApp, mobile apps, swipe/match UI, and real-user graphs are out of scope.
- The coaching service may deliver the reply progressively so the user is not staring at a frozen chat, but the user-visible requirement is “stay in the same chat and get a complete reply,” not a particular transport.

## Out of Scope

- Matching, ranking, or introducing two real people; swipe UI; maps of users
- Payments, subscriptions, and account/auth suites
- Voice, WhatsApp, SMS, or a native mobile app
- NSFW / 18+ companion or intimate roleplay
- Clinical therapy, diagnosis, or crisis-hotline replacement (disclaimer only; no clinical workflow)
- Fine-tuning a custom model as a product requirement
- User-uploaded knowledge libraries and a full admin ingestion console (starter corpus is builder-curated)
- Durable chat history, analytics dashboards, and multi-tenant admin
- Scraping dating apps or private profiles to grow the knowledge library
