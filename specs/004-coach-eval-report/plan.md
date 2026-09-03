# Implementation Plan: Coach Eval Report & Retrieval Quality

**Branch**: `004-coach-eval-report` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

## Summary

Add a deterministic **eval CLI** that runs dating-coach quality cases (mocked LLM) and a **retrieval gold set** (Hit@4, MRR). Write `docs/EVAL.md` for portfolio reviewers. Reuse FastAPI TestClient + existing safety/gate paths. No new product UI.

## Technical Context

**Language/Version**: Python 3.12  
**Primary Dependencies**: Existing pytest/TestClient stack; FAISS + hash embedder; optional sentence-transformers for MiniLM compare  
**Storage**: Fixture JSON under `data/eval/`; report Markdown under `docs/EVAL.md`  
**Testing**: Unit tests for report aggregation + retrieval metrics helpers  
**Target Platform**: Local CLI  
**Project Type**: Eval tooling for existing web service  
**Performance Goals**: Full deterministic suite under ~30s on a laptop  
**Constraints**: Spec-first; RAG-grounded; YAGNI; no live LLM by default  
**Scale/Scope**: ~12 quality cases + ≥15 retrieval queries

## Constitution Check

| Principle | Status |
|-----------|--------|
| I Spec-First | PASS — spec + plan before code |
| II RAG-Grounded | PASS — measures cite/refuse, does not invent |
| III Backend-First | PASS — CLI over API/TestClient, no UI scoreboard |
| IV Safety | PASS — includes refusal cases; no scrape |
| V YAGNI | PASS — report + metrics only |

## Project Structure

```text
backend/app/eval/
  __init__.py
  cases.py
  runner.py
  retrieval.py
  report.py          # CLI main
data/eval/
  retrieval_queries.json
docs/EVAL.md
scripts/run_eval.sh  # thin wrapper optional
tests/unit/test_eval_report.py
tests/unit/test_retrieval_eval.py
```

## Complexity Tracking

Empty — no constitution violations.
