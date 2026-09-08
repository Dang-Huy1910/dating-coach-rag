# Feature Specification: Session Coaching Kit (P3)

**Feature Branch**: `010-session-kit`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description: "P3 session kit: after the unified chat produces a bio rewrite, openers, or message analysis, the coach writes those artifacts into the sitting so Bio Studio, Openers, and Message screens already show them. The user does not copy from chat to another tab in this app. The product still does not send messages or publish bios to dating apps. The kit is ephemeral with the session. Safety refusals do not fill the kit with forbidden drafts."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bio is already in Bio Studio after chat (Priority: P1)

A demo user asks the unified chat to rewrite a pasted bio. They then open Bio Studio **without copying anything**. The improved bio (and enough context to keep working) is already there. They can copy from Bio Studio to a dating app if they want — they do not ferry text between tabs of this product.

**Why this priority**: The user’s test of “is this an agent” is whether the coach **puts the result where the job lives**, not only in the chat bubble. Bio is the clearest artifact.

**Independent Test**: In Hỏi coach, send a bio-rewrite request with a paste. Open Bio Studio without using the clipboard. Confirm the improved bio is visible. Openers screen is not required for this test.

**Acceptance Scenarios**:

1. **Given** a successful bio rewrite in the unified chat this sitting, **When** the user opens Bio Studio without copying, **Then** they see that improved bio already filled.
2. **Given** a two-job chat turn that rewrote a bio and suggested openers, **When** the user opens Bio Studio, **Then** the improved bio is present (openers are a separate screen).
3. **Given** Bio Studio already shows a kit bio, **When** the user edits and asks Bio Studio to refine again, **Then** that dedicated path still works and the sitting’s bio artifact updates to the new result.
4. **Given** the chat only answered a general question with no bio rewrite, **When** the user opens Bio Studio, **Then** it does not invent a bio from that Q&A.

---

### User Story 2 - Openers are already on the Openers screen (Priority: P2)

After the unified chat produces opener suggestions (alone or after a bio rewrite), the user opens the Openers screen without copying. The suggested openers are already listed and copyable there.

**Why this priority**: Same agent test for the second artifact. Independent of Bio Studio once a kit write exists.

**Independent Test**: Get at least two openers from Hỏi coach, open Openers without clipboard, confirm those options are shown.

**Acceptance Scenarios**:

1. **Given** a successful opener job in this sitting’s unified chat, **When** the user opens the Openers screen without copying, **Then** they see at least those opener options already listed.
2. **Given** a two-job turn (rewrite bio then openers), **When** the user opens Openers then Bio Studio, **Then** each screen shows its own artifact (openers vs improved bio), both from that sitting.
3. **Given** the user generates new openers on the dedicated Openers screen, **When** that succeeds, **Then** the sitting’s opener list updates to that new result.

---

### User Story 3 - Message kit, empty session, and safety (Priority: P3)

A message-analysis turn fills the Message screen the same way. Starting a new sitting clears the kit. A refused (scrape/matchmaking/etc.) turn does not plant a deceptive draft into Bio/Openers/Message. The chat tells the user that artifacts were saved to the sitting (Vietnamese-friendly), without claiming it posted anything to a dating app.

**Why this priority**: Completes the kit and prevents “agent” from meaning “smuggle a bad draft into another tab.”

**Independent Test**: Analyze a message in chat, open Message and see the revision; new session → empty Bio Studio kit; safety refuse → Message/Bio/Openers not filled with a playbook.

**Acceptance Scenarios**:

1. **Given** a successful message analysis in unified chat, **When** the user opens the Message screen without copying, **Then** they see the revised draft and, when present, tone/clarity/risk notes.
2. **Given** the user starts a new sitting, **When** they open Bio Studio / Openers / Message, **Then** they do not see the previous sitting’s kit artifacts.
3. **Given** a safety refusal in unified chat, **When** the user opens those screens, **Then** no new improved bio, opener list, or revised message from that refused turn is sitting there.
4. **Given** a successful kit write, **When** the user reads the chat reply, **Then** they are told the result was saved to this sitting’s Bio / Openers / Message (as applicable), and they are **not** told the product sent or published anything outside the app.

---

### Edge Cases

