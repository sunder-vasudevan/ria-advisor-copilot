


# ARIA — Advisor Relationship Intelligence Assistant — Session Notes

> *"Know before they call. Relationships, backed by intelligence."*

## Current State
**Phase:** 2 — USP Depth 🔶 IN PROGRESS
**Version:** v1.2
**Repo:** https://github.com/sunder-vasudevan/aria-advisor
**Local:** `/Users/sunnyhayes/Daytona/aria-advisor`
**Mobile:** ✅ Fully responsive (iOS + Android web)

## Deployed URLs
- **Frontend:** https://aria-advisor.vercel.app (Vercel) — Primary alias (consistent naming)
- **Frontend (legacy):** https://a-ria.vercel.app (same deployment, for backward compat — to deprecate after stable E2E)
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

## ← START HERE NEXT SESSION
**Parked features:**
- Email invite flow — advisor sends ARIA Personal link to client via email (choose: Resend or SendGrid)
- Superadmin view: collapsible advisor→clients tree, unassigned clients, assign client to advisor
- Advisor discovery by location — /advisor/all backend ready, Personal frontend UI needed
- Advisor accept/reject client requests — needs pending_requests table or status flag on Client
- New advisor signup flow — self-service registration, awaits superadmin approval or auto-activates
- ✅ **Thorough Testing of all features of both ARIA apps** — 2026-03-27 E2E regression test complete. Advisor: Client List, Client 360 (Portfolio, Goals, Trades, Life Events, Interactions tabs), Copilot. Personal: Dashboard, Goals, Life Events, Pending Trades UI verified. 15 screenshots, comprehensive test report. Trades UI now visible (was missing before rebuild). Backend API pending Render redeploy (no code issues).

## LOCKED — Trade Management Module (Design Phase Complete — 2026-03-27)
**Session 14:** Trade Management Module design & spec fully locked. Ready for implementation.
- **What:** Advisor initiates trade (MF or Crypto) → Client approves in ARIA Personal → Amount debited/credited to bank → Trade settled
- **Asset scope:** Mutual funds + Crypto (buy/sell). Direct stocks/bonds/insurance parked for Phase 2+.
- **Crypto strategy:** Phase 1: Trades on external wallet only (client manually executes on Coinbase/Kraken/MetaMask after ARIA approval). Northstar A: Phase 2+ integrate wallet APIs (MetaMask, WalletConnect) for auto-execution.
- **Banking:** Mocked Phase 1 (no real bank calls). Phase 2: Real Razorpay / Smallcase / banking APIs.
- **Key locked decisions:**
  - Crypto holdings NOT in ARIA portfolio phase 1 (external wallet only)
  - Mock banking debit/credit on approval
  - Advisor initiates, client approves, system debits, trade settles
- **Documents:**
  - PRD.md: Module 8 (Trade Management) + Module 9 (Integration Layer) with FEAT-1001 through FEAT-1008
  - docs/TRADE_MANAGEMENT_SPEC.md: 11 sections, complete data model, APIs, flows, test strategy
  - Plan: cuddly-hopping-sprout.md (exploratory + final design locked)
- **Next session:** Code phase — Backend migration + Trade/TradeAuditLog models + CRUD APIs + notification stubs

---

## What Shipped (2026-03-21 — Session 12)
- **BUG: Production outage** — all advisors locked out, client list returning 500
  - RC-1: `Advisor.is_active == True` → fixed to `.is_(True)` (Python 3.14 SQLAlchemy)
  - RC-2: String-based `order_by` on `Client.interactions` relationship → removed entirely
  - RC-3: `personal_user_id` in DB but not mapped as `Column()` in ORM → added
  - RC-4: `FRONTEND_URL` env var missing on Render → hardcoded Vercel origins in CORS
  - RC-5 (trigger): Render silently upgraded Python 3.11 → 3.14 → surfaced all latent bugs
  - Fix: `runtime.txt` pinned to Python 3.11.9
  - Fix: Seeder changed to upsert — always syncs hashed passwords on deploy
  - RCA docs written to `docs/RCA-2026-03-21-login-failure.md` + deep-dive

## What Shipped This Session (2026-03-27 — Session 28)
- **FEAT-1004: Trade Notifications UI** ✅
  - Backend: `client_id` field added to NotificationOut schema; `client_id` property on Notification model (derives from Trade FK)
  - Frontend: NotificationBell component in ClientList header
    - Red unread count badge (displays "9+" for counts >9)
    - Dropdown panel with emoji icons (🔔 submitted, ✅ approved, ❌ rejected)
    - Colored left borders (amber/green/red) matching trade statuses
    - Auto-polling every 60 seconds
    - Mark-all-read on panel open
    - Click notification to navigate to client's 360° page
    - Mobile-responsive (full-width dropdown on small screens)
    - Loading skeleton + empty state
  - Documentation: New "Notifications" section added to HelpPage covering bell UI, behavior, color coding
  - Deployed: Vercel frontend + Render backend live ✅
  - Commit: `3058623` — git push + vercel --prod

