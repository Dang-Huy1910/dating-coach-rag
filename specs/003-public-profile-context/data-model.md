# Data Model: Public Profile Context Coaching

**Branch**: `003-public-profile-context` | **Date**: 2026-09-04  
**Source entities**: `spec.md` Key Entities

Persistence: **unchanged** — in-process sessions; files for knowledge + FAISS. No relational database. Pasted profile text is **not** a durable entity.

---

## PublicProfileContext (request DTO only)

User-supplied public-visible context. **Not stored as its own row.** The sitting records a normal `Turn` whose `role_user_text` is a composed snapshot (handle + url + privacy + visible_text + question).

| Field | Type | Rules |
|-------|------|--------|
| `handle` | string \| null | Optional public handle/label; max 128; **never fetched** |
| `profile_url` | string \| null | YouTube or Reddit public URL may be fetched via official API; Instagram/TikTok remain labels only; max 500 |
| `visible_text` | string | Bio, captions, or notes the user can already see; trim; 0–8000 chars. Empty is allowed on the wire so the gate can return `need_visible_text` |
| `privacy` | enum | `public` \| `private` \| `unknown` (default `unknown`) |
| `question` | string \| null | Optional “how should I approach…”; max 2000 |
| `relationship_progress` | string \| null | User-written how far the sitting has progressed (new follow / chatting / met); max 2000 |
| `images` | list of `{mime_type, data_base64}` | Optional screenshots the user already saw; max 3; JPEG/PNG/WebP; ≤2MB decoded each. **Request-scoped only** — not written to disk, not a FAISS source |

**Validation**:
- At least one of `handle`, `profile_url`, `visible_text`, `question`, `images`, `privacy=private` should be present; completely empty body → 400 `empty_input`
- `visible_text` whitespace-only counts as empty unless `images` is non-empty
- Oversize fields → 400 `too_long`; too many images → 400 `too_many_images`; bad mime/payload → 400 `invalid_image`
- A value in `handle` / `profile_url` MUST NOT trigger any outbound HTTP
- Image bytes MUST NOT be copied into `Turn.role_user_text` (snapshot records a count only)

**Not this entity**: live Graph/oEmbed result, follower counts, a saved crush dossier or photo album.

---

## PrivacyBoundary

Computed, not persisted.

| Value | Meaning | Product action |
|-------|---------|----------------|
| `public_paste` | Usable `visible_text` **or** user screenshots, and not classified private | Retrieve + coach |
| `label_only` | Handle/URL (and/or question) without visible paste and without screenshots | 400 `need_visible_text` |
| `private_locked` | `privacy=private` **or** user states they cannot see the account | 200 refused; cannot-fetch copy; do not invent content |
| `scrape_requested` | User asked to crawl/download/auto-load | 200 refused (`safety` category `scrape`) |
| `matchmaking_requested` | Rank/match/score a real person | 200 refused (`safety` category `matchmaking`) |

---

## ProfileGateVerdict

Result of `profile_gate.classify(request)` **before** retrieve.

| Field | Type | Rules |
|-------|------|--------|
| `allowed` | bool | If false, do not retrieve-for-advice as a live profile |
| `code` | enum | `ok` \| `need_visible_text` \| `private_out_of_scope` \| `blocked_safety` |
| `safety_category` | SafetyCategory \| null | Set when `code=blocked_safety` |
| `user_message` | string | Vietnamese copy for 400 detail or 200 `reply` |

**Transitions**:
```text
request → safety.screen(concatenated text)
        → if blocked: blocked_safety
        → if privacy=private OR private-language: private_out_of_scope
        → if visible_text empty: need_visible_text
        → ok
```

Order matters: scrape/matchmaking/other safety wins over “please paste”; private wins over handle-only (a private handle should not look like “we just need a paste”).

---

## CoachingSession

Unchanged from 001. **No** `crush_profile` / `saved_profiles` field.

**Lifecycle**: `created` → `active` → `expired` (restart or DELETE). Profile paste dies with the session.

---

## Turn

Unchanged storage shape. `intent` enum extends:

`ask` \| `rewrite_bio` \| `analyze_message` \| `openers` \| **`profile_context`**

`role_user_text` for this intent is a composed snapshot, for example:

```text
handle: @example
url: https://instagram.com/example
privacy: public
question: Gợi ý opener lịch sự
visible:
<pasted bio/captions>
```

That snapshot is still ephemeral RAM only.

---

## CoachReply

Unchanged fields. `intent` may be `profile_context`.

| Field | Rules for this intent |
|-------|------------------------|
| `reply` | Tone/approach coaching, or refusal/hedge copy. Must not open by claiming the live profile was loaded |
| `openers` | When allowed and library supports: ≥1 concrete opener or next-message; otherwise null |
| `citations` | Library chunks only (`data/knowledge/...`). Empty on refuse. **Never** an Instagram URL as `path` |
| `refused` | True for safety, private-out-of-scope, or weak-retrieval refuse |
| `hedged` | True when retrieval is weak but a limited craft-only reply is allowed (no invented person-facts) |
| `disclaimer` | Standing not-therapy / not-matchmaking line |
| `improved_draft` / `tone` / `clarity` / `risk` / `analysis_points` | Unused (null) for this intent |

---

## SafetyVerdict

Existing entity. Categories unchanged: `matchmaking` \| `nsfw_companion` \| `deepfake` \| `therapy` \| `coercion` \| `scrape`.

Pattern expansions (implementation):
- **scrape**: Instagram/IG/Insta, Facebook, dating apps; Vietnamese “cào / tải / kéo profile”; “crawl/fetch/download this profile”
- **matchmaking**: “người này có thích mình không”, match %, tỉ lệ hợp, xếp hạng người này / profile này

Private-account language is handled in `ProfileGateVerdict`, not a new SafetyCategory.

---

## KnowledgeSource (additive)

Optional new starter file for this feature:

| Field | Value |
|-------|--------|
| `source_id` | `07-public-profile-context` |
| `title` | From first H1 |
| `path` | `data/knowledge/07-public-profile-context.md` |
| `body` | Original coaching notes: using **already-visible** public bio/captions as conversation context; anti-stalking; public vs private boundary. **Not** scraped posts |

Existing sources 01–06 remain valid retrieval hits (especially `02-openers.md`).

---

## Citation

Unchanged. `path` must remain under the project knowledge tree. Gate + prompt MUST prevent citing the pasted Instagram text as a source.

---

## Disclaimer

Unchanged standing notice. Must remain visible in the profile-context UI (existing `DisclaimerBar`) and on every `CoachReply`.

---

## Relationships

```text
CoachingSession 1──* Turn
Turn.intent may be profile_context
PublicProfileContext ──(request only)──► ProfileGateVerdict
ProfileGateVerdict ──ok──► retrieve KnowledgeChunk ──► CoachReply
ProfileGateVerdict ──private/safety──► CoachReply (refused, citations=[])
ProfileGateVerdict ──need_visible_text──► HTTP 400 (no Turn required)
```

---

## Validation summary (from spec)

| Rule | Where |
|------|--------|
| No Instagram login | No auth fields; UI has no login control |
| Handle/URL not a fetch | `profile_gate` + no HTTP client to social hosts |
| Paste required for coaching | 400 `need_visible_text` |
| Private out of scope | 200 refused, no invented content |
| No scrape | `safety.screen` + gate |
| No matchmaking of real people | `safety.screen` |
| Ephemeral | No dossier field; Turn RAM only |
| Cite library or refuse/hedge | existing retrieve score gate; empty citations on refuse |
| Length | visible_text ≤ 8000; question ≤ 2000 |
