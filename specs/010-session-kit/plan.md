# Implementation Plan: Session Coaching Kit (P3)

**Branch**: `010-session-kit` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-session-kit/spec.md`

## Summary

Add an **ephemeral sitting kit** on the coaching session: after a successful job (unified `/agent` or dedicated rewrite/analyze/openers), write artifacts into session-scoped slots. Bio Studio / Openers / Message **hydrate from GET kit** so the user does not copy between tabs. Refusals do not write. New session clears the kit. No external send.

## Technical Context

**Language/Version**: Python 3.12; TypeScript + React 18

**Primary Dependencies**: Existing FastAPI + in-process `SessionStore`. No Redis/DB. No LangGraph.

**Storage**: `CoachingSession.kit` in `SessionStore` (RAM, same lifetime as turns).

**Testing**: pytest TestClient; contract GET `/kit`; agent/dedicated writes; safety does not write; frontend types. Golden optional for kit_updated copy.

**Target Platform**: Local demo 8000 / 5173

**Project Type**: Web service + thin UI

**Performance Goals**: Kit read/write in-process; no extra LLM call. SC-006 under five minutes.

**Constraints**: Constitution II–IV; kit is not a people dossier; screenshots not stored; HTTP-only UI.

**Scale/Scope**: One GET resource, write-on-success helper, SessionContext + three views hydrate. Ask Coach mentions which slots updated.

## Constitution Check

| Principle | Gate | Status |
|-----------|------|--------|
| I. Spec-First | spec + this plan before new kit code | PASS |
| II. RAG-Grounded | Kit stores **outputs of** handle(); does not skip retrieve | PASS |
| III. Backend-First | Kit lives on session; GET `/v1/sessions/{id}/kit`; UI hydrates via HTTP | PASS |
| IV. Safety | Refuse → no kit write; no external send | PASS |
| V. YAGNI | In-memory field + GET; no new DB | PASS |

Post-design: no dating-app client, no durable PII store. Gates PASS.

## Project Structure

```text
specs/010-session-kit/
  plan.md research.md data-model.md quickstart.md
  contracts/openapi.yaml spec.md checklists/requirements.md tasks.md

backend/app/
  session_store.py     # Kit dataclass on CoachingSession
  models.py            # SessionKitResponse; CoachReply.kit_updated optional
  kit.py               # NEW: apply_reply_to_kit(session, reply)
  api/router.py        # GET /v1/sessions/{id}/kit; call apply after successful coaching
  agent/run.py         # after merge, apply kit (or router does for all paths)

frontend/src/
  api/types.ts client.ts
  context/SessionContext.tsx   # kit state + refreshKit
  views/BioStudioView.tsx OpenersView.tsx MessageView.tsx AskCoachView.tsx

tests/
  contract/test_session_kit.py
  unit/test_kit.py
```

**Structure Decision**: Kit is session state, not a new product. Dedicated and agent paths share `apply_reply_to_kit`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
