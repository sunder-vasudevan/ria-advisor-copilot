# ARIA Advisor Workbench — Help Guide
**Version 1.2** · Last updated: 2026-03-16

---

## Overview

ARIA (Advisor Relationship Intelligence Assistant) is an AI-powered workbench for wealth management advisors. It surfaces client urgency flags, portfolio analytics, goal tracking, and AI-generated insights — all in one place.

---

## Getting Started

### Advisor Login
- URL: `https://aria-advisor.vercel.app/login`
- Demo credentials: `rm_demo` / `aria2026`

### Client Portal Login
- URL: `https://aria-advisor.vercel.app/client-portal/login`
- Enter your first name (e.g. `priya`) and PIN: `1234`

---

## Features

### 1. Client Book (Home)
The main dashboard shows all clients with:
- **Urgency flags** — Red (high), Amber (medium), Green (on track)
- **Portfolio value** in INR
- **Segment** — HNI or Retail
- **Search** — filter by name or segment

Click any client row to open their 360° view.

### 2. Morning Briefing
Click the **Morning Briefing** button (top right of Client Book) to get an AI-generated summary of which clients need attention today and why.

> Requires `ANTHROPIC_API_KEY` to be set in the backend environment.

### 3. Client 360° View
Full client profile including:
- **Portfolio & Holdings** — donut chart + holdings table with allocation %
- **Goals** — progress bars, target amounts, projected probability
- **Life Events** — job changes, marriages, inheritances, etc.
- **Urgency Flags** — active flags in the sidebar
- **Risk Profile** — score (1–10) and category

### 4. ARIA Copilot (Chat)
Right-panel chat assistant on each client's page. Ask questions like:
- "Is this client overweight in equity?"
- "What should I discuss given their recent life events?"
- "Summarize their goal shortfall risk"

Conversation history is maintained within the session.

### 5. Situation Summary
Auto-generated narrative at the top of each client's page. Summarizes the client's current financial situation, urgency, and recommended focus areas.

### 6. Meeting Prep Card
Click **Prep for Meeting** on any client's page to generate a structured meeting brief including:
- Client snapshot (AUM, risk, segment)
- Active urgency flags
- Goal status summary
- Talking points
- Suggested questions
- Life events to reference

Use the **Print** button to save/print the card before a client meeting.

> Requires `ANTHROPIC_API_KEY` to be set in the backend environment.

### 7. Goal Projection
In the Goals tab, click any goal to see a Monte Carlo probability estimate. Adjust the monthly SIP amount to see how it affects the probability of reaching the target.

### 8. Client Portal
Clients can log in at `/client-portal/login` to view a read-only summary of their own portfolio and goals. No sensitive advisor data is exposed.

---

## Environment Setup (Self-Hosting)

### Backend (FastAPI on Render)
Required environment variables:
| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string (use pooler port 6543) |
| `ANTHROPIC_API_KEY` | Claude API key from console.anthropic.com |
| `FRONTEND_URL` | Your Vercel frontend URL (for CORS) |

### Frontend (Vite on Vercel)
| Variable | Description |
|---|---|
| `VITE_API_URL` | Your Render backend URL + `/api` |

### Local Development
```bash
# Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# Frontend
cd frontend
npm run dev
```

---

## Demo Data

The app ships with 10 seeded demo clients covering HNI and Retail segments across Mumbai. Data is stored in Supabase PostgreSQL.

To re-seed: `cd backend && python seed.py`

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| "Failed to load clients" | CORS or backend not running | Check `FRONTEND_URL` on Render |
| "Failed to generate meeting prep" | Missing API key | Add `ANTHROPIC_API_KEY` to Render env vars |
| "Briefing unavailable" | Missing API key | Same as above |
| Blank portfolio/goals | DB not seeded | Run `python seed.py` |

---

## Changelog

### v1.2 (2026-03-16)
- Meeting Prep Card (FEAT-308)
- Advisor Login page
- Client Login page + Client Portal
- Audit logging on all AI interactions
- Version number in sidebar and login page

### v1.1 (2026-03)
- Situation Summary (AI narrative per client)
- Morning Briefing
- Goal probability (Monte Carlo)
- ARIA Copilot chat

### v1.0 (2026-03)
- Initial deploy: Client Book, Client 360°, Portfolio & Holdings, Goals, Life Events
- Render + Supabase + Vercel stack
