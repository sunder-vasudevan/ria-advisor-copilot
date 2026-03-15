# ARIA — Advisor Relationship Intelligence Assistant

> *"Know before they call. Relationships, backed by intelligence."*

**Version:** 1.0
**Date:** 2026-03-13
**Status:** Active
**Owner:** Sunder Vasudevan

---

## 1. Product Vision

Build a demo-ready, AI-powered Advisor Workbench for Relationship Managers (RMs) in banking — not to replace the advisor, but to make them dramatically more effective.

The pitch to a bank:
> "Your core banking system was built to process transactions, not to think. ARIA sits alongside it and gives every RM the intelligence to know their clients before they call."

This is a middleware play — sits on top of CBS, not a replacement for it.

---

## 2. Target Users

| User | Description |
|------|-------------|
| Relationship Manager (RM) | Primary user. Uses Advisor Workbench daily for client prep, recommendations, and approvals |
| Branch Manager | Monitors book-level risk and advisor activity |
| Compliance Officer | Reviews audit trails, suitability records |
| End Client | Secondary — receives plain-language explanations and goal updates |

**Client Segments Served:**

| Segment | AUM Threshold | Advisory Model |
|---------|--------------|----------------|
| Retail | < ₹25L investable | Robo-led, RM reviews |
| HNI | ₹25L – ₹5Cr | Hybrid, RM-driven |
| Ultra HNI | > ₹5Cr | Full advisory, bespoke |
| Institutional | Corporates, Trusts, Family Offices | Dedicated desk |

---

## 3. North Star Demo (The 10-Minute Pitch)

This scenario must work end-to-end for every demo:

1. RM opens Advisor Workbench in the morning
2. AI surfaces 5 clients flagged for attention (equity drift, SIP lapse, life event)
3. RM clicks on Priya Sharma — Client 360 loads, AI Situation Summary auto-generates
4. RM asks copilot: *"She just told me she needs the money in 6 months, what changes?"*
5. Copilot responds with specific, cautious, actionable talking points
6. RM reviews, tweaks one fund, approves recommendation
7. Client receives plain-language explanation
8. Audit log captures the entire chain with AI rationale

**This scenario is the acceptance test for every feature built.**

---

## 4. USPs

| USP | Description | Why It Matters |
|-----|-------------|----------------|
| AI-explained recommendations | Every recommendation has plain-language Claude-generated rationale | Mis-selling protection; SEBI audit compliance; client trust |
| Advisor Copilot chat | RM talks to an AI about their entire client book in natural language | No core banking vendor has this |
| Goal probability + what-if | Live sliders showing impact of SIP changes, market scenarios, timeline shifts | Extremely demo-able |
| Segment-aware from day 1 | Same engine, differentiated UX for Retail/HNI/Institutional | Most systems bolt HNI on later |
| Full audit trail with AI rationale | Every action logged with AI reasoning | SEBI compliance differentiator |

---

## 5. Feature Registry

### Status Key
| Symbol | Meaning |
|--------|---------|
| ✅ | Built and working |
| 🔶 | Partially built |
| ⬜ | Planned — not started |
| ❌ | Explicitly out of scope v1 |

---

### Module 1 — Client Profile & Risk Assessment

| Feature | Status | FEAT ID | Notes |
|---------|--------|---------|-------|
| Client record (name, age, segment, risk score) | ✅ | — | Model + seed data done |
| Segment classification (Retail / HNI) | ✅ | — | In Client model |
| Risk score (1–10) and risk category | ✅ | — | Conservative / Moderate / Aggressive |
| Portfolio and holdings data model | ✅ | — | Full model + seed data |
| Goals data model (target, SIP, probability) | ✅ | — | Full model + seed data |
| Life events tracking | ✅ | — | job_change, new_child, marriage, etc. |
| Edit / update client data (API + UI) | ⬜ | FEAT-101 | Currently read-only |
| Risk questionnaire (onboarding flow) | ⬜ | FEAT-102 | UI form → score calculation |
| Financial profile (income, net worth, tax status) | ⬜ | FEAT-103 | Extend Client model |
| ESG preference capture | ⬜ | FEAT-104 | Add to Client model + filter logic |
| Assessment history (risk profile over time) | ⬜ | FEAT-105 | Versioned RiskProfile records |
| KYC/AML mock flag system | ⬜ | FEAT-106 | Define fields, mock flags |
| Client onboarding flow (multi-step) | ⬜ | FEAT-107 | Form → segment auto-assign |

---

### Module 2 — Portfolio Management Engine

