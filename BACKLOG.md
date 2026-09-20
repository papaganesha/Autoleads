# AutoLeads Product Backlog

Last updated: 2026-09-19

## Current Status

- **In Progress**: None
- **Backlog**: P0 bugs, P1 cleanup, P2 docs
- **Done**: MVP core feature loop (search, leads CRUD, scoring, copy generation, WhatsApp links)

---

## P0 — Blocking Bugs (Fix Immediately)

These prevent the core pipeline from working correctly and must be fixed before any feature work.

### `lead_status_history` column name mismatch
- **Issue**: The table is defined with `changed_at TIMESTAMPTZ`, but both `leadsController.js:85` and the dead duplicate route in `routes/leads.js:39` query `.order('created_at', { ascending: false })`. This silently fails (Supabase client discards the error), so `GET /api/leads/:id` always returns an empty `status_history` array.
- **Impact**: Users cannot see the audit trail of status changes (new → contacted → interested/converted).
- **Acceptance Criteria**:
  - Manual test: Update a lead's status via `PATCH /api/leads/:id/status`, then fetch the lead via `GET /api/leads/:id` and confirm `status_history` array contains the transition with a timestamp
  - Commit includes the fix (either rename column via migration, or fix the query to use `changed_at`)
  - No regressions: other lead routes still return data
- **Files to check**: `backend/src/controllers/leadsController.js`, `supabase/migrations/001_initial_schema.sql`

### `searches.category` and `searches.location` NOT NULL constraint violation
- **Issue**: The schema (line 6-7 of `001_initial_schema.sql`) defines both as `NOT NULL`, but `routes/search.js:55-56` inserts `location || null` and `category || null`. A POST request missing either field will hit a DB constraint error (500). Likely root cause (or remaining piece) of the earlier "Fix POST /api/search 500 error" commit.
- **Impact**: Searches are rejected with a generic 500 instead of a user-friendly 400 Bad Request.
- **Acceptance Criteria**:
  - Manual test: POST `/api/search` with missing `location` field → returns 400 with message "location is required", not 500
  - Manual test: POST `/api/search` with missing `category` field → returns 400 with message "category is required"
  - Valid searches (with both fields) still succeed and return a search result
- **Fix options**:
  1. Add validation at route boundary: `if (!location || !category) return res.status(400).json(...)` before the insert
  2. OR: If `category`/`location` are legitimately optional, relax the NOT NULL constraint via migration
- **Files to check**: `backend/src/routes/search.js`, `supabase/migrations/001_initial_schema.sql`

---

## P1 — Tech Debt / Cleanup (Next Sprint)

These improve code quality and maintainability but don't block feature work.

### Dead duplicate route handlers in `routes/leads.js`
- **Issue**: Lines 16-241 of `backend/src/routes/leads.js` contain a complete second copy of all 5 route handler implementations (GET /:id, PATCH /:id/status, POST /:id/copy, POST /:id/select-copy, GET /:id/whatsapp). They're unreachable because Express matches the first registered route (lines 6-11 delegate correctly to `leadsController`), and the duplicate references undefined variables (`supabase`, `copyGenerator`, `generateWhatsAppLink`) that aren't imported in the file.
- **Impact**: Confusing code, potential source of future bugs if someone modifies the dead copy instead of the live one.
- **Acceptance Criteria**:
  - Delete lines 16-241 entirely (the second `module.exports = router;` at line 241 also gets removed)
  - All 5 route handlers still work (manual test: GET/PATCH/POST requests to `/api/leads/:id/*` return expected responses)
  - No new imports/unused variables
- **Files to modify**: `backend/src/routes/leads.js`

### Schema redundancy: `place_id` vs `google_place_id`
- **Issue**: The `leads` table has both `place_id` (UNIQUE, used as the upsert conflict target in insert logic) and `google_place_id` (indexed separately). Confirm with the Google Places integration whether both are needed, or if they're duplicates.
- **Impact**: Confusing schema, wasted storage, potential for sync bugs if one falls out of date.
- **Acceptance Criteria**:
  - Inspect `backend/src/services/googleMaps.js` and search/lead insertion logic to confirm which field is actually used
  - Document the finding in a code comment or this backlog item
  - If redundant: decide which to keep and migrate data/constraints (requires a Supabase migration)
