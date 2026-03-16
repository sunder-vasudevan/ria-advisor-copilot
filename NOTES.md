


# ARIA — Advisor Relationship Intelligence Assistant — Session Notes

> *"Know before they call. Relationships, backed by intelligence."*

## Current State
**Phase:** 2 — USP Depth 🔶 IN PROGRESS
**Version:** v1.2
**Repo:** https://github.com/sunder-vasudevan/aria-advisor
**Local:** `/Users/sunnyhayes/Daytona/aria-advisor`

## Deployed URLs
- **Frontend:** https://aria-advisor.vercel.app (Vercel)
- **Backend:** https://aria-advisor.onrender.com (Render, free tier)
- **Database:** Supabase PostgreSQL (pooler, port 6543)

## What's Built
- Full FastAPI backend (models, routers, seed data, Claude API integration, audit logging)
- React + Vite frontend (Client List, Client 360, all components)
- 20 Indian clients seeded across HNI and Retail segments
- AI Copilot chat, Morning Briefing, Situation Summary, Meeting Prep Card — all live
- Advisor Login + Client Login + Client Portal (frontend-only auth, localStorage)
- ARIA_USP_WF.md — benchmarking vs Wells Fargo Advisors
- HELP.md — full feature guide and setup docs
- PRD.md v1.1 — updated with WF benchmark, FEAT-308/309 added

## Next Session Agenda ← START HERE NEXT SESSION

### 1. Discuss — Client Interaction Capture (new feature area)
Sunder wants a better way to capture client interactions. Ideas to discuss and prioritize:

- **Quick Call Log** — one-tap after a call: mood, topics, duration (30 sec to log)
- **AI Meeting Notes** — type raw notes → AI structures into summary + action items
- **Interaction Timeline** — per-client visual history of all touchpoints
- **Follow-up Queue** — daily task list generated from interactions
- **Client Sentiment Score** — mood trend over time (green/amber/red churn risk)
- **Next Best Action** — AI suggests follow-up after each logged interaction
- **WhatsApp-style Quick Note** — floating button on client page → instant timestamped note
- **Voice Memo** — 60s voice note, AI transcribes + extracts action items

Decide: which 1-2 to build first? Recommend starting with **Quick Call Log + Interaction Timeline** as the foundation — everything else builds on top.

### 2. Build — FEAT-503 (if interaction capture gets deprioritized)
**FEAT-503** — Live goal probability recalculation
- Trigger projection calls automatically as sliders move (debounced, no manual button)
- Keep request load controlled (debounce + last-request-wins)
- Update each goal card instantly with scenario probability and delta

## What Shipped This Session (2026-03-17)
- Full stack deployed to Render + Supabase + Vercel ✅
- FEAT-308 Meeting Prep Card ✅
- Advisor Login / Client Login / Client Portal ✅
- WF benchmarking + PRD v1.1 ✅
- HELP.md + v1.2 version number in UI ✅
- Anthropic API credits added — Morning Briefing + Meeting Prep confirmed working ✅

## Open Flags
- None — all AI features live and working
- Next: FEAT-503 (goal probability sliders) → FEAT-301 (book-level copilot)