| Feature | Status | FEAT ID | Notes |
|---------|--------|---------|-------|
| Holdings with allocation % and drift indicators | ✅ | — | HoldingsTable component |
| Portfolio donut chart (equity / debt / cash) | ✅ | — | Recharts PieChart |
| Drift calculation vs. target allocation | ✅ | — | urgency.py + PortfolioChart |
| Mark-to-market valuation display | 🔶 | — | Values static in seed — no live NAV |
| Live NAV fetch (MFAPI.in) | ⬜ | FEAT-201 | Free API, no auth needed |
| Rebalancing proposal engine | ⬜ | FEAT-202 | Calculate exact fund switches needed |
| Rebalancing proposal UI (review + approve) | ⬜ | FEAT-203 | Before/after allocation card |
| Calendar-based rebalancing triggers | ⬜ | FEAT-204 | Quarterly review scheduler |
| Static model portfolios for Retail | ⬜ | FEAT-205 | Conservative / Balanced / Growth templates |
| Performance tracking (XIRR, TWRR) | ⬜ | FEAT-206 | Requires historical transaction data |
| Benchmark comparison | ⬜ | FEAT-207 | vs. Nifty 50, CRISIL indices |

---

### Module 3 — Advisory & Recommendation Engine

| Feature | Status | FEAT ID | Notes |
|---------|--------|---------|-------|
| AI Copilot chat (client-specific, multi-turn) | ✅ | — | POST /clients/{id}/copilot |
| Structured 4-section response format | ✅ | — | Situation / Risks / Talking Points / Questions |
| Suitability disclaimer enforced | ✅ | — | In system prompt |
| Full client context injected into Claude | ✅ | — | Portfolio, goals, life events |
| Suggested prompts on first load | ✅ | — | 5 pre-built prompts |
| Multi-turn conversation history | ✅ | — | Passed as array per request |
| Cross-client book-level questions | ⬜ | FEAT-301 | "Which clients are overweight equity?" |
| Formal recommendation cards (approve/reject) | ⬜ | FEAT-302 | Structured object with workflow |
| RM override with mandatory reason capture | ⬜ | FEAT-303 | Override modal → logged |
| Product recommendation (fund-specific) | ⬜ | FEAT-304 | Suggest specific funds with suitability check |
| Churn prediction (at-risk clients) | ⬜ | FEAT-305 | Rules-based flag |
| Next-best-action engine | ⬜ | FEAT-306 | Daily priority action per client |
| Bulk book-level actions | ⬜ | FEAT-307 | Apply change across segment |

---

### Module 4 — Advisor Workbench UI

| Feature | Status | FEAT ID | Notes |
|---------|--------|---------|-------|
| Client Book (searchable, urgency-ranked) | ✅ | — | ClientList page |
| Morning Briefing (AI-generated, top 8 clients) | ✅ | — | GET /briefing/{rm_id} |
| Client 360 view (3-column layout) | ✅ | — | Sidebar + center tabs + copilot |
| Urgency flags per client (severity-coded) | ✅ | — | 4 flag types, high/medium |
| AI Situation Summary card (auto-loads) | ✅ | — | GET /clients/{id}/situation |
| Risk score meter (color-coded) | ✅ | — | In sidebar |
| Goals panel with probability bars | ✅ | — | GoalsPanel component |
| Life events display with emoji cards | ✅ | — | Days-ago timestamp |
| Segment badges (HNI / Retail) | ✅ | — | Amber / blue |
| Search by name/segment | ✅ | — | ClientList search bar |
| Advanced filtering (segment, urgency, risk) | ⬜ | FEAT-401 | Filter bar on Client List |
| Column sorting (AUM, name, urgency) | ⬜ | FEAT-402 | Sortable headers |
| Notification centre | ⬜ | FEAT-403 | Bell icon with unread count |
| Client communication log | ⬜ | FEAT-404 | Call/email/meeting history |
| RM dashboard (book-level stats) | ⬜ | FEAT-405 | AUM, flag counts, segment breakdown |
| PDF/Excel export | ⬜ | FEAT-406 | Client reports, statements |
| Mobile-responsive layout | ⬜ | FEAT-407 | Phase 3+ |

---

### Module 5 — Goal Probability & What-If Engine