## What Shipped (2026-03-21 — Session 13)
- **FEAT-903: Advisor self-edit profile page** — display_name, city, region; referral code read-only
- **FEAT-905: Full advisor object on /me** — Personal profile card shows name, city, region, referral, rating
- **FEAT-904: Direct portal client auto-create** — if no name match on registration, new Client row created with source='portal'
- **Violet Direct badge** — clients sourced from portal flagged distinctly in advisor client list
- **Source column migration** — `clients.source` VARCHAR DEFAULT 'advisor'
- **Superadmin on login page** — sunny_hayes shown with purple Superadmin pill
- **Fix: useAuth hydration** — login/register now calls getMe() after token set, so advisor object always populated

---

## 2026-03-20 ~14:00 — Design Review (no code shipped)
- Reviewed new design direction (Material Design / blue palette) — applies to both Advisor and Personal
- Key UI decisions confirmed for both apps:
  - Help → `help_outline` icon button in header (top-right, beside notifications) — not in nav
  - Mobile bottom nav: 4 core tabs only (no Help tab)
  - ARIA Says / Advisor Insight card: dark gradient to signal AI layer
  - Goals: progress bars, not just % number
  - Asset allocation bars: target marker + deviation pill
- V2 mockup approved in direction but too cluttered — V3 pass (whitespace, density) parked for next session
- Light/dark toggle added to backlog
- **Rule locked:** Any design change to one app → confirm with Sunny before applying to the other

## What Shipped This Session (2026-03-18 — Session 10 continued)
- **FEAT-A: Add/Edit/Delete Goals** ✅
  - Backend: `PUT /clients/{id}/goals/{goal_id}` + `DELETE` — probability recalculated on edit
  - Frontend: GoalsPanel — inline edit form per card, "Add Goal" button, two-step delete confirm, `onGoalsChange` callback prop
- **FEAT-B: Add/Edit/Delete Life Events** ✅
  - Backend: `GET/POST/PUT/DELETE /clients/{id}/life-events` routes
  - Frontend: Client360 events tab — "Log Event" button, modal with emoji-labeled type selector, inline edit/delete with two-step confirm, local state update (no full refetch)
- **FEAT-C: Edit Holdings inline** ✅
  - "Edit Holdings" button in Portfolio tab, inline form mirrors ClientForm Tab 3, saves via `POST /clients/{id}/portfolio` (full replace), then refetches
- **FEAT-D: Holdings expand drawer** ✅
  - HoldingsTable cards clickable → bottom sheet (mobile) / centered modal (desktop) with fund detail, NAV, units, drift
- **FEAT-E: Static NAV seed data** ✅
  - `units_held` + `nav_per_unit` columns added to Holding model + startup migration
  - All 20 clients' holdings seeded with realistic INR NAV values; `units_held = round(current_value / nav_per_unit, 3)`
- **FEAT-F: Portfolio chart double-click expand** ✅
  - PortfolioChart: `onDoubleClick` on chart div → full-screen modal with large donut + sortable holdings table (fund, category, value, %, target, drift, NAV, units)

## What Shipped This Session (2026-03-18 — Session 10)
- **UI/UX Batch 3 — 10 fixes** ✅
  - Fix 8: Concentric radius correction — `rounded-xl` inner buttons inside `rounded-2xl p-5` wrappers stepped down to `rounded-lg` in GoalsPanel (Run Scenario, Reset, scenario result) and Client360
  - Fix 9: MeetingPrepPanel slide-in animation — always-mounted with CSS transform toggle in Client360; backdrop separate; MeetingPrepPanel loses its own `fixed` wrapper, returns plain content div with `meeting-prep-print` class
  - Fix J: Active filter pill stronger visual — all active pills now `bg-navy-950 text-white border-navy-950`; inactive `bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50`; `transition-all` on both
  - Fix K: Client initials avatar — `User` icon replaced with derived initials (first 2 letters, uppercase) in both desktop sidebar and mobile info tab avatars in Client360; `User` import removed
  - Fix L: Portfolio drift tooltip — `title` attribute on drift spans in PortfolioChart with "Overweight by X% — consider rebalancing", "Underweight by X% — consider adding", or "Within target range"; `cursor-help` added
  - Fix M: Left sidebar collapse toggle — `sidebarCollapsed` state in Client360; sidebar transitions `w-64` ↔ `w-12`; collapsed shows `ChevronRight` expand button; expanded shows `ChevronLeft` collapse button at top; `ChevronLeft` / `ChevronRight` imported
  - Fix N: Print styles — `@media print` block added to index.css; `.meeting-prep-print` class on MeetingPrepPanel root div
  - Fix O: aria-labels — `aria-label` added to Print (Meeting prep), Close (Meeting prep), Delete interaction (Trash2), Send message (CopilotChat), Edit client button, Collapse/Expand sidebar buttons
  - Fix P: autocomplete attributes — `autoComplete` added to all ClientForm fields: name, bday, off (PAN), tel, email, street-address, address-level2, postal-code
  - Fix Q: Lazy-mount inactive tabs — `useRef` `everActiveRef` tracks visited tabs; non-portfolio tabs render only after first visit, then stay mounted with `hidden` class; `handleTabChange` replaces direct `setActiveTab` calls

