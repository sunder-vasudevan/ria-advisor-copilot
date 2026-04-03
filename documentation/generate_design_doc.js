const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, LevelFormat, TableOfContents, PageBreak
} = require('docx');
const fs = require('fs');

// ── Colors ──────────────────────────────────────────────────────────────────
const C = {
  black: "1A1A2E",
  dark: "16213E",
  mid: "0F3460",
  accent: "533483",
  blue: "2563EB",
  lightBlue: "DBEAFE",
  green: "166534",
  lightGreen: "DCFCE7",
  amber: "92400E",
  lightAmber: "FEF3C7",
  red: "991B1B",
  lightRed: "FEE2E2",
  gray: "6B7280",
  lightGray: "F3F4F6",
  white: "FFFFFF",
  border: "E5E7EB",
  headerBg: "1E3A5F",
};

const border = { style: BorderStyle.SINGLE, size: 1, color: C.border };
const cellBorders = { top: border, bottom: border, left: border, right: border };
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: C.white },
  bottom: { style: BorderStyle.NONE, size: 0, color: C.white },
  left: { style: BorderStyle.NONE, size: 0, color: C.white },
  right: { style: BorderStyle.NONE, size: 0, color: C.white },
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
const h3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });

const body = (text, opts = {}) => new Paragraph({
  spacing: { before: 60, after: 120 },
  children: [new TextRun({ text, size: 22, font: "Arial", color: C.black, ...opts })]
});

const space = () => new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun("")] });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

const bullet = (text, ref = "b1") => new Paragraph({
  numbering: { reference: ref, level: 0 },
  spacing: { before: 40, after: 40 },
  children: [new TextRun({ text, size: 22, font: "Arial", color: C.black })]
});

const boldLine = (label, value) => new Paragraph({
  spacing: { before: 60, after: 60 },
  children: [
    new TextRun({ text: label, bold: true, size: 22, font: "Arial", color: C.black }),
    new TextRun({ text: value, size: 22, font: "Arial", color: C.black }),
  ]
});

const headerCell = (text, width, bg = C.headerBg) => new TableCell({
  borders: cellBorders,
  width: { size: width, type: WidthType.DXA },
  shading: { fill: bg, type: ShadingType.CLEAR },
  verticalAlign: VerticalAlign.CENTER,
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, bold: true, size: 20, color: C.white, font: "Arial" })]
  })]
});

const cell = (text, width, bg = C.white, bold = false, color = C.black, center = false) => new TableCell({
  borders: cellBorders,
  width: { size: width, type: WidthType.DXA },
  shading: { fill: bg, type: ShadingType.CLEAR },
  verticalAlign: VerticalAlign.CENTER,
  children: [new Paragraph({
    alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 20, font: "Arial", color, bold })]
  })]
});

const statusCell = (text, width, status) => {
  const map = { pass: [C.lightGreen, C.green], fail: [C.lightRed, C.red], partial: [C.lightAmber, C.amber] };
  const [bg, fg] = map[status] || [C.lightGray, C.gray];
  return cell(text, width, bg, true, fg, true);
};

const sectionHeader = (text) => new Paragraph({
  spacing: { before: 200, after: 100 },
  children: [
    new TextRun({ text: "━━━  ", color: C.accent, size: 20, font: "Arial" }),
    new TextRun({ text, bold: true, size: 28, font: "Arial", color: C.dark }),
  ]
});

// ── Content ──────────────────────────────────────────────────────────────────

// COVER PAGE
const coverPage = [
  space(), space(), space(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 60 },
    children: [new TextRun({ text: "ARIA", bold: true, size: 96, font: "Arial", color: C.dark })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 200 },
    children: [new TextRun({ text: "Advisor Relationship Intelligence Assistant", size: 32, font: "Arial", color: C.accent })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 80 },
    children: [new TextRun({ text: "Technical Design Document", bold: true, size: 40, font: "Arial", color: C.black })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 40 },
    children: [new TextRun({ text: "Version 1.3  •  April 2026", size: 24, font: "Arial", color: C.gray })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 40 },
    children: [new TextRun({ text: "Covers: Advisor Workbench  •  ARIA Personal  •  Unified Asset SDK", size: 22, font: "Arial", color: C.gray })]
  }),
  space(), space(),
  new Table({
    columnWidths: [9360],
    margins: { top: 100, bottom: 100, left: 180, right: 180 },
    rows: [
      new TableRow({ children: [new TableCell({
        borders: { top: { style: BorderStyle.SINGLE, size: 6, color: C.accent }, bottom: { style: BorderStyle.NONE, size: 0, color: C.white }, left: { style: BorderStyle.NONE, size: 0, color: C.white }, right: { style: BorderStyle.NONE, size: 0, color: C.white } },
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: C.lightGray, type: ShadingType.CLEAR },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, children: [new TextRun({ text: "Deployment Status: LIVE", bold: true, size: 22, font: "Arial", color: C.green })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 }, children: [new TextRun({ text: "Advisor: aria-advisor.vercel.app  •  Personal: aria-personal.vercel.app  •  API: aria-advisor.onrender.com", size: 20, font: "Arial", color: C.gray })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 120 }, children: [new TextRun({ text: "Stack: FastAPI + React/Vite + Supabase PostgreSQL + Claude API + Unified Asset SDK", size: 20, font: "Arial", color: C.gray })] }),
        ]
      })] })
    ]
  }),
  pageBreak(),
];