| Feature | Status | FEAT ID | Notes |
|---------|--------|---------|-------|
| Goal probability display (%) | ✅ | — | probability_pct stored + displayed |
| Probability bar with color coding | ✅ | — | Green ≥80%, amber ≥70%, red <70% |
| SIP status and missed SIP alert | ✅ | — | Days since last SIP |
| Time to target date display | ✅ | — | Years + month/year |
| Monte Carlo simulation engine | ✅ | FEAT-501 | Backend endpoint live at `/clients/{id}/goal-projection` |
| What-if sliders UI | ✅ | FEAT-502 | Goals tab includes SIP/return/timeline slider scenario panel |
| Live goal probability recalculation | ⬜ | FEAT-503 | Real-time update as sliders move |
| SIP projection calculator | ⬜ | FEAT-504 | "Required SIP to hit goal" |
| Goal underfunding gap alert | ⬜ | FEAT-505 | "₹8,200/month more needed" |

---

### Module 6 — Compliance & Suitability

| Feature | Status | FEAT ID | Notes |
|---------|--------|---------|-------|
| Suitability disclaimer in AI responses | ✅ | — | "subject to suitability review" |
| Audit log (every AI interaction) | ✅ | — | AuditLog model, written per call |
| Urgency flag logic | ✅ | — | urgency.py |
| Formal suitability check engine | ⬜ | FEAT-601 | Block if product risk > client risk |
| Concentration limit checks | ⬜ | FEAT-602 | Alert if single fund > X% |
| Regulatory product restriction rules | ⬜ | FEAT-603 | Restrict complex products for Retail |
| Conflict of interest disclosure | ⬜ | FEAT-604 | Disclosure banner on recommendation cards |
| Compliance dashboard (audit trail viewer) | ⬜ | FEAT-605 | Filterable table of all logged actions |
| Digital client consent capture | ⬜ | FEAT-606 | Consent checkbox + timestamp |
| Immutable audit record (7-year retention) | ⬜ | FEAT-607 | Soft-delete only, retention policy |

---

### Module 7 — Risk & Analytics

| Feature | Status | FEAT ID | Notes |
|---------|--------|---------|-------|
| Equity drift detection and display | ✅ | — | Urgency flags + PortfolioChart |
| Portfolio value display (INR formatted) | ✅ | — | ₹L / ₹Cr notation |
| Client-level VaR (95%, 99%) | ⬜ | FEAT-701 | — |
| Sharpe ratio, Sortino ratio | ⬜ | FEAT-702 | — |
| Max drawdown | ⬜ | FEAT-703 | — |
| Book-level AUM concentration report | ⬜ | FEAT-704 | — |
| XIRR / TWRR performance attribution | ⬜ | FEAT-705 | Needs transaction history |
| Benchmark comparison charts | ⬜ | FEAT-706 | vs. Nifty 50, CRISIL |

---

### Module 8 — Integration Layer *(mock for v1)*

| Feature | Status | FEAT ID | Notes |
|---------|--------|---------|-------|
| Live MF NAV data (MFAPI.in) | ⬜ | FEAT-801 | Free API, no auth |
| Core banking system (mock contract) | ❌ | — | Define interface only |
| Custodian / NSDL / CDSL | ❌ | — | Out of scope v1 |
| BSE StAR MF / NSE NMF II | ❌ | — | Out of scope v1 |
| WhatsApp / email client notification | ⬜ | FEAT-802 | Phase 2 — Twilio or WATI |

---

## 6. Build Phases

### Phase 1 — Demo Core ✅ COMPLETE
- [x] Client Book with urgency ranking
- [x] Client 360 (portfolio, holdings, goals, life events)
- [x] AI Situation Summary (auto-loads on page open)
- [x] AI Copilot chat (multi-turn, client-context-aware)
- [x] Morning Briefing (AI-ranked + narrated)
- [x] Audit logging (every AI interaction)
- [x] 20 Indian clients seeded with realistic data
- [x] Deploy config (Railway + Vercel)
- [x] Pushed to GitHub

### Phase 2 — USP Depth (Next)
Priority order:

| FEAT ID | Feature | Why Now |
|---------|---------|---------|
| FEAT-501 | Monte Carlo simulation backend | ✅ Complete |
| FEAT-502 | What-if sliders UI | ✅ Complete |
| FEAT-503 | Live goal probability recalculation | Completes the flow |
| FEAT-301 | Book-level copilot questions | Second biggest USP |
| FEAT-302 | Formal recommendation cards | Makes RM workflow real |
| FEAT-201 | Live NAV fetch (MFAPI.in) | Makes data feel real |
| FEAT-202 | Rebalancing proposal engine | Closes recommendation loop |
| FEAT-101 | Edit client data | Currently read-only |

#### Phase 2 Milestone — Production Deploy (before external demos)
**Goal:** Live URL to share for demos — no local setup required.