- **Files to check**: `backend/src/services/googleMaps.js`, `backend/src/routes/search.js` (insert logic), `supabase/migrations/001_initial_schema.sql`

### No automated tests or CI
- **Issue**: No test runner (Jest, Mocha, etc.) in `backend/` or `frontend/`. No `.github/workflows` for CI.
- **Impact**: Manual testing only; risk of regressions; hard to onboard new developers.
- **Acceptance Criteria**:
  - Add a minimal test harness: `npm test` runs (at minimum) a smoke test that:
    - POST `/api/search` with valid inputs returns 200 with a `search_id`
    - GET `/api/search/:id` returns the search status
    - GET `/api/leads` returns a paginated list (even if empty)
  - No need for 100% coverage yet; goal is to catch obvious breakage
  - Tests run locally with `npm test` in `backend/` directory
- **Nice-to-have**: GitHub Actions workflow (`.github/workflows/test.yml`) that runs tests on every push
- **Files to create**: `backend/tests/` or `backend/__tests__/`, `backend/package.json` scripts updated with `"test"` entry

---

## P2 — Polish & Documentation (Backlog)

Do these once the MVP is stable and bugs are fixed.

### README for backend and frontend
- **Issue**: No README.md in either `backend/` or `frontend/` directory explaining local setup, env vars, how to run in dev/prod.
- **Impact**: Onboarding friction for new developers or teammates.
- **Acceptance Criteria**:
  - `backend/README.md`: env vars required (Supabase, Google Maps key, Gemini key, etc.), `npm run dev` / `npm start`, how to run tests
  - `frontend/README.md`: env vars (VITE_API_URL, VITE_GOOGLE_MAPS_KEY), `npm run dev` / `npm build`, how to preview production build
  - Both include any recent schema/validation changes from P0 fixes (e.g. required `category` + `location` fields)

---

## Icebox — Future Features (Not Yet Scoped)

Parking lot for ideas validated during user interviews or future sprints. Each is a one-liner pending backlog grooming.

- Automated daily search re-runs (poll for new leads in saved searches)
- CRM export (send leads to Salesforce, HubSpot, Pipedrive)
- Multi-user auth & team accounts (currently single-user only)
- Advanced filtering (by score, by date, by contact status)
- Bulk WhatsApp send (contact multiple leads in one batch)
- Analytics dashboard (search volume, conversion rate, ROI by lead source)
- Dark mode for frontend
- Mobile app (React Native or PWA)
- Lead deduplication (same business found across multiple searches)
- Integration with lead scoring ML model (replace rule-based scoring)

---

## Done ✓

### MVP Core Feature Loop
- [x] Search: POST `/api/search` → Google Places text search + autocomplete
- [x] Enrichment: Instagram scrape, competitor lookup, Gemini copy generation
- [x] Leads CRUD: GET/PATCH leads, list with filters, pagination
- [x] Scoring: Rule-based temperature (hot/warm/cold) calculation
- [x] Copy variants: Generate 4 types (pain_point, social_proof, urgency, value)
- [x] WhatsApp integration: Generate deep link with copy text
- [x] Status tracking: Leads status workflow (new → contacted → interested/not_interested → converted/archived)
- [x] Frontend UI: Search form, dashboard with filters, lead detail view with score breakdown

---

## Notes for PO/Scrum Master

- **Definition of done**: For P0 bugs, manual test steps must be reproducible. For P1 cleanup, code review is required (even solo work — review your own changes before committing). For P2 docs, no test needed, just clarity.
- **Escalation path**: If a task unblocks more than one downstream item, mark it as higher priority.
- **Recurring grooming**: Before each new session, re-check recent git log to see what shipped and update BACKLOG.md status accordingly.