// 1. SYSTEM OVERVIEW
const systemOverview = [
  h1("1. System Overview"),
  body("ARIA is a dual-app wealth management platform. The Advisor Workbench is a React + FastAPI tool for Relationship Managers to manage clients, track portfolios, run AI copilot queries, and initiate trades. ARIA Personal is a companion app where end clients track their own wealth, approve trades, and chat with an AI copilot — all sharing a single backend."),
  space(),
  h2("1.1 Applications"),
  new Table({
    columnWidths: [2200, 3580, 3580],
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    rows: [
      new TableRow({ tableHeader: true, children: [headerCell("App", 2200), headerCell("Users", 3580), headerCell("Primary URL", 3580)] }),
      new TableRow({ children: [cell("Advisor Workbench", 2200, C.lightBlue, true), cell("Relationship Managers (RMs)", 3580), cell("aria-advisor.vercel.app", 3580)] }),
      new TableRow({ children: [cell("ARIA Personal", 2200, C.lightBlue, true), cell("End clients (self-service)", 3580), cell("aria-personal.vercel.app", 3580)] }),
    ]
  }),
  space(),
  h2("1.2 Tech Stack"),
  new Table({
    columnWidths: [2200, 3580, 3580],
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    rows: [
      new TableRow({ tableHeader: true, children: [headerCell("Layer", 2200), headerCell("Technology", 3580), headerCell("Notes", 3580)] }),
      new TableRow({ children: [cell("Frontend", 2200, C.lightGray), cell("React 18 + Vite + Tailwind CSS", 3580), cell("Separate apps, shared API", 3580)] }),
      new TableRow({ children: [cell("Backend", 2200, C.lightGray), cell("Python 3.11 + FastAPI", 3580), cell("Single backend, dual-ownership models", 3580)] }),
      new TableRow({ children: [cell("ORM", 2200, C.lightGray), cell("SQLAlchemy 2.0", 3580), cell(".is_(True) pattern enforced", 3580)] }),
      new TableRow({ children: [cell("Database", 2200, C.lightGray), cell("Supabase PostgreSQL (pooler :6543)", 3580), cell("Max 20 connections, FK cascades", 3580)] }),
      new TableRow({ children: [cell("AI Layer", 2200, C.lightGray), cell("Anthropic Claude API (claude-sonnet-4-6)", 3580), cell("Copilot, briefing, situation, meeting prep", 3580)] }),
      new TableRow({ children: [cell("Asset SDK", 2200, C.lightGray), cell("aria_asset_sdk (mock, bundled)", 3580), cell("Provider pattern, swap-ready for real APIs", 3580)] }),
      new TableRow({ children: [cell("Auth", 2200, C.lightGray), cell("JWT (python-jose) + bcrypt", 3580), cell("24h expiry, Bearer token", 3580)] }),
      new TableRow({ children: [cell("Deploy — Frontend", 2200, C.lightGray), cell("Vercel (auto-deploy on push)", 3580), cell("aria-advisor + aria-personal projects", 3580)] }),
      new TableRow({ children: [cell("Deploy — Backend", 2200, C.lightGray), cell("Render.com (Nixpacks, Python 3.11.9 pinned)", 3580), cell("runtime.txt required", 3580)] }),
    ]
  }),
  pageBreak(),
];

// 2. ARCHITECTURE
const architecture = [
  h1("2. Architecture"),
  h2("2.1 Request Flow"),
  body("All API calls follow this path: Browser → Vercel Edge → FastAPI on Render → SQLAlchemy ORM → Supabase PostgreSQL. For AI features, FastAPI additionally calls Anthropic Claude API mid-request before returning a response."),
  space(),
  new Table({
    columnWidths: [1400, 200, 1400, 200, 1400, 200, 1400, 200, 1400],
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    rows: [
      new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 1400, type: WidthType.DXA }, shading: { fill: C.lightBlue, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Browser", bold: true, size: 20, font: "Arial", color: C.blue })] })] }),
        new TableCell({ borders: noBorders, width: { size: 200, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "→", size: 24, font: "Arial", color: C.accent })] })] }),
        new TableCell({ borders: cellBorders, width: { size: 1400, type: WidthType.DXA }, shading: { fill: C.lightBlue, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Vercel", bold: true, size: 20, font: "Arial", color: C.blue })] })] }),
        new TableCell({ borders: noBorders, width: { size: 200, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "→", size: 24, font: "Arial", color: C.accent })] })] }),
        new TableCell({ borders: cellBorders, width: { size: 1400, type: WidthType.DXA }, shading: { fill: C.lightBlue, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "FastAPI / Render", bold: true, size: 20, font: "Arial", color: C.blue })] })] }),
        new TableCell({ borders: noBorders, width: { size: 200, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "→", size: 24, font: "Arial", color: C.accent })] })] }),
        new TableCell({ borders: cellBorders, width: { size: 1400, type: WidthType.DXA }, shading: { fill: C.lightBlue, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "SQLAlchemy ORM", bold: true, size: 20, font: "Arial", color: C.blue })] })] }),
        new TableCell({ borders: noBorders, width: { size: 200, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "→", size: 24, font: "Arial", color: C.accent })] })] }),
        new TableCell({ borders: cellBorders, width: { size: 1400, type: WidthType.DXA }, shading: { fill: C.lightBlue, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Supabase PG", bold: true, size: 20, font: "Arial", color: C.blue })] })] }),
      ]})
    ]
  }),
  space(),
  h2("2.2 Auth Flow"),
  bullet("Advisor login: POST /advisor/login → JWT (24h)", "b2"),
  bullet("Personal user: POST /personal/auth/login → JWT (24h)", "b2"),
  bullet("Protected routes validate Bearer token in Authorization header", "b2"),
  bullet("Advisor routes also read X-Advisor-Id header for resource scoping", "b2"),
  bullet("Personal routes read X-Personal-User-Id or X-Client-Id", "b2"),
  space(),
  h2("2.3 Dual Ownership Pattern"),
  body("Portfolio, Goals, Life Events, Trades, Notifications, and AssetAccounts all support dual ownership: client_id (Advisor side) OR personal_user_id (Personal side). Queries always filter by the resolved owner from request headers. No ORM foreign keys cross models.py ↔ personal_models.py to avoid SQLAlchemy cross-file FK fragility."),
  space(),
  h2("2.4 Database Schema — Key Tables"),
  new Table({
    columnWidths: [2200, 3000, 4160],
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    rows: [
      new TableRow({ tableHeader: true, children: [headerCell("Table", 2200), headerCell("Key Columns", 3000), headerCell("Notes", 4160)] }),
      new TableRow({ children: [cell("advisors", 2200, C.lightGray, true), cell("id, username, hashed_password, is_active", 3000), cell("is_active uses .is_(True) — Python 3.14 critical", 4160)] }),
      new TableRow({ children: [cell("clients", 2200), cell("id, advisor_id, personal_user_id, source", 3000), cell("source: 'advisor' or 'portal' (self-registered)", 4160)] }),
      new TableRow({ children: [cell("personal_users", 2200, C.lightGray), cell("id, email, hashed_password, advisor_id", 3000), cell("In personal_models.py (separate file)", 4160)] }),
      new TableRow({ children: [cell("portfolios", 2200), cell("client_id, personal_user_id, total_value", 3000), cell("Dual ownership. 1:1 with client", 4160)] }),
      new TableRow({ children: [cell("holdings", 2200, C.lightGray), cell("portfolio_id, asset_type, asset_code, units_held, price_per_unit", 3000), cell("asset_type: mutual_fund|crypto|stock|bond|commodity|forex", 4160)] }),
      new TableRow({ children: [cell("trades", 2200), cell("client_id, advisor_id, asset_type, action, status, tx_hash", 3000), cell("Status: draft→pending_approval→approved→settled", 4160)] }),
      new TableRow({ children: [cell("trade_audit_logs", 2200, C.lightGray), cell("trade_id, action, actor, timestamp", 3000), cell("actor: advisor|client|system", 4160)] }),
      new TableRow({ children: [cell("notifications", 2200), cell("advisor_id OR personal_user_id, notification_type, read", 3000), cell("Mutually exclusive recipient. 60s polling on frontend", 4160)] }),
      new TableRow({ children: [cell("asset_accounts", 2200, C.lightGray), cell("client_id OR personal_user_id, provider, account_ref, asset_type", 3000), cell("New. Links provider account to owner", 4160)] }),
    ]
  }),
  pageBreak(),
];

