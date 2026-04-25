# Aria Mockup-to-Product Parity Matrix

Date: 2026-04-03
Scope: Advisor mockup + Client mockup versus Aria Advisor and Aria Personal current implementation
Constraint honored: no changes to existing code paths/routes/components

## 1) Section Mapping: Advisor Mockup -> Aria Advisor

| Mockup Section | Current Aria Advisor Source | Status | Gap | Suggested Integration Target |
|---|---|---|---|---|
| Left nav workspace modules | `src/pages/ClientList.jsx`, `src/App.jsx` routes | Partial | Visual IA differs from current compact list-style app chrome | New presentation layer in a v2 page component |
| KPI strip (AUM, at-risk goals, pending actions, upcoming meetings) | `src/pages/ClientList.jsx`, `src/pages/Client360.jsx`, `src/components/MeetingPrepPanel.jsx` | Partial | Data exists but not unified into one KPI rail | Derived KPI selectors in `Client360V2Preview` |
| Advisor profile + quick actions | `src/pages/ClientList.jsx` top actions/session controls | Partial | Missing dedicated profile card panel | Add right-rail profile card layout |
| Lifecycle timeline card | `src/pages/Client360.jsx` life events + interactions | Partial | Data exists but no canonical timeline visual | Composite timeline model from interactions + life events |
| Pipeline/workflow monitor | `src/components/TradesPanel.jsx`, life event flows | Partial | Operational panels exist but no single workflow board | Unified workflow board with stage badges |
| Compliance + risk snapshot | `src/pages/Client360.jsx` risk meter + event alerts | Partial | Not grouped as one compliance command card | Dedicated compliance module card |
| Integration health (CRM/custody/OMS) | Not explicit in UI (backend integrations implied) | Missing | No integration-status surface in app | Non-blocking status widget with mocked source tags |

## 2) Section Mapping: Client Mockup -> Aria Advisor

| Mockup Section | Current Aria Advisor Source | Status | Gap | Suggested Integration Target |
|---|---|---|---|---|
| Client identity side panel | `src/pages/Client360.jsx` header/details | Partial | Current header has data but not sticky info rail | Sticky left panel in v2 layout |
| Goals probability cards | `src/components/GoalsPanel.jsx` | Strong | Visual style and action affordances differ | Re-skin + keep existing goal actions |
| Holdings/allocations panel | `src/components/HoldingsTable.jsx`, `PortfolioChart.jsx` | Strong | Mostly visual/IA refinements | Keep logic, adopt carded hierarchy |
| Risk and urgency badges | `src/pages/Client360.jsx` risk meter + urgency badges | Strong | Badge taxonomy not fully normalized | Add severity legend and filter chips |
| Interaction timeline | `src/components/InteractionsPanel.jsx` | Partial | Timeline is present, but dense + less narrative | Chronological grouped timeline cards |
| Life events CRUD | `src/pages/Client360.jsx` modal CRUD | Strong | Existing behavior is robust | Keep behavior; move to clearer event lane |
| Meeting prep and copilot | `MeetingPrepPanel.jsx`, `CopilotChat.jsx` | Strong | Placement competes with core ops panel | Place as right column utilities |

## 3) Section Mapping: Client/Portal-like Experience -> Aria Personal

| Mockup Intent | Current Aria Personal Source | Status | Gap | Suggested Integration Target |
|---|---|---|---|---|
| Client-facing summary dashboard | `src/pages/Dashboard.jsx` | Strong | Already user-centric but not advisor-collab oriented | Add optional advisor-collab panel |
| Action queue (approve/reject trades) | `src/pages/Dashboard.jsx` + `api/personal.js` trade endpoints | Strong | Works, but not framed as workflow lane | Add workflow rail + statuses |
| Advisor collaboration lane | `src/pages/Dashboard.jsx` advisor banner + profile route | Partial | Thin collaboration model in UI | Dedicated advisor touchpoint module |
| Secure document/message handoff | Not explicit in personal UI | Missing | No visible secure exchange center | Add collaboration center preview (UI-only) |
| Plan milestones and lifecycle flow | Goals + life events pages/routes | Partial | Data split across routes | Cross-route milestone snapshot component |

## 4) Buttons and Workflow Delta (Implementation Notes)

### Buttons currently operational in Aria Advisor
- Life event create/update/delete
- Holdings save/rebalance path
- Trade draft/submit/approve/reject path
- Archive client
- Copilot message send

### Buttons in mockups that are visual-first (would need wiring)
- Workflow stage transitions from a single board
- Unified "Start review cycle" command
- Integration health drilldowns
- Compliance checkpoint quick-resolve actions

### Recommended non-breaking workflow shape
1. Intake (identity + risk + profile completeness)
2. Portfolio and goals review
3. Event/interaction triage
4. Recommendation and trade proposal
5. Client acknowledgement and execution
6. Compliance close-out and monitoring

## 5) API Contract Anchors for Wiring (Reference)

Advisor API file: `aria-advisor/frontend/src/api/client.js`
- `/clients`, `/clients/:id`, `/clients/:id/holdings`, `/clients/:id/goals`
- `/clients/:id/life-events`, `/clients/:id/interactions`
- `/trades/...`, `/notifications/...`

Personal API file: `aria-personal/src/api/personal.js`
- `/personal/portfolio`, `/personal/goals`, `/personal/life-events`
- `/trades/personal/...`
- `/notifications/personal/me`

## 6) Delivery Artifacts Created in This Step

1. `aria-advisor/frontend/src/pages/Client360V2Preview.jsx`
2. `aria-personal/src/pages/AdvisorCollabPortalPreview.jsx`
3. This parity file: `Desktop/aria-parity-matrix.md`

These are additive preview artifacts only and do not modify any existing route or behavior.
