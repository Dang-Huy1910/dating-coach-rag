# Product Brief — Dating Coach RAG

## Problem

People struggle with dating communication: weak bios, awkward openers, misread tone, and advice scattered across blogs/videos that is hard to apply in the moment.

University FAQ chatbots are saturated on GitHub. A **dating coach** with the same RAG + API core is more distinctive for a personal portfolio — if scope stays disciplined.

## Solution

A personal **Dating Coach Chatbot** that:

1. Answers coaching questions using **RAG** over a curated knowledge base (guides on bios, openers, conversation flow, boundaries, red flags — non-clinical).
2. Helps rewrite a **profile / bio** draft.
3. Suggests **openers** for a given context (app, mutual friend, etc.).
4. **Analyzes a message draft** (tone, clarity, risk) and suggests revisions.
5. Exposes capabilities through a **Backend API**; UI is a thin React client (Streamlit only as a temporary demo).

## Target user (v1)

Solo learner / demo user chatting with the coach in a local or simple deployed app. No multi-user social network.

## Success criteria (v1)

- User can ask a coaching question and get an answer grounded in retrieved sources (with citation).
- User can paste a bio or message and get concrete rewrite suggestions.
- When knowledge is insufficient, the bot says it does not know / cannot advise — no invented “studies” or clinical claims.
- Backend API is the system of record for chat; UI is a thin client.
- Clear safety disclaimer: not therapy, not matchmaking of real people.

## Non-goals (v1)

- Matching two real humans
- Scraping dating apps or real profiles at scale
- Storing sexual/intimate chat logs as a product feature
- Fine-tuning a custom LLM
- Full admin dashboard / tickets / auth system (optional later)

## Domain knowledge base (planned)

Curated files under something like `data/knowledge/` (to be defined in plan):

- Profile & bio writing
- First messages / openers
- Conversation pacing
- Boundaries & consent basics (non-clinical)
- Common red flags (informational, not diagnostic)

Owner must license/source content ethically (own notes, public-domain, or properly attributed material).

## Why this fits the builder

Primary skills to showcase: **RAG pipeline + Backend API**. UI stays minimal. Same architecture pattern as university chatbots, different (fresher) domain.