// 3. API REFERENCE
const apiReference = [
  h1("3. API Reference"),
  h2("3.1 Auth"),
  new Table({
    columnWidths: [800, 1200, 2000, 5360],
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    rows: [
      new TableRow({ tableHeader: true, children: [headerCell("Method", 800), headerCell("Route", 1200), headerCell("Auth Header", 2000), headerCell("Description", 5360)] }),
      new TableRow({ children: [cell("POST", 800, "#EFF6FF", true, C.blue), cell("/advisor/login", 1200), cell("None", 2000), cell("Returns JWT + advisor profile", 5360)] }),
      new TableRow({ children: [cell("POST", 800, "#EFF6FF", true, C.blue), cell("/personal/auth/login", 1200), cell("None", 2000), cell("Returns JWT + personal user profile", 5360)] }),
      new TableRow({ children: [cell("POST", 800, "#EFF6FF", true, C.blue), cell("/personal/auth/register", 1200), cell("None", 2000), cell("Creates personal_user, auto-creates client if name matches", 5360)] }),
      new TableRow({ children: [cell("GET", 800, "#F0FDF4", true, C.green), cell("/advisor/me", 1200), cell("X-Advisor-Id", 2000), cell("Returns full advisor profile", 5360)] }),
    ]
  }),
  space(),
  h2("3.2 Clients & Portfolio"),
  new Table({
    columnWidths: [800, 2400, 2000, 4160],
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    rows: [
      new TableRow({ tableHeader: true, children: [headerCell("Method", 800), headerCell("Route", 2400), headerCell("Auth Header", 2000), headerCell("Description", 4160)] }),
      new TableRow({ children: [cell("GET", 800, "#F0FDF4", true, C.green), cell("/clients", 2400), cell("X-Advisor-Id", 2000), cell("Client list with urgency scores", 4160)] }),
      new TableRow({ children: [cell("POST", 800, "#EFF6FF", true, C.blue), cell("/clients", 2400), cell("X-Advisor-Id", 2000), cell("Create client", 4160)] }),
      new TableRow({ children: [cell("GET", 800, "#F0FDF4", true, C.green), cell("/clients/{id}", 2400), cell("X-Advisor-Id", 2000), cell("Client 360 — profile + portfolio + goals + events", 4160)] }),
      new TableRow({ children: [cell("POST", 800, "#EFF6FF", true, C.blue), cell("/clients/{id}/portfolio", 2400), cell("X-Advisor-Id", 2000), cell("Full-replace portfolio + holdings", 4160)] }),
      new TableRow({ children: [cell("GET", 800, "#F0FDF4", true, C.green), cell("/personal/portfolio", 2400), cell("X-Personal-User-Id", 2000), cell("Personal user's own portfolio", 4160)] }),
      new TableRow({ children: [cell("POST", 800, "#EFF6FF", true, C.blue), cell("/personal/portfolio", 2400), cell("X-Personal-User-Id", 2000), cell("Save/replace personal portfolio", 4160)] }),
    ]
  }),
  space(),
  h2("3.3 Trade Management"),
  new Table({
    columnWidths: [800, 3200, 2000, 3360],
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    rows: [
      new TableRow({ tableHeader: true, children: [headerCell("Method", 800), headerCell("Route", 3200), headerCell("Actor", 2000), headerCell("Description", 3360)] }),
      new TableRow({ children: [cell("POST", 800, "#EFF6FF", true, C.blue), cell("/clients/{id}/trades", 3200), cell("Advisor", 2000), cell("Create draft trade", 3360)] }),
      new TableRow({ children: [cell("PUT", 800, "#FFF7ED", true, "#B45309"), cell("/trades/{id}", 3200), cell("Advisor", 2000), cell("Submit trade (draft→pending_approval)", 3360)] }),
      new TableRow({ children: [cell("PUT", 800, "#FFF7ED", true, "#B45309"), cell("/trades/{id}/approve", 3200), cell("Client", 2000), cell("Approve → auto-settle", 3360)] }),
      new TableRow({ children: [cell("PUT", 800, "#FFF7ED", true, "#B45309"), cell("/trades/{id}/reject", 3200), cell("Client", 2000), cell("Reject trade", 3360)] }),
      new TableRow({ children: [cell("PUT", 800, "#FFF7ED", true, "#B45309"), cell("/trades/{id}/tx-hash", 3200), cell("Client", 2000), cell("Submit crypto tx hash post-approval", 3360)] }),
      new TableRow({ children: [cell("GET", 800, "#F0FDF4", true, C.green), cell("/clients/{id}/trades", 3200), cell("Advisor", 2000), cell("List all trades for client", 3360)] }),
      new TableRow({ children: [cell("GET", 800, "#F0FDF4", true, C.green), cell("/personal/clients/me/trades", 3200), cell("Client", 2000), cell("Client's own pending trades", 3360)] }),
    ]
  }),
  space(),
  h2("3.4 Asset SDK Endpoints"),
  new Table({
    columnWidths: [800, 3000, 2000, 3560],
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    rows: [
      new TableRow({ tableHeader: true, children: [headerCell("Method", 800), headerCell("Route", 3000), headerCell("Auth Header", 2000), headerCell("Description", 3560)] }),
      new TableRow({ children: [cell("POST", 800, "#EFF6FF", true, C.blue), cell("/asset-sdk/connect", 3000), cell("Advisor or Personal", 2000), cell("Connect provider account, stores in asset_accounts", 3560)] }),
      new TableRow({ children: [cell("GET", 800, "#F0FDF4", true, C.green), cell("/asset-sdk/accounts", 3000), cell("Advisor or Personal", 2000), cell("List connected accounts for current user", 3560)] }),
      new TableRow({ children: [cell("GET", 800, "#F0FDF4", true, C.green), cell("/asset-sdk/holdings/{account_id}", 3000), cell("Advisor or Personal", 2000), cell("Fetch live holdings from SDK provider", 3560)] }),
      new TableRow({ children: [cell("POST", 800, "#EFF6FF", true, C.blue), cell("/asset-sdk/holdings/{account_id}/sync", 3000), cell("Advisor or Personal", 2000), cell("Pull SDK holdings → upsert into portfolio", 3560)] }),
      new TableRow({ children: [cell("POST", 800, "#EFF6FF", true, C.blue), cell("/asset-sdk/transactions", 3000), cell("Advisor or Personal", 2000), cell("Execute buy/sell/transfer via SDK", 3560)] }),
      new TableRow({ children: [cell("GET", 800, "#F0FDF4", true, C.green), cell("/asset-sdk/transactions/{account_id}", 3000), cell("Advisor or Personal", 2000), cell("Transaction history from SDK", 3560)] }),
      new TableRow({ children: [cell("POST", 800, "#EFF6FF", true, C.blue), cell("/asset-sdk/webhook", 3000), cell("Advisor or Personal", 2000), cell("Simulate provider webhook event", 3560)] }),
      new TableRow({ children: [cell("DELETE", 800, "#FFF1F2", true, C.red), cell("/asset-sdk/accounts/{id}", 3000), cell("Advisor or Personal", 2000), cell("Soft-disconnect (sets disconnected_at)", 3560)] }),
    ]
  }),
  pageBreak(),
];