- **UI/UX Batch 2 — 8 fixes** ✅
  - Fix 5: Prefetch on hover — `handlePrefetch` via `useRef` cache in ClientList; `window.__ariaClientCache` populated on hover, checked in Client360 useEffect for instant render
  - Fix 6: Layered shadow tokens — `shadow-card`, `shadow-modal`, `shadow-card-hover` added to tailwind.config; applied across all card elements, modals, and hover states
  - Fix 7: text-wrap — `h1-h4 { text-wrap: balance }` and `p { text-wrap: pretty }` added to `@layer base` in index.css
  - Fix D: PortfolioChart empty state — guard against no holdings / all-zero values; shows illustrated empty state with pie icon
  - Fix E: Goal ring context label — "chance of / reaching goal" sub-label added below ProbabilityRing SVG in GoalsPanel
  - Fix F: Life events sorted descending — spread + sort by `event_date` desc before `.map()` in Client360 events tab
  - Fix G: Morning briefing collapsible — `briefingCollapsed` state, ChevronDown toggle in BriefingCard header
  - Fix H: Locked tab tooltip — `title` attribute on disabled Portfolio/Goals tabs in ClientForm
  - Fix I: Scenario before/after on ring — ⏸ Deferred (requires complex SVG dual-arc work)
- **UI/UX Batch 1 — 8 fixes** ✅
  - Fix 1: Tabular nums (`font-variant-numeric: tabular-nums`) in `@layer base` for `td`, `th`, `font-semibold`, `font-bold` elements
  - Fix 2: Active press scale — `active:scale-[0.98]` on cards, `active:scale-[0.96]` on buttons across ClientList, Client360, MeetingPrepPanel, InteractionsPanel, CopilotChat; `-webkit-tap-highlight-color: transparent` global
  - Fix 3: Skeleton loaders replacing text loading states in ClientList and Client360
  - Fix 4: Touch targets — `min-h-[44px]` on Sign Out (ClientList), Back button (Client360), mobile tab bar buttons (Client360), Print/Close (MeetingPrepPanel)
  - Fix A: Empty search state — illustrated zero-results state with clear search button in ClientList when `filtered.length === 0 && search`
  - Fix B: CopilotChat history lifted to Client360 state — messages persist across tab switches (mobile + desktop both wired)
  - Fix C: Interaction delete two-step confirmation — first click shows inline "Delete this interaction? / Yes, delete / Cancel", auto-cancels after 4s
  - Fix SEC: Superadmin credentials (`sunny_hayes / aria2026`) removed from AdvisorLogin DOM; `rm_demo` hint retained

## What Shipped This Session (2026-03-18 — Session 9)
- **FEAT-404: Client Interaction Capture** ✅
  - New `client_interactions` table (call, email, meeting, follow_up types)
  - Backend: model, schemas, router (GET/POST/DELETE), urgency engine updated
  - Frontend: `InteractionsPanel.jsx` — stat chips, filter pills, log modal, card layout
  - Overdue follow-ups surface as urgency flags on the client list
- **Superadmin account** ✅ — `sunny_hayes / aria2026` with SUPER badge, dynamic `displayName` greeting
- **UI refresh** ✅
  - `HoldingsTable` → card layout with allocation bars + category color chips
  - `GoalsPanel` → SVG probability ring, collapsible what-if panel, TrendingUp/Down icons
  - `Client360` → tab bar polished (active tint, semibold), life events empty state
  - `InteractionsPanel` → full rewrite with stat chips, modal, filter pills
