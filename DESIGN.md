# ARIA Design System

> Single source of truth for visual design across A-RiA (Advisor) and ARIA Personal. Both apps share the same tokens.

---

## Brand

| App | Name | Tagline |
|-----|------|---------|
| Advisor workbench | A-RiA | "Real Intelligence for Every Client" |
| Consumer app | ARIA Personal | "Your Money Intelligence" |

**Footer (both):** "Made with ❤️ in Hyderabad"

---

## Color Tokens

### Brand Blue
| Token | Value | Usage |
|-------|-------|-------|
| `#1D6FDB` | Primary brand blue | CTAs, active nav, links, gradient start |
| `blue-700` (`#1d4ed8`) | Hover state | Button hover, gradient end |
| `blue-50` | Tint | Active nav background, avatar background |

### Navy (sidebar, login panel legacy)
| Token | Tailwind | Value |
|-------|----------|-------|
| `navy-950` | `bg-navy-950` | `#070f3d` — login left panel, legacy sidebar |
| `navy-800` | `bg-navy-800` | `#102692` |
| `navy-400` | `text-navy-400` | `#4c7bff` — muted text on dark |
| `navy-300` | `text-navy-300` | `#7fa5ff` — secondary text on dark |

### Surfaces
| Usage | Class |
|-------|-------|
| Page background | `bg-gray-50` |
| Card | `bg-white rounded-2xl border border-gray-100 shadow-sm` |
| Card hover | `shadow-card-hover` |
| Input | `bg-white border border-gray-200 rounded-xl` |

### Semantic
| Meaning | Background | Text |
|---------|-----------|------|
| Success / On Track | `bg-emerald-50` | `text-emerald-700` |
| Warning / Review | `bg-amber-50` | `text-amber-700` |
| Danger / Urgent | `bg-red-50` | `text-red-700` |
| Info | `bg-blue-50` | `text-[#1D6FDB]` |

### Probability Pills
| Range | Color | Class |
|-------|-------|-------|
| ≥ 80% | Teal | `bg-teal-100 text-teal-700` |
| 60–79% | Amber | `bg-amber-100 text-amber-700` |
| < 60% | Rose | `bg-rose-100 text-rose-700` |

---

## Typography

**Font:** Inter (sans), JetBrains Mono (code/numbers)

| Role | Class |
|------|-------|
| Page title | `text-2xl font-bold text-gray-900` |
| Section heading | `text-lg font-semibold text-gray-900` |
| Card title | `text-sm font-semibold text-gray-900` |
| Body | `text-sm text-gray-600` |
| Caption / meta | `text-xs text-gray-400` |
| Label | `text-xs font-semibold text-gray-700 uppercase tracking-wider` |
| Large number (AUM, total) | `text-3xl font-bold text-gray-900 tabular-nums` |

---

## Frosted Glass

Used for sticky top bar and mobile bottom nav on both apps.

```
Top bar:    bg-white/80 backdrop-blur-md border-b border-gray-200
Bottom nav: bg-white/90 backdrop-blur-md border-t border-gray-200
```

Safari support: backdrop-filter available since Safari 14. No polyfill needed.

---

## Layout

### ARIA Advisor (workbench)
```
┌─────────────────────────────────────────┐
│  Frosted top bar (sticky)               │
│  Logo | Nav links | Briefing | Add CTA  │
├─────────────────────────────────────────┤
│  Greeting bento (3-col grid)            │
│  [Good morning + attention] [AUM card]  │
├─────────────────────────────────────────┤
│  Briefing card (col-span-2, lazy)       │
├─────────────────────────────────────────┤
│  Search + View toggle                   │
│  Client Book (dense table / cards)      │
└─────────────────────────────────────────┘
│  Mobile: frosted bottom nav (4 items)   │
└─────────────────────────────────────────┘
```

**Key principle:** Client Book stays dense — row-per-client. No bento for the list itself. Density is intentional for a professional workbench.

### ARIA Personal (consumer)
```
┌─────────────────────────────────────────┐
│  Frosted top bar (sticky)               │
│  ARIA logo | Desktop nav | User/logout  │
├─────────────────────────────────────────┤
│  Page content (max-w-4xl, centered)     │
│  pb-20 on mobile for bottom nav gap     │
└─────────────────────────────────────────┘
│  Mobile: frosted bottom nav (5 items)   │
└─────────────────────────────────────────┘
```

---

## Components

### Top Bar
- Height: `py-3` (~48px)
- Sticky: `sticky top-0 z-40`
- Frosted: `bg-white/80 backdrop-blur-md border-b border-gray-200`

### Buttons

| Variant | Class |
|---------|-------|
| Primary (Add Client CTA) | `px-5 py-2.5 bg-[#1D6FDB] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-sm transition-colors` |
| Secondary | `px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50` |
| Ghost nav | `px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 text-sm font-medium` |
| Active nav | `px-3 py-1.5 rounded-lg bg-blue-50 text-[#1D6FDB] text-sm font-medium` |
| Danger | `bg-red-600 text-white hover:bg-red-700` |

### Mobile FAB (Add Client)
```
fixed bottom-20 right-4 z-50 w-14 h-14
bg-[#1D6FDB] text-white rounded-full shadow-lg
flex items-center justify-center
hover:bg-blue-700 active:scale-95 transition-all
```

### Avatar Initials
```
w-9 h-9 rounded-full bg-blue-100 text-[#1D6FDB]
flex items-center justify-center text-sm font-bold flex-shrink-0
```
Logic: `name.split(' ').map(n => n[0]).slice(0, 2).join('')`

### Bento Hero (Advisor)
- Gradient card (col-span-2): `bg-gradient-to-br from-[#1D6FDB] to-blue-700 rounded-2xl p-6 text-white`
- Stats card (col-1): `bg-white rounded-2xl border border-gray-100 shadow-sm p-6`

### Portal Active Badge
- Shown on client rows when `personal_user_id` is set
- `bg-teal-100 text-teal-700` pill: "Portal Active"

### Bottom Nav (mobile)
- 4 items: Clients | New | Briefing | Help (Advisor)
- 5 items: Dashboard | Goals | Life Events | Ask ARIA | Help (Personal)
- Add `h-16` spacer below content to prevent overlap

---

## Login Pages (both apps)

Split layout:
- **Left (lg+):** Dark navy gradient panel — logo, tagline, stats
- **Right:** `bg-gray-50` — form, demo credentials

---

## Shadows

| Token | Value |
|-------|-------|
| `shadow-card` | `0 1px 2px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)` |
| `shadow-card-hover` | `0 2px 4px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)` |
| `shadow-modal` | `0 4px 6px rgba(0,0,0,0.07), 0 12px 32px rgba(0,0,0,0.10)` |
