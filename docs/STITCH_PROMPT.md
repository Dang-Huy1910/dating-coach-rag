# Prompt Stitch — Dating Coach RAG (toàn bộ màn v1)

Dán khối **Prompt (English, paste into Stitch)** vào [Stitch](https://stitch.withgoogle.com).  
Sinh **web, desktop 1440 và mobile 390**, cùng một design system. Không sinh màn swipe/match.

---

## Prompt (English, paste into Stitch)

```text
Design a complete multi-screen UI kit for “Dating Coach RAG”, a personal AI dating-communication coach web app (NOT a dating app, NOT Tinder, NOT an AI girlfriend).

Product: a thin React web client. Users chat with a coach that (1) answers dating-communication questions with source citations, (2) rewrites a profile/bio draft, (3) analyzes and rewrites a message draft (tone, clarity, interpersonal risk), (4) suggests first-message openers. The backend is a Python API; the UI only displays results.

Positioning: calm editorial coaching studio, trustworthy, adult, slightly warm. Never look like a swipe app, dating marketplace, or sensual companion. No hearts exploding, no pink-gradient “find love” marketing, no maps of people, no match cards.

Visual system:
- Platform: responsive web. Provide each screen at desktop 1440×900 and mobile 390×844.
- Aesthetic: quiet editorial / coaching journal. Soft off-white or warm paper background (#F7F4EF), ink text (#1C1917), muted sage or dusty teal accent (#3F6F64) for primary actions, amber (#C4A35A) only for citations/source chips. Danger/refusal uses clay red (#B54A3C), not neon.
- Type: distinctive but readable humanist sans (think Newsreader or Fraunces for titles, Source Sans / Inter for body). Vietnamese diacritics must look correct — never clip ă â ê ô ơ ư.
- Corners: 16px cards, 999px pills for mode chips. Subtle 1px hairline borders, almost no drop shadow.
- Always show a slim disclaimer bar: “Đây không phải liệu pháp tâm lý và không ghép đôi người thật.”
- All visible UI copy in Vietnamese. Code/API names stay English in captions if needed (source path as small mono).
- Components to reuse: top bar with wordmark “Coach”, mode segmented control (4 items), chat bubbles (user right, coach left), citation chips, copy button, draft textarea, empty/error/refusal banners, sticky composer.

Generate ALL of the following screens. Keep the same chrome (wordmark, disclaimer, mode control) unless noted.

SCREEN 1 — Welcome / first open
A first-run screen before chat. Centered wordmark “Dating Coach”, short line “Coach giao tiếp hẹn hò, không phải app tìm người.” Disclaimer card. Primary CTA “Bắt đầu phiên coach”. Secondary text: no account needed, chat is not saved after closing. Desktop: split layout, left editorial quote about clear writing, right the card. Mobile: stacked.

SCREEN 2 — Coach home, empty session (Ask mode)
Main workspace. Top: wordmark + disclaimer bar. Below: segmented control with 4 modes: “Hỏi coach” (selected), “Sửa bio”, “Phân tích tin”, “Gợi ý opener”. Empty state in the thread: illustration of a notebook, helper “Hỏi về bio, opener, nhịp chat, ranh giới… Coach sẽ trích nguồn khi có.” Sticky composer at bottom with placeholder “Bio hẹn hò ngắn nên viết thế nào?” and send. No messages yet.

SCREEN 3 — Ask coach, cited answer (happy path)
Same chrome, “Hỏi coach” selected. Thread: user bubble “Bio hẹn hò ngắn nên viết thế nào?” then coach bubble with 3–4 short paragraphs of practical Vietnamese advice. Under the coach bubble: a “Nguồn” row of 2–4 citation chips (title + optional heading, e.g. “Viết bio / Mục tiêu bio”). Small timestamp. Composer still visible. This is the hero screenshot.

SCREEN 4 — Ask coach, follow-up in the same session
Same as screen 3 plus a second user follow-up “Còn độ dài thì sao?” and a shorter coach reply that clearly continues the same sitting (no need to re-paste the first question). Citations may appear again.

SCREEN 5 — Bio rewrite
Mode “Sửa bio” selected. Instead of a tiny chat-only composer, show a two-zone layout on desktop: left, a large textarea labeled “Bio / profile nháp” with a weak example “Yêu cuộc sống.” and button “Nhờ coach sửa”; right, result panel with (a) coach notes as bullets, (b) a card “Bản sửa gợi ý” with improved Vietnamese bio and a “Sao chép” button, (c) citation chips. Mobile: textarea on top, result below.

SCREEN 6 — Bio rewrite, empty validation
Same as screen 5 but textarea is empty/whitespace. Inline error under the field: “Hãy dán bio nháp trước — coach không bịa tiểu sử người thật.” No fake result card.

SCREEN 7 — Message analysis
Mode “Phân tích tin” selected. Large textarea “Tin nhắn sắp gửi” with a pushy draft. Result: three small stat/pills — Giọng (tone), Độ rõ (clarity), Rủi ro giao tiếp (interpersonal risk, NOT clinical). Then coach notes. Then “Bản sửa gợi ý” with a calmer invite and copy button. Citation chips. Helper microcopy: “Rủi ro = áp lực / ranh giới / rõ ý, không phải chẩn đoán.”

SCREEN 8 — Openers
Mode “Gợi ý opener” selected. Field “Ngữ cảnh” example “App hẹn hò, bio nói thích chạy bộ”. Result: at least two numbered opener cards, each with copy button, distinct wording. Citation chips. Note: “Coach không tìm hay xếp hạng người thật.”

SCREEN 9 — Cannot advise / weak knowledge (hedge)
Ask mode. User asked something outside the library, e.g. tax law. Coach bubble is a calm hedge: cannot advise from the library, no fake studies. No citation chips. Optional suggestion chips of allowed topics: Bio, Opener, Nhịp chat, Ranh giới.

SCREEN 10 — Safety refusal
User asked to match real people or NSFW companion. Coach bubble refuses in Vietnamese, firm and short. No citations. Disclaimer bar still visible. Session remains usable — composer is not blocked.

SCREEN 11 — Knowledge not ready / API error
Workspace with a non-blocking banner “Thư viện kiến thức chưa sẵn sàng. Hãy chạy ingest rồi thử lại.” or “Không kết nối được máy chủ coach.” Retry text button. Empty thread. Do not show fake answers.

SCREEN 12 — Generating / loading
Same as screen 3 but the latest coach message is a skeleton/shimmer bubble “Coach đang soạn…”, send button disabled. No fake citations yet.

Also provide a compact component sheet: mode chips (default/selected), user bubble, coach bubble, citation chip, copy button, disclaimer bar, refusal banner, textarea, primary button, empty-state illustration style.

Do not include: login/register, swipe deck, map, payments, settings jungle, dark-pattern engagement, photo of a specific real person as a “match”, or a sexy AI avatar. Coach avatar if any should be a simple notebook/pen mark, not a flirtatious character.
```

---

## Gợi ý khi chạy Stitch

1. Chọn **Web** (không Mobile-app native).  
2. Generate **cả bộ**; nếu Stitch giới hạn số màn, chia 2 lần: màn 1–6 rồi 7–12, cùng visual system.  
3. Xuất ảnh/HTML để đưa Antigravity: xem `docs/ANTIGRAVITY_FE.md`.  
4. Copy tiếng Việt phải giữ dấu; nếu Stitch nuốt dấu, paste lại các chuỗi trong file này.

## Mapping màn → API

| Stitch | Intent / trạng thái | API |
|--------|---------------------|-----|
| 1 Welcome | tạo phiên | `POST /v1/sessions` |
| 2 Home empty | Ask, chưa gửi | — |
| 3–4 Cited + follow-up | `ask` | `POST .../ask` |
| 5–6 Bio | `rewrite_bio` | `POST .../rewrite-bio` |
| 7 Message | `analyze_message` | `POST .../analyze-message` |
| 8 Openers | `openers` | `POST .../openers` |
| 9 Hedge | `refused`/`hedged`, `citations=[]` | cùng ask |
| 10 Safety | `refused`, `citations=[]` | cùng các POST |
| 11 Index/API | `GET /health` `index_ready` | |
| 12 Loading | chờ JSON | |