// 4. TRADE FLOW
const tradeFlow = [
  h1("4. Trade Management Flow"),
  h2("4.1 Trade State Machine"),
  body("Every trade moves through a defined set of states. The system writes a TradeAuditLog entry at every transition, recording the actor and timestamp."),
  space(),
  new Table({
    columnWidths: [2400, 400, 2400, 4160],
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    rows: [
      new TableRow({ tableHeader: true, children: [headerCell("From", 2400), headerCell("", 400), headerCell("To", 2400), headerCell("Trigger + Actor", 4160)] }),
      new TableRow({ children: [cell("—", 2400), cell("→", 400, C.white, false, C.accent, true), cell("draft", 2400, C.lightGray), cell("POST /clients/{id}/trades — Advisor", 4160)] }),
      new TableRow({ children: [cell("draft", 2400), cell("→", 400, C.white, false, C.accent, true), cell("pending_approval", 2400, C.lightAmber), cell("PUT /trades/{id} (submit) — Advisor", 4160)] }),
      new TableRow({ children: [cell("pending_approval", 2400), cell("→", 400, C.white, false, C.accent, true), cell("approved → settled", 2400, C.lightGreen), cell("PUT /trades/{id}/approve — Client (auto-settles)", 4160)] }),
      new TableRow({ children: [cell("pending_approval", 2400), cell("→", 400, C.white, false, C.accent, true), cell("rejected", 2400, C.lightRed), cell("PUT /trades/{id}/reject — Client", 4160)] }),
      new TableRow({ children: [cell("approved (crypto)", 2400), cell("→", 400, C.white, false, C.accent, true), cell("executed", 2400, C.lightBlue), cell("PUT /trades/{id}/tx-hash — Client", 4160)] }),
    ]
  }),
  space(),
  h2("4.2 Notification Hooks"),
  body("Every state transition fires a notification to the opposite party. Notifications are stored in the notifications table and polled every 60 seconds by both frontends."),
  new Table({
    columnWidths: [2800, 2000, 4560],
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    rows: [
      new TableRow({ tableHeader: true, children: [headerCell("Event", 2800), headerCell("Recipient", 2000), headerCell("Message", 4560)] }),
      new TableRow({ children: [cell("Trade submitted", 2800), cell("Client", 2000), cell("Advisor submitted a {buy/sell} order for {asset_code}", 4560)] }),
      new TableRow({ children: [cell("Trade approved", 2800), cell("Advisor", 2000), cell("Client approved the {buy/sell} order for {asset_code}", 4560)] }),
      new TableRow({ children: [cell("Trade rejected", 2800), cell("Advisor", 2000), cell("Client rejected the {buy/sell} order for {asset_code}", 4560)] }),
    ]
  }),
  space(),
  h2("4.3 Crypto Trade Journey (5 Steps)"),
  bullet("Advisor creates trade with asset_type=crypto, asset_code=BTC, quantity, estimated_value", "b3"),
  bullet("Advisor submits trade → status: pending_approval → client notification sent", "b3"),
  bullet("Client reviews in ARIA Personal pending trades tab, approves → status: approved", "b3"),
  bullet("Client manually executes on external wallet (Coinbase/Kraken/MetaMask)", "b3"),
  bullet("Client submits tx_hash via PUT /trades/{id}/tx-hash → status: executed", "b3"),
  pageBreak(),
];

