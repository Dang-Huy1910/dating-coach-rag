# Quickstart: Session Coaching Kit (P3)

## Setup

Same as 009: ingest, uvicorn `:8000`, Vite `:5173`. Branch `010-session-kit`.

## Automated

```bash
pytest tests/unit/test_kit.py tests/contract/test_session_kit.py \
  tests/contract/test_agent.py tests/golden/test_agent_golden.py \
  tests/contract/test_rewrite_bio.py tests/contract/test_openers.py \
  tests/contract/test_analyze_message.py -q
```

## Sitting (SC-001–007)

1. Hỏi coach: `Sửa bio giúp rồi gợi ý opener: Thích cà phê, tìm người tử tế.`
2. Confirm chat mentions saved to Bio Studio + Gợi ý opener (not “đã đăng Tinder”).
3. Open **Bio Studio** without copying — improved bio visible (SC-001).
4. Open **Openers** without copying — ≥2 openers visible (SC-002, SC-003).
5. New session — Bio/Openers do not show the old kit (SC-004).
6. Safety: scrape + opener request — kit GET still empty (SC-005).

Dedicated Bio “refine” after kit hydrate still works and overwrites the bio slot.
