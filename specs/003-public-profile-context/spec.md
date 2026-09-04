# Feature Specification: Public Profile Context Coaching

**Feature Branch**: `003-public-profile-context`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Gửi profile Instagram của đối tượng tìm hiểu rồi nhận xu hướng tư vấn hợp lý. Cơ chế share profile public without login; tài khoản private tính sau. Không scrape, không ghép đôi người thật."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Coach from a public profile the user can already see (Priority: P1)

A demo user is getting to know someone whose Instagram (or similar public social) profile is **public**. They paste what they can already see without logging into that network on behalf of the product: optional public handle or profile link, plus the public bio and/or a few public captions or visible “vibe” notes, and optionally a few screenshots of posts or stories they already opened. The coach replies in the same product sitting with communication advice grounded in the coaching library: how to open, what tone fits, what to ask, and interpersonal risks. The product does not fetch the profile in the background and does not rank or match real people.

**Why this priority**: This is the core new value — context-aware coaching from a real public profile **the user already viewed**, without Instagram login and without scraping.

**Independent Test**: Paste a public handle plus a short public bio/caption excerpt; receive coaching (openers and/or tone advice) with library citations or a clear hedge. No login to Instagram is required. A private-account fetch is not part of this test.

**Acceptance Scenarios**:

1. **Given** a coaching session and a non-empty paste of public-visible profile text (bio and/or captions), **When** the user asks for advice about how to approach that person in conversation, **Then** they receive coaching in the same sitting (tone/approach and at least one concrete next-message or opener suggestion when the library supports it) and can see source citations when knowledge was used.
2. **Given** only a public handle or profile link with **no** pasted visible content, **When** the user submits, **Then** the product asks them to paste what they can already see publicly rather than claiming to have loaded the profile automatically.
3. **Given** the user asks the product to find, rank, score compatibility, or match them with that person as a dating service, **When** they submit the profile context, **Then** the coach refuses matchmaking and does not perform ranking of a real person.
4. **Given** the session is open, **When** the user reads the result, **Then** the standing not-therapy / not-matchmaking disclaimer remains visible.
5. **Given** a coaching session and one to three screenshots of public posts or stories the user already viewed (with or without pasted captions), **When** they ask for approach advice, **Then** they receive coaching from that visible vibe in the same sitting. The product does not claim it loaded the live profile and does not keep the images as a saved crush album.

---

### User Story 2 - Clear handling when the profile is private or empty (Priority: P2)

The user indicates the account is private, or they cannot see public content. The product does **not** try to open a private profile. It explains that private accounts are out of scope for this feature and invites the user to paste only content the other person already shared with them (for example a bio they sent in chat). The same session stays usable for ordinary coaching questions.

**Why this priority**: Prevents unsafe or futile “fetch private Instagram” attempts and sets an honest boundary. Independently testable after P1.

**Independent Test**: Submit a note that the account is private (with or without a handle) and confirm a clear cannot-fetch message, no invented profile details, session still usable.

**Acceptance Scenarios**:

1. **Given** the user states the account is private or locked, **When** they request coaching from that profile, **Then** the product states it cannot load private profiles in this feature and does not invent bio, posts, or photos.
2. **Given** that private-account message, **When** the user then pastes text the other person sent them in chat, **Then** the coach MAY advise on communication from that pasted text as ordinary message/context coaching.
3. **Given** empty or whitespace-only context, **When** they submit, **Then** the product asks for usable public-visible text instead of generating a fake profile.

---

### User Story 3 - Stay a coach: no scrape, no archive of the other person (Priority: P3)

The user can finish the sitting without creating an Instagram account inside this product and without the product storing the other person’s profile as a lasting archive. Asking the product to scrape, crawl, or silently download Instagram (or dating apps) is refused.

**Why this priority**: Encodes constitution safety/privacy. Can be demonstrated with refusal copy even if P1 already works.

**Independent Test**: Ask the product to scrape or auto-download an Instagram profile; confirm refusal. After a successful P1 paste sitting, confirm the product does not present a saved “crush profile” history as a feature.

**Acceptance Scenarios**:

1. **Given** a request to scrape, crawl, or automatically download someone’s Instagram or dating-app profile, **When** the user submits it, **Then** the coach refuses that action in clear language.
2. **Given** a completed public-paste coaching sitting, **When** the user starts a new session or ends the sitting, **Then** the product does not offer a durable saved dossier of that other person as a product feature (session remains ephemeral by default).

---

### Edge Cases

