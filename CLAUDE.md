# AutoLeads Architecture & Context

## Project Overview
AutoLeads is a Brazilian lead-generation tool for small/medium businesses hunting new sales opportunities in specific categories and geographies. MVP focuses on search → enrichment → copy generation → notification workflow.

## Tech Stack

### Frontend
- **Framework**: React 18 + React Router v7
- **Build tool**: Vite
- **Styling**: Tailwind CSS + PostCSS
- **Maps**: @react-google-maps/api
- **HTTP client**: Axios
- **Deployment**: Railway (runs `npm start` which uses `serve`)

### Backend
- **Runtime**: Node.js + Express
- **API style**: REST with Server-Sent Events (SSE) for real-time search progress
- **Logging**: Pino + pino-http
- **Mail**: Nodemailer (for Gmail forwarding, not yet wired up)
- **Database**: Supabase (PostgreSQL 15+)
- **External APIs**: 
  - Google Maps API (text search + nearby search for competitors)
  - Google Generative AI (Gemini for copy generation)
  - Instagram web scraping via Cheerio
  - Discord webhooks (hot lead notifications)
- **Deployment**: Railway

### Database (Supabase PostgreSQL)
**Core tables:**
- `searches`: stores search queries (category + location), status, result counts
- `leads`: enriched place data (name, address, phone, website, rating, place_id, google_place_id)
- `instagram_data`: scraped Instagram handle, followers, bio, profile pic URL
- `competitors`: nearby competitors found via Google Nearby Search
- `lead_scores`: temperature (hot/warm/cold) + scoring breakdown (JSONB)
- `copy_variations`: generated copy variants (pain_point, social_proof, urgency, value, selected_variant)
- `lead_status_history`: lead status transitions (new → contacted → closed, etc.)

**Key indices & triggers:**
- Indexes on search_id, status, google_place_id, temperature, total_score (DESC)
- Auto-update trigger on leads.updated_at

**Known schema issues (P0 debt):**
1. `lead_status_history.changed_at` column name mismatches code queries (code looks for `created_at`)
2. `searches.category` and `searches.location` are NOT NULL but routes can insert null values → constraint violation
3. Redundancy: both `leads.place_id` and `leads.google_place_id` stored (could consolidate to one)

## Key Features (MVP)

### Search
- Real-time search with autocomplete (category + location)
- Configurable limit (5-15 leads per search)
- Google Maps 2-page text search (~40 results fetched, filtered before enrichment)
- SSE progress updates sent as results are enriched

### Enrichment Pipeline
- **Instagram scraping**: Cheerio web scrape to extract handle, followers, bio
- **Competitor finding**: Google Nearby Search (radius-based, top 5 per lead)
- **Lead scoring**: temperature (hot ≥70, warm 50-69, cold <50) based on followers, competitors, rating
- **Copy generation**: Gemini API creates 4 variants (pain_point, social_proof, urgency, value)

### Deduplication
- Before enrichment, check if `place_id` exists in DB
- If found: skip enrichment, reuse cached data, but still include in current search results
- Saves API cost for repeat locations

### Notifications
- Discord webhook for hot leads (score ≥ 70)
- Includes: lead name, category, Instagram handle + follower count, score, address

### Dashboard & Meus Leads
- Real-time results table with temperature filtering
- "Meus Leads" (My Leads) global list: all leads across all searches, persistent, paginated, temperature-filtered

## Architecture Decisions

### Frontend
- No global state manager (kept simple for MVP)
- Each page (Search, Dashboard, Meus Leads) manages its own state via React hooks
- Tailwind for rapid styling without custom CSS

### Backend
- Single Express server with modular route + service structure
- Services (googleMaps, instagram, scoring, etc.) are stateless, called in sequence during enrichment
- SSE for search progress (real-time updates without polling)
- No job queue yet; enrichment happens synchronously in request handler

### Data Flow
1. User submits search (POST /api/search)
2. Backend fetches Google Maps results (page 1 + 2)
3. For each lead: check dedup cache (place_id in DB?)
4. If new: enrich (Instagram → scoring → copy gen → Discord notification)
5. If cached: reuse instagram_data + lead_scores + copy_variations
6. Emit SSE event with progress (current / total)
7. Return all results (new + cached)

## Deployment

### Local Development
```bash
cd backend && npm run dev
cd frontend && npm run dev
```
Backend runs on http://localhost:3000 (default), frontend on http://localhost:5173 (Vite)

### Production (Railway)
- Frontend: `npm run build` → `npm start` (serves /dist)
- Backend: `npm start` (Node.js)
- Both expect environment variables: SUPABASE_URL, SUPABASE_KEY, GOOGLE_MAPS_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, DISCORD_WEBHOOK_URL

## Technical Debt (Known Limitations)

### P0 Bugs (Block MVP)
- `lead_status_history` schema mismatch: code queries `created_at`, column is `changed_at`
- `searches.category` / `location` NOT NULL but route code inserts null → DB constraint violation

### P1 Tech Debt
- Duplicate routes in backend/src/routes/leads.js (lines 16-241 appear to be dead code)
- Schema redundancy: place_id vs google_place_id (consolidate to one)
- No automated tests (manual testing only)
- No error recovery for failed enrichment steps (e.g., if Gemini fails mid-pipeline, lead is left partially enriched)
- No input validation on search queries (category/location autocomplete helps, but no backend validation)

### P2 Polish
- Frontend styling is barebones (Tailwind grid/flexbox, no custom components or design polish)
- No lead detail page (click lead → drill into enrichment data, copy variants, competitors, scoring breakdown)
- No export / save-to-CSV
- No filters on Meus Leads beyond temperature (e.g., score range, location, category)
- No analytics or search volume tracking

## Environment Variables

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# Google APIs
GOOGLE_MAPS_API_KEY=your-maps-api-key
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key

# Discord (hot lead notifications)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Optional (not yet integrated)
GMAIL_USER=noreply@example.com
GMAIL_PASSWORD=your-app-password
```

## Next Phase Priorities

See BACKLOG.md for detailed prioritized work items. High-level:
1. **P0**: Fix schema bugs (lead_status_history, searches NOT NULL constraints)
2. **P1**: Add lead detail page, remove dead routes, add basic error recovery
3. **P2**: Export/CSV, advanced filters on Meus Leads, design polish
4. **Icebox**: User accounts, scheduled searches, analytics, A/B testing, CRM integrations

## Contact & Ownership
- **Current**: Solo MVP build by João (papaganesha)
- **Next**: If hiring, will need: frontend polish (React + design), backend robustness (error handling + job queue), ops (CI/CD + monitoring)
