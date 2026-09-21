# AutoLeads Product Backlog

**Last updated**: 2026-09-19 | **Owner**: João (PO/Scrum Master)

---

## Current Status

- **MVP shipped**: September 2026 with search, enrichment, real-time dashboard, Meus Leads global list
- **Blocker**: 2 P0 schema bugs blocking data integrity (see In Progress)
- **Next focus**: Fix bugs, add lead detail page, remove dead code, stabilize for user testing

---

## In Progress

### P0: Fix `lead_status_history` schema mismatch
**Priority**: Blocking | **Effort**: 1 day | **Owner**: TBD

**Problem**: Code queries `created_at` but column is `changed_at`. Returns empty history silently.

**Acceptance Criteria**:
- [ ] Rename column `changed_at` → `created_at` OR update queries to use `changed_at` (pick one consistently)
- [ ] Verify lead status history is visible when lead status changes (manual test)
- [ ] No data loss on existing rows
- [ ] PR with migration + code fix

**Status**: Not started

---

### P0: Fix `searches.category` and `searches.location` NOT NULL constraint violations
**Priority**: Blocking | **Effort**: 1 day | **Owner**: TBD

**Problem**: Schema defines `category` and `location` as NOT NULL, but POST /api/search route inserts null values when parsing incomplete requests. Causes constraint violation.

**Acceptance Criteria**:
- [ ] Validate `category` and `location` are non-empty before INSERT (backend validation)
- [ ] Return 400 Bad Request with clear error message if missing
- [ ] Frontend autocomplete pre-fills or disables search button until both selected
- [ ] Manual test: try submitting search without selecting both fields → expect 400, not 500
- [ ] PR with validation + error handling

**Status**: Not started

---

## Backlog (Prioritized)

### P1: Add lead detail page
**Priority**: High | **Effort**: 2 days | **Owner**: TBD

**Problem**: Users can see leads in table but can't drill into enrichment details (copy variants, competitors, scoring breakdown).

**Acceptance Criteria**:
- [ ] New route: /lead/:id (React page)
- [ ] Display:
  - Lead name, address, phone, website, Google Maps rating
  - Instagram handle, followers, bio (if scraped)
  - Competitors list (name, distance, rating)
  - Lead score breakdown (temperature, score components, date scored)
  - Copy variations (4 variants: pain_point, social_proof, urgency, value, selected)
  - Lead status history (if any)
- [ ] Backend: GET /api/leads/:id returns all enrichment data in one response
- [ ] UX: Link from table (click lead name → detail page)
- [ ] Manual test: click 3 different leads, verify all data displays correctly

**Definition of Done**: Deployed to Railway, tested in browser, link integrated in Dashboard + Meus Leads

---

### P1: Remove dead code from backend/src/routes/leads.js
**Priority**: Medium | **Effort**: 4 hours | **Owner**: TBD

**Problem**: Lines 16-241 appear to be duplicate/legacy routes that aren't called.

**Acceptance Criteria**:
- [ ] Audit routes: identify which are dead (unused endpoints)
- [ ] Check frontend codebase for any references to removed endpoints
- [ ] Delete dead routes + cleanup associated code
- [ ] Verify tests still pass (if any exist)
- [ ] PR with clear list of removed endpoints

**Definition of Done**: Code clean, no breaking changes, PR merged

---

### P1: Add basic error recovery for enrichment failures
**Priority**: Medium | **Effort**: 2 days | **Owner**: TBD

**Problem**: If Instagram scrape fails mid-pipeline, or Gemini API times out, lead is left partially enriched (no way to retry or know what failed).

**Acceptance Criteria**:
- [ ] Wrap each enrichment step (Instagram, scoring, copy gen) in try/catch
- [ ] If step fails: log error, store error_message in DB (e.g., instagram_data.error_message), mark lead.status = 'enrichment_failed'
- [ ] Return partial data (what succeeded) in search results + flag to user which fields are incomplete
- [ ] Add retry endpoint: PATCH /api/leads/:id/retry-enrichment (re-runs failed steps)
- [ ] Manual test: disable Gemini API key, run search, verify error is caught and logged, lead shows "copy generation failed"

**Definition of Done**: Error recovery tested, leads can be retried, no silent failures

---

### P1: Input validation on search queries
**Priority**: Medium | **Effort**: 1 day | **Owner**: TBD

**Problem**: No backend validation on category/location; frontend autocomplete helps but doesn't prevent manual tampering.

**Acceptance Criteria**:
- [ ] Backend: validate category is from allowed list (e.g., enum list from Google Maps or hardcoded)
- [ ] Backend: validate location is a valid geographic query (not empty, reasonable length)
- [ ] Return 400 Bad Request with specific error if invalid
- [ ] Frontend: show inline error if autocomplete selection is lost

**Definition of Done**: Validation logic added, tested with curl/Postman

---

### P2: Export leads to CSV
**Priority**: Medium | **Effort**: 1 day | **Owner**: TBD

**Problem**: Users can't bulk-export leads for CRM or email outreach; have to copy-paste from table.