- Handle or public link only, no pasted bio/captions and no screenshots: ask for visible content; do not pretend the profile was loaded.
- Screenshots without caption text: still usable public-visible context if the images were supplied by the user.
- Too many or oversized screenshots: ask to send fewer/smaller images rather than crash the sitting.
- User pastes a private-account screenshot description or says “mình không xem được”: treat as private-out-of-scope, not as a fetch job.
- User pastes highly identifying details (full name, workplace, location): coach may still give in-session communication advice but must not store a people-search archive and must not encourage stalking or scraping.
- User asks “người này có thích mình không?” or to score match %: refuse fortune-telling/matchmaking of a real person; may still offer communication-hygiene advice from the pasted text.
- Mixed Vietnamese/English paste: reply in the language of the latest user message when practical.
- Safety refusals (matchmaking, scrape, NSFW companion, therapy, coercion) must not attach knowledge citations as if the refusal were grounded dating advice.
- Extremely long paste: ask to shorten to a usable excerpt rather than crash the session.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A user MUST be able to provide public-visible profile context (bio and/or captions or equivalent notes they can already see) without creating an Instagram or dating-app account inside this product.
- **FR-002**: The product MUST treat an optional public handle or public profile link as a label only unless accompanied by pasted visible content; it MUST NOT claim to have automatically fetched the live profile.
- **FR-003**: When usable public-visible text is provided, the coaching service MUST return communication advice in the same sitting (approach/tone and, when the knowledge library supports it, concrete opener or next-message suggestions) grounded in the curated coaching library with citations when sources are used.
- **FR-004**: If retrieval is too weak, the coach MUST refuse or hedge rather than invent facts about that real person (no invented posts, follower counts, or “studies about this person”).
- **FR-005**: The product MUST refuse matchmaking, ranking, or compatibility scoring of real people even when a profile context is supplied.
- **FR-006**: The product MUST refuse scraping, crawling, or silent download of Instagram, dating apps, or private profiles.
- **FR-007**: Private or locked accounts are out of scope for automatic loading. The product MUST say so clearly and MUST NOT invent private content.
- **FR-008**: Session memory for pasted profile text MUST remain ephemeral by default (no saved-history dossier of the other person as a product feature).
- **FR-009**: The not-therapy, not-matchmaking disclaimer MUST remain visible during this flow.
- **FR-010**: User-facing copy MUST be Vietnamese-friendly. Coaching SHOULD reply in the language of the latest user message when practical.
- **FR-011**: The product MUST NOT require the user to log in to Instagram (or any third-party social network) to complete the public-paste coaching sitting.
- **FR-012**: A user MUST be able to attach a small number of screenshots of public posts or stories they already viewed. Those images are request-scoped coaching context only: not fetched from a social host, not added to the knowledge library, and not kept as a durable album of the other person.
- **FR-013**: Screenshots count as usable public-visible context. Handle/link with neither pasted text nor screenshots MUST still ask for visible content.

### Key Entities

- **Public Profile Context**: Optional public handle or public link plus user-pasted text and/or user-supplied screenshots of posts/stories already visible to them. Not a live scrape result.
- **Coaching Session**: Short-lived sitting that may include this context as user input. Not an account graph of real people.
- **Coach Reply**: Communication advice, openers/next-message suggestions, or a refusal/hedge, plus citations when knowledge was used.
- **Privacy Boundary**: Distinction between public-visible paste (in scope) and private-account fetch (out of scope).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time demo user can paste public-visible bio/caption text (with or without a handle) and receive communication coaching in one sitting, without logging into Instagram inside this product.
- **SC-002**: When only a handle/link is submitted with no pasted visible text, 100% of review runs ask for pasted public content rather than showing a fabricated profile summary.
- **SC-003**: For a known “please scrape this Instagram / dating profile” example, the coach refuses in 100% of those cases and does not return downloaded posts.
- **SC-004**: For a known “this account is private, load it anyway” example, the product states private loading is out of scope in 100% of those cases and invents no private posts.
- **SC-005**: For a known matchmaking/ranking request attached to a named real person and a pasted bio, the coach refuses matchmaking in 100% of those cases.
- **SC-006**: A reviewer can complete the public-paste happy path in under five minutes on a typical laptop sitting, including reading the reply.
- **SC-007**: A reviewer can attach at least one screenshot of a public post/story they already saw and receive coaching in the same sitting, without the product offering a saved photo album of that person.

## Assumptions

- This feature extends the existing dating-communication coach; it does not turn the product into a social graph, Instagram client, or matchmaker.
- Instagram is the primary example of a public profile source; the same paste pattern MAY apply to other public bios the user can already see. Automatic import from other networks is out of scope.
- “Without login” means the **coaching product** does not require Instagram (or similar) authentication. The user may already be logged into Instagram in their own browser; the product still does not fetch on their behalf.
- Private-account access, Instagram OAuth, and any automated public crawl of Instagram/TikTok/dating apps remain out of scope.
- Public **YouTube Data API** and **Reddit JSON** may be fetched when the user pastes those URLs (short snippet only, ephemeral, not a knowledge source). Handle stays a label for a possible later save — not a fetch key.
- Ephemeral sessions from the current product remain the default; no new durable people database.
- Knowledge grounding still comes from the curated project library, not from scraped Instagram posts as a new knowledge base.
- Vietnamese-friendly UX; identifiers in the service remain English.