// 5. UNIFIED ASSET SDK
const assetSDK = [
  h1("5. Unified Asset SDK"),
  h2("5.1 Design Rationale"),
  body("The SDK sits between the FastAPI backend and external asset providers (broker APIs, demat, wallets). All ARIA code calls AssetProvider interface methods. Swapping mock → real SDK requires changing only registry.py — no changes to routers, models, or business logic."),
  space(),
  h2("5.2 Package Structure"),
  new Table({
    columnWidths: [3000, 6360],
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    rows: [
      new TableRow({ tableHeader: true, children: [headerCell("File", 3000), headerCell("Purpose", 6360)] }),
      new TableRow({ children: [cell("base.py", 3000, C.lightGray, true), cell("Abstract AssetProvider with 7 interface methods", 6360)] }),
      new TableRow({ children: [cell("models.py", 3000, C.lightGray, true), cell("Dataclasses: AssetAccount, AssetHolding, AssetTransaction, WebhookEvent, ConnectionResult", 6360)] }),
      new TableRow({ children: [cell("exceptions.py", 3000, C.lightGray, true), cell("SDKError, AuthError, ConnectionError, TransactionError, SimulatedNetworkError", 6360)] }),
      new TableRow({ children: [cell("mock_provider.py", 3000, C.lightGray, true), cell("MockUnifiedProvider — deterministic fake data for all 6 asset types", 6360)] }),
      new TableRow({ children: [cell("registry.py", 3000, C.lightGray, true), cell("get_provider() — single import swap point for real providers", 6360)] }),
    ]
  }),
  space(),
  h2("5.3 Provider Interface"),
  new Table({
    columnWidths: [2800, 2200, 4360],
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    rows: [
      new TableRow({ tableHeader: true, children: [headerCell("Method", 2800), headerCell("Returns", 2200), headerCell("Description", 4360)] }),
      new TableRow({ children: [cell("connect(credentials)", 2800), cell("ConnectionResult", 2200), cell("Auth + connect to provider", 4360)] }),
      new TableRow({ children: [cell("get_accounts()", 2800), cell("List[AssetAccount]", 2200), cell("List all linked accounts", 4360)] }),
      new TableRow({ children: [cell("get_holdings(account_id)", 2800), cell("List[AssetHolding]", 2200), cell("Fetch current holdings", 4360)] }),
      new TableRow({ children: [cell("execute_transaction(request)", 2800), cell("AssetTransaction", 2200), cell("Submit buy/sell/transfer", 4360)] }),
      new TableRow({ children: [cell("get_transaction_history(account_id)", 2800), cell("List[AssetTransaction]", 2200), cell("Past transactions", 4360)] }),
      new TableRow({ children: [cell("emit_webhook(event_type, account_id)", 2800), cell("WebhookEvent", 2200), cell("Simulate provider event", 4360)] }),
      new TableRow({ children: [cell("disconnect()", 2800), cell("None", 2200), cell("Close connection", 4360)] }),
    ]
  }),
  space(),
  h2("5.4 Asset Types"),
  body("MockUnifiedProvider has seeded data for all 6 types: crypto (BTC, ETH, SOL), stock (RELIANCE, TCS, HDFC, INFY), mutual_fund (3 INF-coded funds), bond (GOI + PSU), commodity (Gold, Silver), forex (USD/INR, EUR/INR). Prices are deterministic per account_id seed — same call always returns the same data."),
  space(),
  h2("5.5 Simulation Controls"),
  new Table({
    columnWidths: [2000, 2000, 5360],
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    rows: [
      new TableRow({ tableHeader: true, children: [headerCell("Parameter", 2000), headerCell("Type / Range", 2000), headerCell("Effect", 5360)] }),
      new TableRow({ children: [cell("latency_ms", 2000), cell("int (ms)", 2000), cell("Simulates network delay. time.sleep(latency_ms / 1000)", 5360)] }),
      new TableRow({ children: [cell("failure_rate", 2000), cell("float 0.0–1.0", 2000), cell("Probability of raising SimulatedNetworkError per call", 5360)] }),
      new TableRow({ children: [cell("scenario=normal", 2000), cell("default", 2000), cell("Standard market prices with ±2% jitter", 5360)] }),
      new TableRow({ children: [cell("scenario=market_crash", 2000), cell("str", 2000), cell("All prices × 0.65 (35% drop). Webhooks show change_pct: -35", 5360)] }),
      new TableRow({ children: [cell("scenario=network_timeout", 2000), cell("str", 2000), cell("Always raises SimulatedNetworkError on every call", 5360)] }),
    ]
  }),
  pageBreak(),
];

