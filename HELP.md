# ARIA Advisor Workbench — Help Guide
**Version 2.1** · Last updated: 2026-04-08

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

### 7. What-if Goal Scenario (v2)

In the Goals tab, expand the **What-if Scenario** panel to model how changes affect goal success. The simulation runs automatically as you adjust sliders (500ms debounce). All probabilities are **inflation-adjusted** — the target is inflated to its future value before the simulation runs.

**Mode 1 — Will I achieve it?**
- Adjust monthly SIP delta (±₹50k), assumed return (6–18%), timeline shift (-2 to +5 years), and inflation rate (3–10%)
- Each goal card shows:
  - Projected probability (with +/- delta vs base)
  - Target in today's ₹ vs inflation-adjusted future value
  - Median projected corpus in both future ₹ and today's ₹ (deflated)

**Mode 2 — What SIP do I need?**
- Shows the monthly SIP required to achieve **80% probability** of reaching each goal
- Compares required SIP vs current SIP and shows the gap (or surplus)
- Adjust return rate and inflation to see how the required SIP changes

> **How it works:** 1,000 Monte Carlo paths are run per goal. Each path simulates monthly portfolio growth with random return variation (±5% annualised volatility) around the assumed rate, compounding SIP contributions. The target is inflated using compound inflation before counting successes.

### 8. Notifications (FEAT-1004)
The bell icon in the top-right header shows unread notifications (red badge with count). Click the bell to open the notification panel:
- **Notification types:** Trade Submitted (amber), Trade Approved (green), Trade Rejected (red)
- **Auto-polling:** Refreshes every 60 seconds
- **Mark as read:** Opening the panel marks all visible notifications as read
- **Navigate:** Click any notification to jump directly to that client's 360° page
- **Mobile:** Dropdown expands full-width on small screens

### 9. Trade Workflow (Phase 1A)

On any client's 360° page, you can create and submit trades for approval.

**Step 1: Create Trade (Draft)**
- Click **Initiate Trade** on the client's Trades panel
- Select **Buy** or **Sell**
- **Search for an instrument** — type name, ticker, or category (e.g. "HDFC", "RELIANCE", "Gilt")
  - **Buy:** shows all 30 available instruments (10 stocks + 20 MFs + crypto)
  - **Sell:** shows only instruments the client currently holds
- Choose input mode: **By Amount (₹)** or **By Units** — the other field auto-fills using NAV
- Validations applied automatically:
  - Sell: blocks if quantity exceeds units held
  - Crypto: minimum 0.0001 units
  - Stocks: minimum 1 unit (whole shares only)
- Add an optional **Advisor Note** for context
- Click **Buy / Sell [Instrument Name]** — trade saved as **Draft** (hidden from client)

**Step 2: Review & Submit for Approval**
- View draft trades in the **Trades** section (collapsed by default)
- Click **Submit for Approval** to send to client
- Trade status changes to **⏳ Pending Approval**
- Client receives notification on their ARIA Personal dashboard

**Step 3: Monitor Client Response**
- Bell icon (top right) shows unread notifications
- When client approves/rejects, you'll be notified
- **Approved:** ✅ Client approved; you will process in 1-2 business days (mutual funds) or immediately (crypto)
- **Rejected:** ❌ Client rejected; you can modify and resubmit

> **Client-Initiated Trades:** If your client initiates a trade themselves from their Personal dashboard, you'll receive an informational notification. These trades auto-settle immediately — no action required from you.

**Asset-Specific Notes:**
- **Mutual Funds:** You process the trade after client approval (mock banking for now)
- **Crypto:** After client approval, the client executes the trade on their own exchange (Coinbase/Kraken/MetaMask) — you coordinate via notifications

---

### 11. Client Lifecycle Stage (FEAT-2004)
Each client has a lifecycle stage that tracks where they are in the advisory relationship.

**Stages:**
| Stage | Meaning |
|---|---|
| **Lead** | Prospect converted, not yet fully onboarded |
| **Onboarded** | KYC complete, portfolio set up |
| **Active** | Regular advisory relationship |
| **Review Due** | Scheduled review overdue or triggered |
| **Churned** | Relationship ended |

