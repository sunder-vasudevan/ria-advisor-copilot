# ARIA — Advisor Relationship Intelligence Assistant

> *"Know before they call. Relationships, backed by intelligence."*

**Version:** 1.1
**Date:** 2026-03-16
**Status:** Active
**Owner:** Sunny Hayes Vasudevan

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

> Benchmarked against Wells Fargo Advisors (Advisor Gateway, Envision, $1B+ tech stack). See `ARIA_USP_WF.md` for full analysis.

| USP | Description | Why It Matters | vs. Wells Fargo |
|-----|-------------|----------------|-----------------|
| AI Morning Briefing | Every morning, AI ranks clients by urgency and narrates who needs attention | RM walks into every call prepared | WF has no equivalent |
| Advisor Copilot chat | RM talks to AI about any client or their entire book in natural language | Zero context-switching across tools | WF has no advisor-specific AI (Morgan Stanley has it, 98% adoption) |
| Goal probability + live what-if | Live sliders showing real-time impact of SIP changes, market scenarios, timeline shifts | Extremely demo-able, client-engaging | WF's Envision is static, 4 scenarios max, manual |
| AI-explained recommendations | Every recommendation has plain-language Claude-generated rationale | Mis-selling protection; SEBI audit compliance; client trust | WF has no AI rationale trail |
| Unified single surface | Client 360 + copilot + goals + portfolio in one screen | No context-switching across 200+ tools | WF Advisor Gateway has 200+ tools |
| Full audit trail with AI rationale | Every action logged with AI reasoning | SEBI/SEC compliance differentiator | WF compliance is bolt-on |
| Segment-aware from day 1 | Same engine, differentiated UX for Retail/HNI/Institutional | Most systems bolt HNI on later | WF differentiates by channel, not segment |
| Middleware, not replacement | Sits on top of any CBS — no rip-and-replace | Bank can deploy without touching core systems | WF is proprietary stack-locked |

---

## 5. Feature Registry

### Status Key
| Symbol | Meaning |
|--------|---------|
| ✅ | Built and working |
| 🔶 | Partially built |
| ⬜ | Planned — not started |
| ❌ | Explicitly out of scope v1 |

