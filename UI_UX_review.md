# ARIA — UI/UX Review

> Reviewed: 18 March 2026
> Methodology: [userinterface-wiki](https://github.com/raphaelsalaja/userinterface-wiki) — 152 rules across 12 categories
> Extended: 18 March 2026 — full codebase analysis (17 additional findings)

---

## Implementation Plan & Status

> Legend: ⬜ Not started · 🔄 In progress · ✅ Done · ⏸ Deferred

### Batch 1 — HIGH Priority (implement first)
| # | Finding | File(s) | Status |
|---|---------|---------|--------|
| 1 | Tabular nums for financial figures | index.css, ClientList, Client360, GoalsPanel | ✅ |
| 2 | Active-state press scale on buttons/cards | ClientList + global buttons | ✅ |
| 3 | Skeleton loaders (replace text loaders) | ClientList, Client360 | ✅ |
| 4 | Touch target size ≥32px | ClientList, Client360, MeetingPrepPanel | ✅ |
| A | Empty state for zero search results | ClientList | ✅ |
| B | CopilotChat history persists across tab switches | Client360, CopilotChat | ✅ |
| C | Interaction delete confirmation | InteractionsPanel | ✅ |

### Batch 2 — MEDIUM Priority
| # | Finding | File(s) | Status |
|---|---------|---------|--------|
| 5 | Prefetch client data on hover | ClientList | ✅ |
| 6 | Layered shadows (tokens in tailwind.config) | tailwind.config, all cards | ✅ |
| 7 | text-wrap: balance/pretty | index.css | ✅ |
| D | PortfolioChart empty/zero-data state | PortfolioChart | ✅ |
| E | Goal probability ring — context label | GoalsPanel | ✅ |
| F | Life events sorted by date descending | Client360 | ✅ |
| G | Morning briefing collapsible | ClientList | ✅ |
| H | Locked tab tooltip ("Save Identity & Risk first") | ClientForm | ✅ |
| I | Scenario before/after comparison on ring | GoalsPanel | ⏸ |

### Batch 3 — LOW / Polish
| # | Finding | File(s) | Status |
|---|---------|---------|--------|
| 8 | Concentric radius correction | GoalsPanel, Client360 | ⬜ |
| 9 | MeetingPrepPanel slide-in animation | MeetingPrepPanel, index.css | ⬜ |
| J | Active filter pill stronger visual treatment | InteractionsPanel | ⬜ |
| K | Client initials avatar (replace generic icon) | Client360 | ⬜ |
| L | Portfolio drift row — rebalance action/tooltip | PortfolioChart | ⬜ |
| M | Left sidebar collapse toggle on Client360 | Client360 | ⬜ |
| N | Print styles for MeetingPrepPanel | index.css | ⬜ |

### Systemic (cross-cutting)
| # | Finding | File(s) | Status |
|---|---------|---------|--------|
| O | aria-label on all icon-only buttons | All components | ⬜ |
| P | autocomplete attributes on form inputs | ClientForm | ⬜ |
| Q | Lazy-mount inactive tabs | Client360 | ⬜ |

### Security
| # | Finding | File(s) | Status |
|---|---------|---------|--------|
| SEC | Remove superadmin credentials from DOM | AdvisorLogin | ✅ |

---

## Findings — Original (Batch 1 & 2 from initial review)

### 1. `type-tabular-nums-for-data` — HIGH

**Every financial figure layout-shifts without tabular numbers.**

Without `font-variant-numeric: tabular-nums`, digit widths vary (e.g. "1" vs "8"), causing columns to jitter as values update.

Affected files:
- `frontend/src/pages/ClientList.jsx` — portfolio values in table/cards
- `frontend/src/pages/Client360.jsx` — `{score}/10` risk score, portfolio total
- `frontend/src/components/GoalsPanel.jsx` — `ProbabilityRing` percentage text, SIP amounts in sliders

**Fix:**
```css
/* frontend/src/index.css — in @layer base */
td, [class*="font-semibold"], .tabular {
  font-variant-numeric: tabular-nums;
}
```
Or per-element with Tailwind arbitrary value:
```jsx
className="... [font-variant-numeric:tabular-nums]"
```

---

### 2. `physics-active-state` — HIGH

**No `:active` scale feedback on any interactive element.**

Cards and buttons show `hover:bg-*` colour changes but no press-scale transform. This makes the app feel unresponsive, especially on touch/mobile.

Affected files:
- `frontend/src/pages/ClientList.jsx` — `ClientCard` has `active:bg-gray-50` (colour only, no scale)
- All nav buttons, tab buttons, CTA buttons across the app

**Fix:**
```jsx
// Cards
className="... active:scale-[0.98] transition-transform"

// Buttons
className="... active:scale-[0.96] transition-transform"
```

---

### 3. `ux-doherty-perceived-speed` — HIGH

**Main loading screens are plain text — not skeletons.**

Perceived wait time is significantly higher when there's nothing to look at. `MeetingPrepPanel.jsx` and `SituationSummary.jsx` already do this correctly with `animate-pulse` skeleton rows. The two primary page-level loaders don't.

Affected files:
- `frontend/src/pages/ClientList.jsx` — shows full-screen `"Loading clients…"` text
- `frontend/src/pages/Client360.jsx` — same full-screen text block

**Fix:** Replace the text loader with a skeleton that mirrors the real layout:
```jsx
// Example skeleton for ClientList
if (loading) {
  return (
    <div className="p-8 space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
      ))}
    </div>
  )
}
```

---

### 4. `ux-fitts-target-size` — HIGH

**Multiple touch targets fall below the 32px minimum.**

Small touch targets cause mis-taps and frustration, especially on mobile.

Affected locations:
- `frontend/src/pages/ClientList.jsx` — "Sign out" button: `text-xs mt-2` ≈ 20px height
- `frontend/src/pages/Client360.jsx` — mobile "Back" button: `text-xs gap-1.5` ≈ 24px
- Mobile tab bar buttons: `px-3 py-2 text-xs` ≈ 28px height
- `frontend/src/components/MeetingPrepPanel.jsx` — Printer/close: bare `<button>` around 16px icon, no padding

**Fix:**
```jsx
// Minimum viable touch target
className="... min-h-[32px] flex items-center"

// Or expand hit area visually without changing layout
className="p-2 -m-2"
```

---

### 5. `prefetch-trajectory-over-hover` — MEDIUM

**Zero prefetching on the client list — every click waits for an API round-trip.**

Advisors visually scan the list before clicking a client, providing a clear signal to prefetch. Fetching on `mouseenter` reclaims 100–200ms of perceived latency.

Affected file: `frontend/src/pages/ClientList.jsx`

**Fix:**
```jsx
const prefetchCache = useRef({})
const prefetch = (id) => {
  if (!prefetchCache.current[id]) {
    prefetchCache.current[id] = getClient(id)
  }
}

// On each row/card
<tr onMouseEnter={() => prefetch(client.id)} onClick={() => navigate(`/clients/${client.id}`)}>
```
Then in `Client360.jsx`, check the cache before fetching fresh.

> **Note:** The cache-check wiring in `Client360.jsx` must be completed for this to have any effect — prefetch alone fires a parallel request, not an ahead-of-time one.

---

### 6. `visual-layered-shadows` — MEDIUM

**Only `shadow-sm` is used throughout — the UI reads as uniformly flat.**

A single-layer shadow has no depth differentiation between cards, modals, and page chrome.

**Fix — define tokens in `tailwind.config.js` (not inline styles):**
```js
// tailwind.config.js
extend: {
  boxShadow: {
    card: '0 1px 2px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
    modal: '0 4px 6px rgba(0,0,0,0.07), 0 12px 32px rgba(0,0,0,0.10)',
  }
}
```
Then use `shadow-card` and `shadow-modal` class names throughout.

---

### 7. `type-text-wrap-balance` + `type-text-wrap-pretty` — MEDIUM

**Headings and body text lack modern wrapping control.**

The greeting line can wrap mid-sentence on medium screens. Briefing narrative and situation summaries may leave single-word orphans.

**Fix — add to `frontend/src/index.css`:**
```css
@layer base {
  h1, h2, h3 { text-wrap: balance; }
  p           { text-wrap: pretty; }
}
```

---

### 8. `visual-concentric-radius` — LOW

**Inner element radius should equal outer radius minus padding.**

- `frontend/src/components/GoalsPanel.jsx` — `rounded-2xl` outer (16px) with `p-5` (20px padding) — inner elements should be `rounded-md`, not `rounded-xl`.
- `frontend/src/pages/Client360.jsx` — verify inner elements step down one tier when padding ≥ 20px.

**Rule:** `inner_radius ≈ outer_radius − padding`. When padding ≥ outer_radius, use `rounded-md` or `rounded-lg`.

---

### 9. `exit-requires-wrapper` — LOW

**The MeetingPrepPanel slides in with no animation — appears abruptly.**

**Fix — Tailwind approach (avoids unmount animation problem):**
```jsx
// In Client360.jsx — keep panel mounted, toggle visibility
<div className={`fixed right-0 top-0 h-full transition-transform duration-[240ms] ease-out
  ${showMeetingPrep ? 'translate-x-0' : 'translate-x-full'}`}>
  <MeetingPrepPanel ... />
</div>
```
> **Note:** Do not unmount on close — if the component unmounts before the exit animation plays, the transition won't be visible. Keep mounted and use transform to hide/show.

---

## Findings — Extended (from full codebase analysis)

### A. No empty state for zero search results — HIGH

**When search returns nothing, the list goes blank with no feedback.** Users assume it's a bug.

Affected file: `frontend/src/pages/ClientList.jsx`

**Fix:**
```jsx
{filtered.length === 0 && query && (
  <div className="text-center py-16 text-gray-400">
    <Search className="mx-auto mb-3 opacity-40" size={32} />
    <p className="text-sm">No clients match "{query}"</p>
  </div>
)}
```

---

### B. CopilotChat history lost on tab switch — HIGH

**Chat state lives in component state.** Switch to Portfolio tab and back — conversation is gone. For an AI tool this destroys trust.

Affected files: `frontend/src/components/CopilotChat.jsx`, `frontend/src/pages/Client360.jsx`

**Fix:** Lift `messages` state up to `Client360` and pass as prop. Alternatively store in `sessionStorage` keyed by `clientId`.

---

### C. Interaction delete has no confirmation — HIGH

**Delete fires immediately.** A logged call or meeting note is unrecoverable.

Affected file: `frontend/src/components/InteractionsPanel.jsx`

**Fix:** Inline "confirm + undo" pattern — show a confirmation state on the card for 3 seconds before committing the delete. No modal needed.

```jsx
// Replace immediate delete with a two-step confirm
const [pendingDelete, setPendingDelete] = useState(null)

// First click: set pendingDelete = id (shows "Confirm?" UI)
// Second click or timeout: execute delete
// Any other action: cancel
```

---

### D. PortfolioChart has no empty/zero-data state — MEDIUM

**If a client has no portfolio data, Recharts renders a blank SVG** with no label or call to action.

Affected file: `frontend/src/components/PortfolioChart.jsx`

**Fix:** Check for empty/zero holdings before rendering chart:
```jsx
if (!holdings || holdings.length === 0) {
  return (
    <div className="text-center py-10 text-gray-400 text-sm">
      No portfolio data · <a href={`/clients/${clientId}/edit`} className="text-navy-600 underline">Add holdings</a>
    </div>
  )
}
```

---

### E. Goal probability ring has no context label — MEDIUM

**A first-time user doesn't know what the % means** (probability of reaching the goal amount by target date). The ring is visually clear but semantically ambiguous.

Affected file: `frontend/src/components/GoalsPanel.jsx`

**Fix:** Add a sub-label below the ring:
```jsx
<p className="text-xs text-gray-400 text-center mt-1">chance of reaching goal on time</p>
```
Or add a `title` tooltip on the SVG element.

---

### F. Life events not sorted by date — MEDIUM

**Events render in API-return order.** A "new_child" entered after "retirement" appears below it visually.

Affected file: `frontend/src/pages/Client360.jsx`

**Fix:** Sort before render:
```jsx
const sortedEvents = [...lifeEvents].sort((a, b) => new Date(b.event_date) - new Date(a.event_date))
```

---

### G. Morning briefing has no collapse — MEDIUM

**Once the briefing loads it stays expanded** with no way to dismiss or collapse it. Advisors who've read it can't reclaim the screen space.

Affected file: `frontend/src/pages/ClientList.jsx`

**Fix:** The ChevronRight rotation pattern already exists in this file (used for grouped view). Apply the same pattern to the briefing card.

---

### H. Locked form tabs have no tooltip — MEDIUM

**Tabs 3 & 4 in ClientForm are `cursor-not-allowed`** and greyed out with no explanation. Users don't know why.

Affected file: `frontend/src/pages/ClientForm.jsx`

**Fix:** One-liner:
```jsx
title={isLocked ? "Save Identity & Risk Profile first" : undefined}
```

---

### I. Scenario panel — no before/after on probability ring — MEDIUM

**When a scenario runs, the ring updates to the new value.** The original value disappears. Users can't see where they started.

Affected file: `frontend/src/components/GoalsPanel.jsx`

**Fix:** Retain `baseProbability` and display:
```jsx
{scenarioResult && (
  <p className="text-xs text-gray-400 text-center">was {baseProbability}%</p>
)}
```
Or render a secondary dashed arc on the SVG ring at the original position.

---

### J. Active filter pill indistinguishable from inactive — LOW

**The active filter pill has the same border treatment as inactive ones.** The current filter state isn't immediately obvious.

Affected file: `frontend/src/components/InteractionsPanel.jsx`

**Fix:** Active pill should be filled, not just bordered:
```jsx
// Active
className="bg-navy-950 text-white px-3 py-1 rounded-full text-xs font-medium"
// Inactive
className="border border-gray-200 text-gray-500 px-3 py-1 rounded-full text-xs"
```

---

### K. Client avatar uses generic icon — LOW

**The navy circle + User icon is the same for every client.** Initials would help advisors scan faster and feel more personal.

Affected file: `frontend/src/pages/Client360.jsx`

**Fix:**
```jsx
const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
// Replace <User /> icon with:
<span className="text-white font-semibold text-sm">{initials}</span>
```

---

### L. Portfolio drift row has no action affordance — LOW

**Red drift rows signal a problem but offer no next step.** Users see a red cell with no guidance.

Affected file: `frontend/src/components/PortfolioChart.jsx`

**Fix:** Add a tooltip or micro-label on overweight/underweight rows:
```jsx
title={drift > 2 ? `Overweight by ${drift}% — consider rebalancing` : undefined}
```

---

### M. Client360 left sidebar not collapsible — LOW

**Advisors who want more chart or chat space have no way to adjust.** The collapse chevron pattern already exists in the codebase.

Affected file: `frontend/src/pages/Client360.jsx`

**Fix:** Add a collapse toggle button to the left sidebar — same `rotate-90` chevron transition already used elsewhere. Toggle `w-64` ↔ `w-0 overflow-hidden`.

---

### N. No print styles for MeetingPrepPanel — LOW

**The Print button exists but `@media print` styles are undefined.** The nav, backdrop, and scroll containers will all print.

Affected file: `frontend/src/index.css`

**Fix:**
```css
@media print {
  body > *:not(.meeting-prep-panel) { display: none; }
  .meeting-prep-panel { position: static; box-shadow: none; width: 100%; }
}
```

---

### O. No `aria-label` on icon-only buttons — SYSTEMIC

**Every icon-only button (print, close, delete, tab toggles) has no accessible label.** Screen readers get nothing.

Affected: All components with icon-only buttons.

**Fix:** Add `aria-label` to every icon-only button:
```jsx
<button aria-label="Close meeting prep" onClick={onClose}>
  <X size={18} />
</button>
```

---

### P. Form inputs missing `autocomplete` attributes — SYSTEMIC

**Name, email, phone, address fields in `ClientForm.jsx` have no `autocomplete` attribute.** Browsers show intrusive or incorrect suggestions.

Affected file: `frontend/src/pages/ClientForm.jsx`

**Fix:** Add `autocomplete` to each field:
```jsx
<input autoComplete="name" ... />
<input autoComplete="email" ... />
<input autoComplete="tel" ... />
```

---

### Q. Inactive tabs mount immediately on Client360 — SYSTEMIC

**GoalsPanel, InteractionsPanel, and CopilotChat all mount on load** even when their tab is not active. Lazy-mount non-active tabs to reduce initial paint cost.

Affected file: `frontend/src/pages/Client360.jsx`

**Fix:** Render tab content only after first activation, then keep mounted:
```jsx
const [everActive, setEverActive] = useState({ portfolio: true })
// On tab click: setEverActive(prev => ({ ...prev, [tab]: true }))
// In render: {everActive.goals && <GoalsPanel ... />}
```

---

## Security Finding

### SEC. Hardcoded superadmin credentials visible in DOM — SECURITY

`frontend/src/pages/AdvisorLogin.jsx` — credentials for both `rm_demo` and `sunny_hayes` (superadmin) are rendered as visible hint text.

**Minimum fix:** Remove the superadmin credential hint from the rendered output. Demo advisor credentials alone are sufficient; superadmin access should require out-of-band knowledge.

---

## Summary Table

| # | Rule / Finding | File(s) | Priority | Status |
|---|----------------|---------|----------|--------|
| 1 | `type-tabular-nums-for-data` | ClientList, Client360, GoalsPanel | **HIGH** | ✅ |
| 2 | `physics-active-state` | All buttons + cards | **HIGH** | ✅ |
| 3 | `ux-doherty-perceived-speed` | ClientList, Client360 loaders | **HIGH** | ✅ |
| 4 | `ux-fitts-target-size` | Sign out, Back, mobile tabs, modal icons | **HIGH** | ✅ |
| A | Empty state for zero search results | ClientList | **HIGH** | ✅ |
| B | CopilotChat history persists across tabs | Client360, CopilotChat | **HIGH** | ✅ |
| C | Interaction delete confirmation | InteractionsPanel | **HIGH** | ✅ |
| 5 | `prefetch-trajectory-over-hover` | ClientList | MEDIUM | ✅ |
| 6 | `visual-layered-shadows` | All cards + MeetingPrepPanel | MEDIUM | ✅ |
| 7 | `type-text-wrap-balance/pretty` | index.css | MEDIUM | ✅ |
| D | PortfolioChart empty state | PortfolioChart | MEDIUM | ✅ |
| E | Goal ring context label | GoalsPanel | MEDIUM | ✅ |
| F | Life events sorted by date | Client360 | MEDIUM | ✅ |
| G | Morning briefing collapsible | ClientList | MEDIUM | ✅ |
| H | Locked tab tooltip | ClientForm | MEDIUM | ✅ |
| I | Scenario before/after on ring | GoalsPanel | MEDIUM | ⏸ |
| 8 | `visual-concentric-radius` | GoalsPanel, Client360 | LOW | ⬜ |
| 9 | `exit-requires-wrapper` | MeetingPrepPanel | LOW | ⬜ |
| J | Active filter pill styling | InteractionsPanel | LOW | ⬜ |
| K | Client initials avatar | Client360 | LOW | ⬜ |
| L | Drift row rebalance tooltip | PortfolioChart | LOW | ⬜ |
| M | Left sidebar collapse toggle | Client360 | LOW | ⬜ |
| N | Print styles for MeetingPrepPanel | index.css | LOW | ⬜ |
| O | `aria-label` on icon-only buttons | All components | SYSTEMIC | ⬜ |
| P | `autocomplete` on form inputs | ClientForm | SYSTEMIC | ⬜ |
| Q | Lazy-mount inactive tabs | Client360 | SYSTEMIC | ⬜ |
| SEC | Remove superadmin credentials from DOM | AdvisorLogin | SECURITY | ✅ |