**Where it appears:**
- **Client 360° sidebar** — click any stage to update it instantly
- **Mobile header** — coloured pill next to client name

**API (BzHub / integrations):** `PATCH /clients/{id}/lifecycle` with body `{"stage": "active"}`

---

### 10. Client Portal
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

### v2.1 (2026-04-08)
- **Client Lifecycle Stage (FEAT-2004):** First-class lifecycle field on every client
  - 5 stages: Lead → Onboarded → Active → Review Due → Churned
  - Clickable selector in Client 360° sidebar (desktop)
  - Coloured badge in mobile header
  - API: `PATCH /clients/{id}/lifecycle` — BzHub CRM integration-ready

### v2.0 (2026-04-04)
- **Instrument Dropdown — Trade Initiation:** Searchable dropdown replaces free-text entry for advisor-initiated trades
  - 30 instruments: 10 NIFTY stocks + 20 MFs (index, debt, money market)
  - Buy: full instrument list with NAV auto-calc (amount ↔ units toggle)
  - Sell: filtered to client's actual holdings only; shows units held + value; blocks if quantity exceeds holding
  - Dynamic submit label: "Buy Reliance Industries" / "Sell HDFC Index Fund"
  - Minimum quantity enforced: crypto 0.0001 units, stocks 1 unit (whole shares only)
- **Live Price Refresh:** Holding NAVs updated on page load from live sources
  - Mutual funds: AMFI India NAVAll.txt (daily, official, free)
  - Crypto (BTC/ETH): CoinGecko API, INR prices, refreshed every 5 minutes
  - Stocks: Yahoo Finance NSE feed, refreshed every 5 minutes
  - Portfolio total_value auto-recalculated after each refresh
- **Default Holdings Seed:** All new clients (advisor-created or personal signup) get a standard starter portfolio
  - 10 NIFTY stocks + 10 MFs + 5 BTC + 5 ETH + ₹5L cash balance
  - Existing clients (Kate, Ruben) backfilled on next backend restart
- **Opportunity Pipeline (FEAT-2001):** Kanban board to track prospects across 4 stages
  - Stages: Prospect → Discovery → Proposal → Won
  - Convert Won prospect directly to client
  - AUM estimates per stage; KPI strip with totals
  - Route: `/opportunities`
- **Task Queue (FEAT-2002):** Full task management for advisor workflow
  - Due date, workflow tag (onboarding/review/trade/compliance/general)
  - Overdue (red) and due-within-7-days (amber) colour coding
  - Filter: pending / done / all
  - Route: `/tasks`
- **Advisor Workspace KPIs:** Open Opportunities and Tasks Due ≤ 7d tiles added to workspace overview
- **Billing Nav:** Billing page now accessible from Advisor Workspace header

### v1.4 (2026-04-03)
- **Client-Initiated Trades:** Clients can now initiate trades from their Personal dashboard
  - Trades settle immediately — no advisor approval required
  - If client has a linked advisor, advisor receives an informational notification
  - No advisor linked = trade still processes silently
- **Balance Validation on Approve:** Running balance check before settling advisor-initiated trades
  - Buy trades: blocked if `cash_balance < estimated_value` (shows shortfall amount)
  - Sell trades: blocked if `units_held < quantity` for the specific asset
  - Inline ⚠️ warning shown to client before approving
- **Cash Balance:** Portfolio now tracks a cash balance (INR liquid)
  - Shown on dashboard as "💵 Cash available: ₹X"
  - Deducted on buy settle; credited on sell settle
- **Test Data:** Joshua, Ruben, and Kate now have seed holdings across stocks, mutual funds, crypto, bonds, and commodities with cash balances

### v1.3 (2026-03-28)
- **Trade Workflow (Phase 1A):** Create, submit, and track trades
  - Draft → Pending Approval → Approved/Rejected
  - Support for mutual funds and crypto
  - Client notifications on trade submission
  - Advisor notifications on client approval/rejection
  - Draft trades hidden from clients
  - Visual warning banner for draft trades

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