- **Footer** ✅ — "Built with ❤️ from Hyderabad" on ClientList sidebar + AdvisorLogin
- **Client List view toggle** ✅ — Grouped (default, collapsible) | List
  - Grouped: Needs Attention / On Track sections, both start collapsed
  - Removed "Mumbai Branch" hardcoded label
- **CLAUDE.md** updated — No Co-Authored-By rule now in authoritative config
- Commits: `b0228d3` → `bc42fcf` → pushed, Vercel deployed

## What Shipped This Session (2026-03-17 — Session 8)
- **FEAT-102/108/109: Complete client onboarding wizard** ✅
  - FEAT-102: 5-question risk questionnaire → auto-calculates risk_score + category (replaces manual slider)
  - FEAT-108: POST /clients/{id}/portfolio — fund holdings, allocation %, auto-totals value and pct
  - FEAT-109: POST /clients/{id}/goals — goals with Monte Carlo probability calculated on save
  - ClientForm rebuilt as 4-tab wizard: Identity → Risk Profile → Portfolio → Goals
  - Tabs 3+4 unlock after client is created; Skip buttons allow partial onboarding
  - Commit: `87fb965` → pushed, Vercel deploying

## What Shipped Last Session (2026-03-17 — Session 7)
- **FEAT-101: Add + Edit Client module** ✅
  - 7 new fields on Client model: phone, email, date_of_birth, address, city, pincode, pan_number
  - `POST /clients` — create new client
  - `PUT /clients/{id}` — update any field (risk_category auto-derived)
  - Startup migration — adds columns to existing DB without data loss
  - `ClientForm.jsx` — single reusable form for add and edit
  - DOB auto-calculates age; risk score slider auto-shows category label
  - "Add Client" button in ClientList header
  - "Edit" button in Client360 sidebar
  - Routes: `/clients/new` and `/clients/:id/edit`
- Commit: `01d1af3` → pushed to GitHub, Vercel auto-deploying

---

## Next Session Agenda ← START HERE NEXT SESSION

### 1. FEAT-503 — Live goal probability recalculation
- Trigger `getGoalProjection` automatically as sliders move (debounced ~500ms)
- Update goal cards in real-time with scenario probability and delta
- Replace manual "Run Scenario" button with auto-run

### 2. FEAT-301 — Book-level copilot (after FEAT-503)

## What Shipped This Session (2026-03-17)
- Full stack deployed to Render + Supabase + Vercel ✅
- FEAT-308 Meeting Prep Card ✅
- Advisor Login / Client Login / Client Portal ✅
- WF benchmarking + PRD v1.1 ✅
- HELP.md + v1.2 version number in UI ✅
- Anthropic API credits added — Morning Briefing + Meeting Prep confirmed working ✅

## Open Flags
- FEAT-503 (live goal sliders) → FEAT-301 (book-level copilot) — next up

## What Shipped This Session (2026-03-18 — Session 9 / Bug + Brand)
- **Goal save/delete 500 errors fixed** ✅ — NameError on `models.Goal` in clients.py; explicit `Response(status_code=204)` for delete routes
- **Safari date input fixed** ✅ — month/year `<select>` dropdowns replace `<input type="date">` in GoalsPanel (new goal form)
- **Login pages redesigned — both apps** ✅ — split layout: dark navy gradient left panel, slate-50 right panel; taglines at text-4xl font-bold text-blue-300
- **ARiALogo / ARIALogo components** ✅ — round dot on dotless ı, brand blue `#1D6FDB` dash (A-RiA) and dot; inline text flow (no flex wrapper)
- **Design system proposal** ✅ — brand blue `#1D6FDB`, probability pills, HTML preview page generated
- **ARIA Whitepaper** ✅ — ARIA_WHITEPAPER.md + ARIA_Whitepaper.docx (116KB) + ARIA_Executive_Deck.pptx (12 slides, 143KB)
- **PRD**: FEAT-503 + FEAT-504 marked ✅
- Commit: `49ec7e7`

## What Shipped This Session (2026-03-18 — Session 10 / Efficiency Doc + Config)
- **ARIA_EFFICIENCY_WHITEPAPER.md** ✅ — full case study, 9 sections + 4 appendices, git stats
- **ARIA_Efficiency_Whitepaper.docx** ✅ — formatted Word doc: cover page, TOC field, charts, tables, footer
- **generate_aria_efficiency_docx.py** ✅ — generator script, regenerate any time with python3
- **~/.claude/settings.json** ✅ — `bypassPermissions` set + grep/find/head/tail/awk/cd added; restart Claude Code to activate
- **Parking lot** ✅ — project documents template (Word/PPT/Excel) parked for future session
- Commit: `2ae64d8`