### Architectural Note — Dual-App Design
**Every feature involving client interaction must be planned and built across BOTH apps simultaneously:**
- **ARIA Advisor** (RM's workbench) — initiation, data entry, approval workflows from advisor side
- **ARIA Personal** (client portal) — client-facing approval, execution, and personal history views

Example (Trade Management):
- Advisor initiates trade → Personal app shows "Pending Trades" for client to approve
- Advisor views trade history per client → Client sees their complete trade history in Personal
- Both apps share the same backend Trade + TradeAuditLog tables; UX differs but workflows are synchronized

**Consequence:** Feature specifications must always describe both app's UX, not just one.

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
| Add new client + edit basic info (API + UI) | ✅ | FEAT-101 | Step 1 of onboarding — name, DOB, phone, email, address, city, pincode, PAN, segment, risk score slider |
| Risk questionnaire (onboarding step 2) | ✅ | FEAT-102 | 5-question guided Q&A → auto-calculates risk_score (1-10) and category. Replaces manual slider |
| Add initial portfolio + holdings (onboarding step 3) | ✅ | FEAT-108 | POST /clients/{id}/portfolio. Fund holdings, allocation %. Auto-calculates total_value and current_pct |
| Add initial goals (onboarding step 4) | ✅ | FEAT-109 | POST /clients/{id}/goals. Goal name, target amount, date, SIP → Monte Carlo probability on save |
| Multi-step onboarding flow | ⬜ | FEAT-107 | Ties FEAT-101 → 102 → 108 → 109 into a single guided wizard. Step indicator, save-and-continue |
| Financial profile (income, net worth, tax status) | ⬜ | FEAT-103 | Extend Client model — relevant for HNI segment |
| ESG preference capture | ⬜ | FEAT-104 | Add to Client model + filter logic |
| Assessment history (risk profile over time) | ⬜ | FEAT-105 | Versioned RiskProfile records |
| KYC/AML mock flag system | ⬜ | FEAT-106 | Define fields, mock flags |

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
| Cross-client book-level questions | ⬜ | FEAT-301 | "Which clients are overweight equity?" — WF cannot do this |
| Formal recommendation cards (approve/reject) | ⬜ | FEAT-302 | Structured object with workflow |
| RM override with mandatory reason capture | ⬜ | FEAT-303 | Override modal → logged |
| Product recommendation (fund-specific) | ⬜ | FEAT-304 | Suggest specific funds with suitability check |
| Churn prediction (at-risk clients) | ⬜ | FEAT-305 | Rules-based flag; WF lost 3,000 advisors 2016–2023 |
| Next-best-action engine | ⬜ | FEAT-306 | Daily priority action per client — Merrill has "ask MERRILL" (23M interactions); WF doesn't |
| Bulk book-level actions | ⬜ | FEAT-307 | Apply change across segment |
| Meeting prep card | ⬜ | FEAT-308 | 1-page AI brief before a client call — Morgan Stanley AI @ Debrief has 98% advisor adoption; WF has nothing |
| Plain-language client explainer | ⬜ | FEAT-309 | One-click client-ready summary of any recommendation — compliance + trust differentiator |

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
| Client communication log | ⬜ | FEAT-404 | Call/email/meeting history — WF uses Salesforce for this; ARIA bakes it in natively |
| RM dashboard (book-level stats) | ⬜ | FEAT-405 | AUM, flag counts, segment breakdown — WF spreads this across 5 tools |
| PDF/Excel export | ⬜ | FEAT-406 | Client reports, statements |
| Mobile-responsive layout | ✅ | FEAT-407 | Mobile top nav, card list, extra tabs on Client360 |

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
| Live goal probability recalculation | ✅ | FEAT-503 | Debounced auto-run on slider change. Mode 1 (probability) + Mode 2 (required SIP) |
| SIP projection calculator | ✅ | FEAT-504 | find_required_sip() binary search — "Required SIP to hit goal" shown in Mode 2 |
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

### Module 8 — Trade Management

**How it works:** Advisor proposes a trade in ARIA Advisor → Client approves in ARIA Personal → Backend logs and mock-settles the trade. No real money moves in Phase 1. Full audit trail throughout.

| Feature | Status | FEAT ID | Notes |
|---------|--------|---------|-------|
| Trade initiation form (advisor) | ✅ | FEAT-1001 | **Advisor-facing.** RM selects asset type (Mutual Fund or Crypto), buy or sell, enters asset code/ticker, quantity, and estimated value. Trade saved as `draft`. Advisor clicks "Submit for Approval" → status moves to `pending_approval`, client is notified. |
| Trade approval workflow (client) | ✅ | FEAT-1002 | **Client-facing in ARIA Personal.** Client sees "Pending Trades" section showing all advisor-proposed trades — asset, action, quantity, value, advisor name, and date. Client taps Approve or Reject with optional comment. On approval, backend mock-settles immediately. |
| Trade status tracking & audit trail | ✅ | FEAT-1003 | Every trade moves through: `draft` → `pending_approval` → `approved` → `settled` (or `rejected` / `cancelled`). Every status change writes to an immutable `TradeAuditLog` recording actor (advisor / client / system), timestamp, and note. Logs cannot be edited or deleted. |
| Trade notification system | ⬜ | FEAT-1004 | Two triggers: (1) Advisor submits trade → client gets in-app notification. (2) Client approves or rejects → advisor gets in-app notification. Phase 2: email/WhatsApp via Twilio or WATI. |
| Trade history & reporting | ✅ | FEAT-1005 | **Advisor app:** Trades tab in Client 360 shows all trades for that client (all statuses), sortable by date. **Personal app:** Trades tab shows client's full trade history. Both views show the full audit trail on click. |
| Mock banking layer (Phase 1) | ✅ | FEAT-1006 | On client approval, backend logs a mock debit/credit against the client's account — no real bank API call is made. Phase 2 replaces this with real banking APIs (Razorpay, Smallcase, or bank direct). |
| Crypto — external wallet execution (Phase 1) | ✅ | FEAT-1007 | **ARIA does not hold or execute crypto.** On approval, client is shown: "Go to your exchange (Coinbase, Kraken, MetaMask) and execute this trade yourself." Client optionally submits the tx hash back to ARIA as proof of execution. Status then moves to `settled`. Phase 2: wallet API integration for auto-execution. |
| Mutual fund mock-execution (Phase 1) | ✅ | FEAT-1008 | On client approval, backend marks the MF trade as `settled` and logs a mock bank debit/credit. No real fund order is placed. Phase 2: Smallcase or BSE StAR MF API for real order placement and settlement. |

---

### Module 9 — Integration Layer *(mock for v1)*

| Feature | Status | FEAT ID | Notes |
|---------|--------|---------|-------|
| Live MF NAV data (MFAPI.in) | ⬜ | FEAT-801 | Free API, no auth |
| Core banking system (mock contract) | ❌ | — | Define interface only |
| Custodian / NSDL / CDSL | ❌ | — | Out of scope v1 |
| BSE StAR MF / NSE NMF II | ❌ | — | Out of scope v1 |
| WhatsApp / email client notification | ⬜ | FEAT-802 | Phase 2 — Twilio or WATI |
| Banking API integration (Razorpay, Smallcase) | ⬜ | FEAT-803 | Phase 2 — for real trade settlement |
| Crypto exchange integration (CoinDCX, WazirX) | ⬜ | FEAT-804 | Phase 2+ — auto-execute crypto trades |
| Wallet integration (MetaMask, Coinbase, WalletConnect) | ⬜ | FEAT-805 | Northstar A — auto-settle crypto trades via wallet APIs |

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

### Phase 2.5 — Trade Management Module (Next)
**New Module:** Multi-asset trade initiation, client approval, execution tracking.
**Design & Documentation Phase:** ✅ COMPLETE (2026-03-27) — See `docs/TRADE_MANAGEMENT_SPEC.md` for full spec. Code phase pending token window reset.

| FEAT ID | Feature | Status | Notes |
|---------|---------|--------|-------|
| FEAT-1001 | Trade initiation form (advisor-facing) | ✅ | RM selects asset type (MF or Crypto), buy/sell action, asset code/ticker, quantity, and estimated value. Trade saved as `draft`. RM submits for approval → status moves to `pending_approval`, client is notified. |
| FEAT-1002 | Trade approval workflow (client-facing) | ✅ | Client sees all pending advisor trades in ARIA Personal "Pending Trades" section. Each card shows asset, action, quantity, value, advisor, and date. Client taps Approve or Reject with optional comment. On approval, backend mock-settles immediately. |
| FEAT-1003 | Trade status tracking & audit trail | ✅ | Trade lifecycle: `draft` → `pending_approval` → `approved` → `settled` (or `rejected` / `cancelled`). Every transition logged to immutable `TradeAuditLog` with actor, timestamp, note. Logs cannot be edited. |
| FEAT-1004 | Trade notification system | ⬜ | Two triggers: (1) Advisor submits trade → client in-app notification. (2) Client approves/rejects → advisor in-app notification. Phase 2: email/WhatsApp via Twilio or WATI. |
| FEAT-1005 | Trade history & reporting | ✅ | **Advisor app:** Trades tab in Client 360 shows all trades for client, sortable. **Personal app:** Trades tab shows all client trades. Both views show full audit trail on click. |
| FEAT-1006 | Mock banking layer | ✅ | On client approval, backend logs a mock bank debit/credit (no real API call). Phase 2 replaces with real banking integration. |
| FEAT-1007 | Crypto — external wallet execution (Phase 1) | ✅ | **Crucial:** ARIA does not hold, custody, or execute crypto. On approval, client sees: "Go to Coinbase/Kraken/MetaMask and execute this trade yourself." Client optionally submits tx hash as proof. Status moves to `settled`. **Phase 2 only:** wallet API integration for auto-execution. |
| FEAT-1008 | Mutual funds — mock-execution (Phase 1) | ✅ | On client approval, backend marks MF trade as `settled` and logs a mock debit/credit. No real fund order placed. **Phase 2 only:** Smallcase or BSE StAR MF API for real settlement. |

**Key Design Decisions (Locked):**
1. **Crypto — No Custody:** Phase 1 is advisor proposal + client execution on external exchange (Coinbase, Kraken, MetaMask). ARIA never holds crypto. Phase 2+: integrate wallet APIs (MetaMask, WalletConnect, Coinbase) for auto-execution *if* client opts in.
2. **Mutual Funds — Mocked Phase 1:** Backend mock-settles on approval. Phase 2: real fund APIs (Smallcase, BSE StAR MF).
3. **Banking — Mocked Phase 1:** No real bank API calls. Phase 2: Razorpay, Smallcase, or bank direct integration.
4. **Execution Flow:** Advisor proposes in ARIA Advisor → Client approves in ARIA Personal → Backend logs mock debit/credit → Trade marked `settled`. Full audit trail throughout.
5. **Asset Scope:** Mutual funds + Crypto (buy/sell) only. Direct stocks, bonds, insurance, ETFs parked for Phase 2+.

**Data Model Additions:**
```
Trade
├── id (UUID)
├── client_id (FK)
├── advisor_id (FK)
├── asset_type (enum: 'mutual_fund' | 'crypto')
├── action (enum: 'buy' | 'sell')
├── asset_code (ISIN or ticker)
├── quantity (decimal)
├── estimated_value (decimal)
├── actual_value (decimal, set at execution)
├── status (enum: draft | pending_approval | approved | settled | rejected | cancelled)
├── created_at, approved_at, executed_at, settled_at (timestamps)
├── client_comment, advisor_note (text)

TradeAuditLog (immutable)
├── id, trade_id (FK)
├── action (enum: created | submitted | approved | rejected | executed | settled | cancelled)
├── actor (enum: advisor | client | system)
├── timestamp, note
```

---

### Phase 2 — USP Depth (Next)
Priority order:

| FEAT ID | Feature | Why Now | WF Gap |
|---------|---------|---------|--------|
| FEAT-501 | Monte Carlo simulation backend | ✅ Complete | WF has Envision (static) |
| FEAT-502 | What-if sliders UI | ✅ Complete | WF has 4 manual scenarios |
| FEAT-101 | Add + edit basic client info | ✅ Complete | Identity, contact, advisory profile |
| FEAT-102 | Risk questionnaire | ✅ Complete | 5-question Q&A → auto-scores risk profile |
| FEAT-108 | Add portfolio + holdings | ✅ Complete | Full portfolio creation with fund-level data |
| FEAT-109 | Add goals | ✅ Complete | Goals with Monte Carlo probability on save |
| FEAT-503 | Live goal probability recalculation | Completes the what-if flow | WF is static — this is real-time |
| FEAT-901 | Multi-advisor support + referral codes | ✅ Complete | Advisor table, login, seeded codes (RAHUL01/HAMZA01/SUNNY01) |
| FEAT-902 | ARIA Personal portal + client linking | ✅ Complete | personal_users table, register/login, referral code link, personal_user_id on Client |
| FEAT-903 | Advisor profile self-edit | ✅ Complete | PUT /advisor/me — display_name, city, region |
| FEAT-904 | Direct portal client auto-create + source flag | ✅ Complete | Auto-creates client row on registration if no name match; violet Direct badge |
| FEAT-905 | Full advisor details on Personal profile | ✅ Complete | /me enriched — advisor object with name, city, region, referral, rating |
| FEAT-301 | Book-level copilot questions | Second biggest USP | WF literally cannot do this |
| FEAT-302 | Formal recommendation cards | Makes RM workflow real | WF has no AI rationale in workflow |
| FEAT-201 | Live NAV fetch (MFAPI.in) | Makes data feel real | Free API, no auth |
| FEAT-202 | Rebalancing proposal engine | Closes recommendation loop | — |

#### Phase 2 Milestone — Production Deploy ✅ COMPLETE (2026-03-16)

| Step | Task | Status |
|------|------|--------|
| 1 | Provision Supabase project, create PostgreSQL DB | ✅ Done |
| 2 | Seed production DB with 20 clients | ✅ Done |
| 3 | Deploy backend to Render (free tier) | ✅ Live — https://aria-advisor.onrender.com |
| 4 | Deploy frontend to Vercel | ✅ Live — https://aria-advisor.vercel.app |
| 5 | Smoke test end-to-end | ✅ Done |

### Phase 3 — Pilot Readiness
| FEAT ID | Feature | WF Gap |
|---------|---------|--------|
| FEAT-102 | Risk questionnaire onboarding | WF uses paper/manual — ARIA digitises it |
| FEAT-303 | RM override with reason capture | — |
| FEAT-309 | Plain-language client explainer | WF has no equivalent — compliance + client trust |
| FEAT-601 | Formal suitability check engine | WF suitability is manual — ARIA blocks automatically |
| FEAT-605 | Compliance dashboard | WF compliance is bolt-on; ARIA is built-in |
| FEAT-606 | Digital client consent capture | Regulatory differentiator |
| FEAT-403 | Notification centre | — |
| FEAT-802 | WhatsApp/email client notification | Phase 2 — Twilio or WATI |

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
| Hosting | Render (backend, free) + Supabase (PostgreSQL, free) + Vercel (frontend, free) |
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

## 12. Competitive Benchmarking — Wells Fargo Advisors

> Full analysis in `ARIA_USP_WF.md`

### WF Stack Summary
- **Advisor Gateway** — 200+ tools in one SSO hub (Salesforce, eMoney, FactSet, Black Diamond, Morningstar, iCapital)
- **Envision** — proprietary Monte Carlo financial planning (1,000 simulations, static what-if)
- **AI investment** — $1B+ in platform, but AI is enterprise-wide (Tachyon, Google Agentspace), NOT advisor-specific
- **Key gap** — No advisor-specific AI assistant. Morgan Stanley AI @ Debrief has 98% advisor adoption; WF has nothing equivalent as of March 2026.

### ARIA vs WF — Head to Head

| Capability | ARIA | Wells Fargo | Morgan Stanley | Merrill |
|-----------|------|-------------|----------------|---------|
| AI Morning Briefing / urgency ranking | ✅ | ❌ | ❌ | ❌ |
| Natural language copilot for RM | ✅ | ❌ | ✅ (AI Debrief, 98% adoption) | Partial |
| Book-level AI questions | ✅ (planned) | ❌ | ❌ | ❌ |
| Live what-if goal probability | ✅ | Partial (static Envision) | ❌ | ❌ |
| Meeting prep card | ✅ (planned) | ❌ | ✅ | ❌ |
| AI rationale in audit trail | ✅ | ❌ | ❌ | ❌ |
| Unified single surface | ✅ | ❌ (200+ tools) | Partial | Partial |
| Next-best-action engine | ✅ (planned) | ❌ | ❌ | ✅ (ask MERRILL, 23M interactions) |
| Middleware / CBS-agnostic | ✅ | ❌ (proprietary) | ❌ | ❌ |

### The Pitch
> **"Wells Fargo built a workbench. ARIA built a thinking partner."**
> WF gives advisors 200+ tools and expects them to synthesize it. ARIA does the synthesis.

---

## 13. Out of Scope (v1)

| Item | Reason |
|------|--------|
| Crypto custody (ARIA holding client's crypto) | Regulatory + operational complexity. Phase 1: client holds on external exchange; ARIA guides/tracks only. |
| Order execution (live, real fund orders) | Regulatory complexity. Phase 1: mock execution; Phase 2: real APIs. |
| Real KYC/AML integration | Mock + define contract only — not live verification. |
| Core banking system (live integration) | Middleware pitch — ARIA sits on top, not replacement. |
| Real payment / settlement | Phase 1 mocked entirely. Phase 2: real banking APIs. |
| Mobile app (native iOS/Android) | Phase 4+. Web is fully mobile-responsive. |
| Multiple RM users / RBAC | Demo uses hardcoded RM; Phase 3+: proper user management. |

---