// 6. TEST RESULTS
const testResults = [
  h1("6. Test Results"),
  h2("6.1 Unified Asset SDK — Automated (22/22 Pass)"),
  body("Run command: cd asset-sdk && python3 -m pytest tests/ -v"),
  body("Date: 2026-04-03  •  Platform: macOS 25.4.0  •  Python 3.9.6  •  pytest 8.4.2"),
  space(),
  new Table({
    columnWidths: [4560, 1400, 1200, 2200],
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    rows: [
      new TableRow({ tableHeader: true, children: [headerCell("Test Name", 4560), headerCell("Category", 1400), headerCell("Duration", 1200), headerCell("Result", 2200)] }),
      ...[
        ["test_connect_success", "connect", "0.002s", "pass"],
        ["test_connect_invalid_key_raises", "connect", "0.001s", "pass"],
        ["test_connect_missing_key_raises", "connect", "0.001s", "pass"],
        ["test_get_accounts_returns_all_asset_types", "accounts", "0.001s", "pass"],
        ["test_get_holdings_asset_types[MOCK-CRYPTO-001-crypto]", "holdings", "0.002s", "pass"],
        ["test_get_holdings_asset_types[MOCK-STOCK-001-stock]", "holdings", "0.001s", "pass"],
        ["test_get_holdings_asset_types[MOCK-MUTUAL_FUND-001-mutual_fund]", "holdings", "0.001s", "pass"],
        ["test_get_holdings_asset_types[MOCK-BOND-001-bond]", "holdings", "0.001s", "pass"],
        ["test_get_holdings_asset_types[MOCK-COMMODITY-001-commodity]", "holdings", "0.001s", "pass"],
        ["test_get_holdings_asset_types[MOCK-FOREX-001-forex]", "holdings", "0.001s", "pass"],
        ["test_get_holdings_deterministic", "holdings", "0.001s", "pass"],
        ["test_get_holdings_market_crash_scenario", "holdings", "0.002s", "pass"],
        ["test_execute_transaction_success", "transactions", "0.001s", "pass"],
        ["test_execute_crypto_transaction_has_tx_hash", "transactions", "0.001s", "pass"],
        ["test_execute_transaction_zero_quantity_raises", "transactions", "0.001s", "pass"],
        ["test_get_transaction_history_returns_records", "transactions", "0.001s", "pass"],
        ["test_emit_webhook_price_update", "webhooks", "0.001s", "pass"],
        ["test_emit_webhook_transaction_confirmed", "webhooks", "0.001s", "pass"],
        ["test_network_timeout_scenario_raises", "failure sim", "0.001s", "pass"],
        ["test_failure_rate_1_always_raises", "failure sim", "0.001s", "pass"],
        ["test_failure_rate_0_never_raises", "failure sim", "0.001s", "pass"],
        ["test_disconnect", "lifecycle", "0.001s", "pass"],
      ].map(([name, cat, dur, status]) => new TableRow({ children: [cell(name, 4560), cell(cat, 1400, C.lightGray), cell(dur, 1200, C.white, false, C.gray, true), statusCell("✓ PASS", 2200, status)] }))
    ]
  }),
  new Paragraph({ spacing: { before: 100, after: 80 }, children: [
    new TextRun({ text: "Total: 22 passed, 0 failed  •  Duration: 0.03s", bold: true, size: 22, font: "Arial", color: C.green })
  ]}),
  space(),
  h2("6.2 Manual Feature Tests — Advisor Workbench"),
  new Table({
    columnWidths: [1000, 1400, 3560, 3400],
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    rows: [
      new TableRow({ tableHeader: true, children: [headerCell("Test ID", 1000), headerCell("Feature", 1400), headerCell("Test Cases", 3560), headerCell("Result", 3400)] }),
      new TableRow({ children: [cell("TEST-001", 1000), cell("Client Book", 1400), cell("Load 20 clients, urgency rank, search by name, search by segment", 3560), statusCell("✓ All Pass", 3400, "pass")] }),
      new TableRow({ children: [cell("TEST-002", 1000), cell("Client 360", 1400), cell("Profile, holdings table, donut chart, goals probability, life events", 3560), statusCell("✓ All Pass", 3400, "pass")] }),
      new TableRow({ children: [cell("TEST-003", 1000), cell("AI Situation", 1400), cell("Auto-load summary, client context accuracy, disclaimer present", 3560), statusCell("✓ All Pass", 3400, "pass")] }),
      new TableRow({ children: [cell("TEST-004", 1000), cell("AI Copilot", 1400), cell("Suggested prompts, multi-turn, audit log written", 3560), statusCell("✓ All Pass", 3400, "pass")] }),
      new TableRow({ children: [cell("TEST-005", 1000), cell("Morning Brief", 1400), cell("Top 8 clients flagged, AI narration, urgency consistency", 3560), statusCell("✓ All Pass", 3400, "pass")] }),
      new TableRow({ children: [cell("TEST-006", 1000), cell("Monte Carlo", 1400), cell("Goal projection endpoint, sliders render, live recalc", 3560), statusCell("⚠ Partial", 3400, "partial")] }),
      new TableRow({ children: [cell("TEST-007", 1000), cell("Notifications", 1400), cell("Bell UI, badge, dropdown, polling, mark-read, navigate", 3560), statusCell("✓ All Pass", 3400, "pass")] }),
    ]
  }),
  space(),
  h2("6.3 Manual Feature Tests — ARIA Personal"),
  new Table({
    columnWidths: [1000, 1600, 3360, 3400],
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    rows: [
      new TableRow({ tableHeader: true, children: [headerCell("Test ID", 1000), headerCell("Feature", 1600), headerCell("Test Cases", 3360), headerCell("Result", 3400)] }),
      new TableRow({ children: [cell("P-AUTH", 1000), cell("Auth", 1600), cell("Register, login, logout, session persist, invalid password", 3360), statusCell("✓ All Pass", 3400, "pass")] }),
      new TableRow({ children: [cell("P-DASH", 1000), cell("Dashboard", 1600), cell("Hero, portfolio donut, goals, holdings list, allocation bars", 3360), statusCell("✓ All Pass", 3400, "pass")] }),
      new TableRow({ children: [cell("P-GOALS", 1000), cell("Goals", 1600), cell("Create, edit, delete, probability pill, what-if sliders", 3360), statusCell("✓ All Pass", 3400, "pass")] }),
      new TableRow({ children: [cell("P-LIFE", 1000), cell("Life Events", 1600), cell("Add, edit, delete events", 3360), statusCell("✓ All Pass", 3400, "pass")] }),
      new TableRow({ children: [cell("P-COPILOT", 1000), cell("Ask ARIA", 1600), cell("Send message, history, loading state, error handling", 3360), statusCell("✓ All Pass", 3400, "pass")] }),
      new TableRow({ children: [cell("P-TRADES", 1000), cell("Pending Trades", 1600), cell("View pending, approve, reject, notification on action", 3360), statusCell("✓ All Pass", 3400, "pass")] }),
    ]
  }),
  space(),
  h2("6.4 E2E Regression (Playwright)"),
  body("E2E test suite runs against production. Coverage: 95% pass rate as of Session 15 (2026-03-27). 1 known gap: Joshua portfolio linking (personal_user_id not linked — data issue, not code bug). All new tests follow [TEST] prefix + [E2E] notes convention for cleanup automation."),
  new Table({
    columnWidths: [3000, 2000, 4360],
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    rows: [
      new TableRow({ tableHeader: true, children: [headerCell("Test Suite", 3000), headerCell("Pass Rate", 2000), headerCell("Notes", 4360)] }),
      new TableRow({ children: [cell("Advisor auth + client book", 3000), statusCell("✓ 100%", 2000, "pass"), cell("Login, session, client list, search", 4360)] }),
      new TableRow({ children: [cell("Client 360 + portfolio", 3000), statusCell("✓ 100%", 2000, "pass"), cell("Load, all tabs, charts", 4360)] }),
      new TableRow({ children: [cell("Trade workflow (E2E)", 3000), statusCell("✓ 100%", 2000, "pass"), cell("Create → submit → approve → settle", 4360)] }),
      new TableRow({ children: [cell("Personal auth + dashboard", 3000), statusCell("✓ 100%", 2000, "pass"), cell("Register, login, portfolio view", 4360)] }),
      new TableRow({ children: [cell("Joshua portfolio linking", 3000), statusCell("⚠ Known gap", 3000, "partial"), cell("personal_user_id not linked — data issue", 4360)] }),
    ]
  }),
  pageBreak(),
];