| Step | Task |
|------|------|
| 1 | Provision Supabase project, create PostgreSQL DB |
| 2 | Run Alembic migrations against Supabase |
| 3 | Seed production DB with 20 clients |
| 4 | Deploy backend to Railway (point `DATABASE_URL` at Supabase) |
| 5 | Deploy frontend to Vercel (point `VITE_API_URL` at Railway backend) |
| 6 | Smoke test the North Star demo scenario end-to-end |

**Do this after FEAT-503** (what-if flow complete) so the deploy is demo-worthy.

### Phase 3 — Pilot Readiness
| FEAT ID | Feature |
|---------|---------|
| FEAT-102 | Risk questionnaire onboarding |
| FEAT-303 | RM override with reason capture |
| FEAT-601 | Formal suitability check engine |
| FEAT-605 | Compliance dashboard |
| FEAT-403 | Notification centre |
| FEAT-802 | WhatsApp/email client notification |

### Phase 4 — Enterprise *(post-pilot)*
- Performance analytics (XIRR, TWRR, VaR)
- Multi-RM + RBAC
- Core banking integration
- Mobile app
- ML-driven churn prediction + next-best-action

---

## 7. Tech Stack

| Layer | Choice |
|-------|--------|
| Backend | Python + FastAPI |
| ORM | SQLAlchemy + Alembic |
| DB (local) | SQLite |
| DB (prod) | PostgreSQL via Supabase |
| AI | Anthropic Claude API — `claude-sonnet-4-6` |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Charts | Recharts |
| Icons | Lucide React |
| Hosting | Railway (backend) + Supabase (PostgreSQL) + Vercel (frontend) |
| MF Data | MFAPI.in (Phase 2) |
| Auth | Auth0 or Clerk (Phase 3) |

---

## 8. Data Model

Client
├── Portfolio
│     └── Holdings[]
├── Goals[]
├── LifeEvents[]
└── AuditLogs[]



**Planned additions (Phase 2+):**
- `FinancialProfile` — income, net worth, liabilities, tax status
- `KYCRecord` — document status, AML flags, PEP status
- `RiskAssessmentHistory` — versioned risk scores over time
- `Recommendation` — formal recommendation with approve/reject/override
- `RebalancingProposal` — before/after allocation, fund switches

---

## 9. API Reference

### Live
| Method | Path | Description |
|--------|------|-------------|
| GET | `/clients` | All clients, urgency-ranked |
| GET | `/clients/{id}` | Full Client 360 |
| GET | `/clients/{id}/holdings` | Holdings list |
| GET | `/clients/{id}/goals` | Goals with SIP status |
| GET | `/clients/{id}/goal-projection` | Monte Carlo what-if projection |
| GET | `/clients/{id}/situation` | AI situation summary |
| POST | `/clients/{id}/copilot` | Copilot chat |
| GET | `/briefing/{rm_id}` | Morning briefing |
| GET | `/health` | Health check |

### Planned (Phase 2)
| Method | Path | FEAT ID |
|--------|------|---------|
| POST | `/copilot/book` | FEAT-301 |
| GET | `/clients/{id}/rebalancing` | FEAT-202 |
| PUT | `/clients/{id}` | FEAT-101 |
| POST | `/clients/{id}/recommendations` | FEAT-302 |
| PUT | `/recommendations/{id}/approve` | FEAT-302 |
| PUT | `/recommendations/{id}/reject` | FEAT-303 |

---

## 10. Demo Client

**Priya Sharma — Client ID 1**

| Field | Value |
|-------|-------|
| Segment | HNI |
| Portfolio | ₹85L |
| Equity | 73% (target 65%, drift **+8%**) |
| Goal | Home Purchase — ₹1.2Cr by Sep 2027 |
| Goal Probability | **62%** (underfunded) |
| Monthly SIP | ₹75,000 |

**The demo question:** *"She just told me she needs the money in 6 months, what changes?"*

---

## 11. Urgency Flag Logic

| Condition | Severity | Score |
|-----------|----------|-------|
| Equity drift > 5% | HIGH | +3 |
| Equity drift > 2% | MEDIUM | +1 |
| Missed SIP > 35 days | HIGH | +3 |
| Goal probability < 50% | HIGH | +3 |
| Goal probability 50–70% | MEDIUM | +1 |
| Life event within 45 days | MEDIUM | +1 |

---

## 12. Out of Scope (v1)

| Item | Reason |
|------|--------|
| Order execution (live) | Regulatory complexity |
| Real KYC/AML integration | Mock + define contract |
| Core banking (live) | Middleware pitch — not replacement |
| Payment / settlement | Out of scope entirely |
| Mobile app | Phase 4 |
| Multiple RM users / RBAC | Demo uses hardcoded RM |

---
