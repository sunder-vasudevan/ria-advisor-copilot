# ARIA Handoff Context (2026-04-03)

## Goal Completed
Built RIA-style preview artifacts and wired temporary preview routes, while keeping existing production flows untouched.

## What Was Done

### 1) Research + Design Direction
- Focused on RIA app patterns (advisor/client workflows), not generic CRM.
- Produced advisor and client high-fidelity mockups as standalone HTML.

### 2) Preview Artifacts Created
- Desktop mockups:
  - /Users/sunnyhayes/Desktop/advisor-page-high-fidelity.html
  - /Users/sunnyhayes/Desktop/client-page-high-fidelity.html
- Parity/mapping document:
  - /Users/sunnyhayes/Desktop/aria-parity-matrix.md

### 3) Advisor App Preview Pages (React)
Created in advisor app:
- /Users/sunnyhayes/Daytona/aria-advisor/frontend/src/pages/Client360V2Preview.jsx
- /Users/sunnyhayes/Daytona/aria-advisor/frontend/src/pages/AdvisorCollabPortalPreview.jsx
- /Users/sunnyhayes/Daytona/aria-advisor/frontend/src/pages/AdvisorWorkspacePreview.jsx

### 4) Routes Wired in Advisor App
File updated:
- /Users/sunnyhayes/Daytona/aria-advisor/frontend/src/App.jsx

Preview routes now available:
- /client360-v2-preview
- /advisor-collab-preview
- /advisor-workspace-preview

### 5) Personal App Scope Correction
- A temporary route was added in personal app, then removed per user request to keep previews in advisor folder/app only.
- Current intent: advisor-side previews only.

## Current Route Intent
- Existing real advisor workbench: /
- Existing real client page: /clients/:id
- New preview pages are additive and non-breaking.

## Important Constraints Already Followed
- No destructive git actions.
- Existing core pages/components not replaced.
- Added preview files/routes only.

## How To Run Locally
From advisor frontend:
1. cd /Users/sunnyhayes/Daytona/aria-advisor/frontend
2. npm install
3. npm run dev

Open (default Vite port example):
- http://localhost:5173/client360-v2-preview
- http://localhost:5173/advisor-collab-preview
- http://localhost:5173/advisor-workspace-preview

## Suggested Next Step (if continuing)
1. Choose one preview to promote first (recommended: AdvisorWorkspacePreview).
2. Replace static values with real selectors from existing API responses.
3. Keep rollout behind a feature flag or separate route before merging into primary flows.