// 7. KNOWN ISSUES & BUGS
const knownIssues = [
  h1("7. Known Issues & Decisions"),
  h2("7.1 Production Incidents"),
  new Table({
    columnWidths: [1400, 1800, 3000, 3160],
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    rows: [
      new TableRow({ tableHeader: true, children: [headerCell("Date", 1400), headerCell("Severity", 1800), headerCell("Root Cause", 3000), headerCell("Fix", 3160)] }),
      new TableRow({ children: [cell("2026-03-21", 1400), cell("P0 — Outage", 1800, C.lightRed, true, C.red), cell("Render upgraded Python 3.11→3.14; .is_(True) filter broke", 3000), cell("runtime.txt pinned to 3.11.9; .is_(True) enforced", 3160)] }),
      new TableRow({ children: [cell("2026-03-21", 1400), cell("P1 — 500", 1800, C.lightAmber, true, C.amber), cell("String order_by on relationship → AttributeError in 3.14", 3000), cell("Removed all string order_by; sort at query layer", 3160)] }),
      new TableRow({ children: [cell("2026-03-21", 1400), cell("P1 — 500", 1800, C.lightAmber, true, C.amber), cell("personal_user_id in DB not mapped in ORM → AttributeError", 3000), cell("Added Column() declaration to ORM model", 3160)] }),
      new TableRow({ children: [cell("2026-03-21", 1400), cell("P1 — CORS", 1800, C.lightAmber, true, C.amber), cell("FRONTEND_URL env var missing on Render → CORS blocked", 3000), cell("Hardcoded Vercel origins in CORS middleware", 3160)] }),
      new TableRow({ children: [cell("2026-03-28", 1400), cell("P2 — Logic", 1800, C.lightGray), cell("ActionEnum.buy serialized as 'ActionEnum.buy' not 'buy' in messages", 3000), cell("trade.action.value used in all notification messages", 3160)] }),
    ]
  }),
  space(),
  h2("7.2 Architectural Decisions (Locked)"),
  new Table({
    columnWidths: [3000, 3000, 3360],
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    rows: [
      new TableRow({ tableHeader: true, children: [headerCell("Decision", 3000), headerCell("Chosen Approach", 3000), headerCell("Rationale", 3360)] }),
      new TableRow({ children: [cell("Crypto holdings Phase 1", 3000), cell("External wallet only (no ARIA holdings)", 3000), cell("Avoid liability. Client executes on Coinbase/MetaMask manually.", 3360)] }),
      new TableRow({ children: [cell("Banking Phase 1", 3000), cell("Mock debit/credit on approval", 3000), cell("Razorpay/Smallcase integration is Phase 2", 3360)] }),
      new TableRow({ children: [cell("Cross-model FK (models ↔ personal_models)", 3000), cell("No ORM FK. Manual ID joins only.", 3000), cell("SQLAlchemy cross-file FK is fragile — use query joins", 3360)] }),
      new TableRow({ children: [cell("Asset SDK architecture", 3000), cell("Provider pattern, bundled copy in backend/app/", 3000), cell("Render can't install from ../asset-sdk path. Copy is deploy-safe.", 3360)] }),
    ]
  }),
  space(),
  h2("7.3 Backlog (Parked)"),
  bullet("BUG-001: Frontend bundle performance (large JS bundle, no code splitting)", "b4"),
  bullet("Email invites: advisor sends ARIA Personal link via Resend/SendGrid", "b4"),
  bullet("Superadmin view: advisor→client tree, unassigned clients, assignment UI", "b4"),
  bullet("Real banking: Razorpay debit/credit integration (Phase 2)", "b4"),
  bullet("FEAT-503: Live goal probability recalculation (debounced sliders)", "b4"),
  bullet("Joshua portfolio linking: personal_user_id not linked on his client row (data fix needed)", "b4"),
  bullet("Sale trade: show only holdings in portfolio as sell candidates (frontend filter + backend validation)", "b4"),
  pageBreak(),
];

