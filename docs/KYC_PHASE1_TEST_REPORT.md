# KYC Phase 1 — Test Report
**Date:** 2026-04-19
**Environment:** Production (aria-advisor.onrender.com + aria-advisor.vercel.app)
**Test client:** id=1 (Priya Sharma)

---

## Test Results — 11/11 PASS

| ID | Test | Result | Detail |
|----|------|--------|--------|
| T1 | `kyc_status` field in `GET /clients` list | PASS | value=in_progress |
| T2 | All KYC fields in `GET /clients/{id}` | PASS | kyc_status, nominee_name, fatca_declaration, fatca_declared_at all present |
| T3 | `PATCH /kyc/status` → 200 | PASS | status=200 |
| T4 | `kyc_status` persists in subsequent GET | PASS | kyc_status=in_progress |
| T5 | `PATCH /kyc/nominee` → 200 | PASS | status=200 |
| T6 | `nominee_name` persists in subsequent GET | PASS | nominee=Test Nominee |
| T7 | `PATCH /kyc/fatca` → 200 | PASS | status=200 |
| T8 | `fatca_declaration` + `fatca_declared_at` persist | PASS | declared=True, timestamp=2026-04-19T02:53:44 |
| T9 | `GET /kyc/documents` reachable | PASS | status=200 (no bucket yet — upload will 503) |
| T10 | `GET /kyc/risk-pdf` → valid PDF bytes | PASS | status=200, 1917 bytes, %PDF header confirmed |
| T11 | Invalid `kyc_status` value rejected | PASS | status=400 |

---

## Bugs Found & Fixed During Testing

| Bug | Root Cause | Fix | Commit |
|-----|-----------|-----|--------|
| GET /clients/{id} always returned `not_started` | 4 `Client360()` constructors in `clients.py` omitted KYC fields | Added `_kyc_fields(client)` helper, injected via `**_kyc_fields(client)` | 743fff0 |
| `GET /kyc/risk-pdf` → 500 (`pdf.rotate()`) | `FPDF.rotate()` removed in newer fpdf2 on Render | Replaced with `with pdf.rotation(45, 55, 190):` context manager | 743fff0 |
| `GET /kyc/risk-pdf` → 500 (em-dash) | `"—"` character unsupported in Helvetica (Latin-1 only) | Replaced all `"—"` with `"N/A"` in field fallbacks and header title | 7489286 + follow-up |

---

## Not Tested (Requires Supabase bucket setup)
- `POST /kyc/documents` — upload (returns 503 until `aria-kyc-docs` bucket created + env vars set)
- `DELETE /kyc/documents/{id}` — delete document
- KYC auto-advance: `not_started` → `in_progress` → `submitted`
- Signed URL generation on document list

---

## Pending Manual Steps
1. Create `aria-kyc-docs` bucket in Supabase dashboard (private)
2. Add `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` to Render env vars → redeploy