**Acceptance Criteria**:
- [ ] Button on Dashboard & Meus Leads: "Export to CSV"
- [ ] CSV includes: name, address, phone, website, Instagram handle, followers, score, temperature, competitors_count
- [ ] Respects current filters (temperature, search_id if applicable)
- [ ] Returns file download: leads-<timestamp>.csv
- [ ] Manual test: export 10 leads, open in Excel, verify data integrity

**Definition of Done**: Tested in browser, file downloads, imports cleanly to Excel

---

### P2: Advanced filters on Meus Leads
**Priority**: Medium | **Effort**: 1.5 days | **Owner**: TBD

**Problem**: Only temperature filter available; users want to slice by score range, location, category, date created.

**Acceptance Criteria**:
- [ ] Add filter UI: score range (min/max slider), location (dropdown or search), category (dropdown), date range (picker)
- [ ] Backend: enhance GET /api/leads query with filter params (score_min, score_max, location, category, created_after, created_before)
- [ ] Filters are cumulative (AND logic)
- [ ] Show active filters as tags with clear button
- [ ] Save filter state to URL params or localStorage (optional)
- [ ] Manual test: filter by score 60-80 + location "São Paulo" + category "Dentista" → verify results

**Definition of Done**: Filters work, can export filtered results, tested with various combinations

---

### P2: Frontend design polish
**Priority**: Low | **Effort**: 3-5 days | **Owner**: TBD (could hire designer)

**Problem**: UI is barebones Tailwind grid/flexbox; no custom components, no visual hierarchy, no brand identity.

**Acceptance Criteria**:
- [ ] Design system: button styles, card styles, color palette (primary, secondary, danger, success), typography hierarchy
- [ ] Refactor Search page: better layout, clearer instructions, input styling
- [ ] Refactor Dashboard: table improvements (better readability, hover states, sorting UI)
- [ ] Refactor Meus Leads: pagination controls styled, filters more prominent
- [ ] Lead detail page: visual hierarchy, clear sections, good spacing
- [ ] Responsive: test on mobile (375px) and tablet (768px)
- [ ] Manual test: walk through full flow on mobile, desktop

**Definition of Done**: Deployed to Railway, looks professional, no Figma design needed (iterate from code)

---

### Icebox (Future)

#### User Accounts & Multi-User
**Effort**: 5+ days | **Owner**: TBD

Add authentication (Supabase Auth) so teams can manage their own searches and leads. Not needed for MVP single-user testing.

---

#### Scheduled/Recurring Searches
**Effort**: 3 days | **Owner**: TBD

Allow users to schedule a search to run daily/weekly and auto-notify when hot leads found. Requires job queue (e.g., Bull + Redis).

---

#### CRM Integrations
**Effort**: 5+ days | **Owner**: TBD

Sync leads to HubSpot, Pipedrive, Salesforce (push contact data, auto-create opportunities).

---

#### Analytics Dashboard
**Effort**: 4 days | **Owner**: TBD

Track: search volume, avg leads per search, hot lead percentage, conversion tracking (if CRM integrated), cost per lead (API spend vs. leads found).

---

#### A/B Testing Framework for Copy
**Effort**: 3 days | **Owner**: TBD

Let users A/B test copy variants, track which variant gets most responses (requires CRM integration or manual feedback).

---

## Done

- [x] MVP shipped: search, enrichment, real-time dashboard, Meus Leads
- [x] Google Maps 2-page fetch
- [x] Instagram scraping + deduplication
- [x] Discord hot lead notifications
- [x] Gemini copy generation (4 variants)
- [x] Lead scoring (temperature-based)
- [x] Real-time SSE progress updates

---

## Notes on Prioritization

**P0** bugs are blocking data integrity and must be fixed before MVP testing with real users.

**P1** items unlock significant value with moderate effort:
- Lead detail page is the most impactful (users need to drill into why a lead scored high)
- Error recovery prevents data loss and improves trust
- Input validation prevents bad data in DB
- Cleanup (dead code) improves maintainability for next contributor

**P2** items are valuable but not MVP-blocking:
- Export/CSV is nice-to-have (users can copy from table in a pinch)
- Advanced filters lower friction but aren't required
- Design polish improves credibility but feature works without it

**Icebox** features require significant architecture changes (auth, job queue, CRM APIs) and should only be started after MVP is validated with users.

---

## Velocity & Timeline (Estimates)

Assuming solo engineer, 6-8 hours/day of focused work:

- **P0 bugs**: 2 days (1 day each)
- **P1 lead detail page**: 2 days
- **P1 dead code cleanup**: 0.5 day
- **P1 error recovery**: 2 days
- **P1 input validation**: 1 day
- **P2 export CSV**: 1 day
- **P2 advanced filters**: 1.5 days
- **P2 design polish**: 3-5 days (high variance)

**Total for MVP+**: ~14-17 days → ~3 weeks at 6 hrs/day

**Recommended sequence**:
1. Weeks 1: Fix P0 bugs + lead detail page (unlock user testing)
2. Week 2: Error recovery + input validation + cleanup (stabilize)
3. Week 3: CSV export + advanced filters + design polish (ship v1.1)

Prioritize P0 + lead detail page first; iterate on filters/polish based on user feedback.