- Partial two-job turn: rewrite completed, openers skipped for missing context → Bio Studio fills; Openers does not invent openers.
- Kit slot only updates when that job **completed** with a real artifact; skipped/refused jobs do not overwrite a previous good artifact with emptiness **or** with invented text.
- Dedicated screens remain usable with empty kit (placeholder / empty state as today).
- Chat copy-ready cards may remain; they are no longer the only way to move text inside the app.
- Closing the client / deleting the session drops the kit (ephemeral).
- Simulation, Knowledge, Profile-context screens: Profile may show pasted-context coaching text if we store a short approach note — **out of scope** unless a message-analysis/bio/opener artifact exists. Do not store screenshots in the kit.
- Extremely long artifacts: same length limits as coaching input.
- User still copies **out** of the product (to Tinder/Zalo) if they choose; that is not a product failure.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: After a successful bio rewrite in this sitting (unified chat **or** Bio Studio), the sitting MUST hold that improved bio so Bio Studio can show it without the user copying from chat.
- **FR-002**: After a successful opener job in this sitting (unified chat **or** Openers screen), the sitting MUST hold those openers so the Openers screen can show them without copying from chat.
- **FR-003**: After a successful message analysis in this sitting (unified chat **or** Message screen), the sitting MUST hold the revised draft (and tone/clarity/risk when produced) so the Message screen can show them without copying from chat.
- **FR-004**: The kit MUST be the coaching service’s sitting data, not only browser memory of one tab. Refreshing or switching screens in the same sitting MUST still see the kit.
- **FR-005**: A new sitting or discarded sitting MUST start with an empty kit.
- **FR-006**: Safety-refused turns MUST NOT write a new improved bio, opener list, or revised message into the kit.
- **FR-007**: Skipped / missing-draft jobs MUST NOT invent kit artifacts. They MUST NOT wipe an earlier good artifact for a different slot.
- **FR-008**: The unified-chat reply MUST tell the user, in Vietnamese-friendly copy, which sitting screens were updated. It MUST NOT claim the product posted, sent, or logged into a dating app.
- **FR-009**: Dedicated Bio / Openers / Message screens MUST remain able to run their own generate/refine actions; successful results MUST update the same kit.
- **FR-010**: The chat client MUST only read/write the kit through the coaching service (HTTP). It MUST NOT be the only copy of the kit.
- **FR-011**: The product MUST NOT send messages, publish bios, or log into dating apps as part of this feature.
- **FR-012**: A reviewer MUST be able to run: chat rewrite → Bio Studio filled; chat openers → Openers filled; new session empties kit; safety refuse does not fill kit.

### Key Entities

- **Sitting Kit**: The ephemeral workspace for one coaching sitting. Holds the latest successful bio artifact, opener list, and/or message-analysis artifact. Not a user account, not a crush dossier.
- **Kit Slot**: One kind of artifact (bio, openers, message). Updated independently when that job completes.
- **Kit Write**: A successful coaching job committing an artifact into a slot. Refusals and skip-for-paste are not writes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After one successful unified-chat bio rewrite, a reviewer opens Bio Studio without using the clipboard and sees that improved bio in the same sitting.
- **SC-002**: After one successful unified-chat opener job (including as the second job of a two-job turn), a reviewer opens Openers without the clipboard and sees at least two of those openers.
- **SC-003**: After a two-job bio+openers chat turn, Bio Studio and Openers both show their artifacts in the same sitting without copying between tabs.
- **SC-004**: Starting a new sitting clears kit artifacts so Bio Studio / Openers do not show the previous sitting’s bio or openers.
- **SC-005**: For known safety-refusal examples, Bio Studio / Openers / Message gain no new copy-ready playbook from that turn (100% of those cases).
- **SC-006**: A reviewer can complete the primary demo (chat two-job → open Bio → open Openers, including reading) in under five minutes.
- **SC-007**: On a successful kit write, the chat makes it clear the result lives in this sitting’s screens — and does not claim an external send/publish.

## Assumptions

- Built on P1 unified chat and P2 multi-step jobs. P3 adds **where results live**, not new coaching jobs.
- Kit is in-memory for the sitting (same lifetime as today’s session). Restarting the API process drops it, same as chat turns.
- Last successful write wins per slot. Bio updates do not clear openers.
- Copy-to-clipboard buttons stay for **leaving** the product. The failure P3 fixes is copy **inside** the product.
- Auto-copy to the OS clipboard without a tap is out of scope.
- Profile-context screenshots stay out of the kit.
- Vietnamese-friendly banners on Bio / Openers / Message when content came from the sitting kit (e.g. “Đã điền từ Hỏi coach”).

## Out of Scope

- Sending or publishing to Tinder, Zalo, Instagram, or any external app
- Logging into dating apps or scraping
- Durable cloud save / user accounts
- Auto-copy to OS clipboard without a user tap
- Filling Simulation or Knowledge from the kit
- Multi-agent crews
- Replacing dedicated screens