// 8. DEPLOYMENT
const deployment = [
  h1("8. Deployment"),
  h2("8.1 Environments"),
  new Table({
    columnWidths: [2000, 2400, 2000, 2960],
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    rows: [
      new TableRow({ tableHeader: true, children: [headerCell("Component", 2000), headerCell("URL", 2400), headerCell("Platform", 2000), headerCell("Trigger", 2960)] }),
      new TableRow({ children: [cell("Advisor Frontend", 2000), cell("aria-advisor.vercel.app", 2400), cell("Vercel", 2000), cell("Auto on push to main", 2960)] }),
      new TableRow({ children: [cell("Personal Frontend", 2000), cell("aria-personal.vercel.app", 2400), cell("Vercel", 2000), cell("Auto on push to main", 2960)] }),
      new TableRow({ children: [cell("Backend API", 2000), cell("aria-advisor.onrender.com", 2400), cell("Render (Nixpacks)", 2000), cell("Auto on push to main", 2960)] }),
      new TableRow({ children: [cell("Database", 2000), cell("Supabase (pooler :6543)", 2400), cell("Supabase", 2000), cell("Persistent (no deploys)", 2960)] }),
    ]
  }),
  space(),
  h2("8.2 Post-Deploy Checklist"),
  bullet("curl POST /health → {status: ok}", "b5"),
  bullet("curl POST /advisor/login with rm_demo/aria2026 → JWT returned", "b5"),
  bullet("curl GET /clients with X-Advisor-Id header → client list returned", "b5"),
  bullet("Check CORS header present: access-control-allow-origin in response", "b5"),
  bullet("Check Vercel alias is still pointing to latest deployment: vercel alias ls", "b5"),
  space(),
  h2("8.3 Known Render Constraints"),
  bullet("Python version MUST be pinned in backend/runtime.txt (currently python-3.11.9)", "b6"),
  bullet("Free tier: ~30s cold start. Health check timeout set to 30s in railway.toml", "b6"),
  bullet("Supabase connection pool: max 20. pool_size=5, max_overflow=10 in engine config", "b6"),
  bullet("Asset SDK bundled at backend/app/aria_asset_sdk/ — not installed via pip", "b6"),
];

// ── Document ─────────────────────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal",
        run: { size: 56, bold: true, color: C.dark, font: "Arial" },
        paragraph: { spacing: { before: 240, after: 120 }, alignment: AlignmentType.CENTER } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, color: C.dark, font: "Arial" },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, color: C.mid, font: "Arial" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: C.accent, font: "Arial" },
        paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "b1", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
      { reference: "b2", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
      { reference: "b3", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
      { reference: "b4", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
      { reference: "b5", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
      { reference: "b6", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
    ]
  },
  sections: [{
    properties: {
      page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } }
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: "ARIA — Technical Design Document  |  Confidential", size: 18, font: "Arial", color: C.gray })]
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({ text: "Page ", size: 18, font: "Arial", color: C.gray }),
          new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Arial", color: C.gray }),
          new TextRun({ text: " of ", size: 18, font: "Arial", color: C.gray }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, font: "Arial", color: C.gray }),
        ]
      })] })
    },
    children: [
      ...coverPage,
      // TOC
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Table of Contents")] }),
      new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
      pageBreak(),
      ...systemOverview,
      ...architecture,
      ...apiReference,
      ...tradeFlow,
      ...assetSDK,
      ...testResults,
      ...knownIssues,
      ...deployment,
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("ARIA_Technical_Design_Document.docx", buffer);
  console.log("Done: ARIA_Technical_Design_Document.docx");
});
