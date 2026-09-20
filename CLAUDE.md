# AutoLeads — Project Context

## Purpose

AutoLeads is a lead-generation and sales-prospecting tool for the Brazilian market. A user searches for a business category and location (e.g. "salão de beleza" in Salvador), the backend pulls matching businesses from Google Maps, enriches each with Instagram data and nearby competitor information, scores them as sales leads (hot/warm/cold), and auto-generates WhatsApp outreach copy via Gemini. Built for sales/agency teams doing local-business outbound prospecting.

## Architecture

**Monorepo** with two independent Node.js apps plus Supabase database:

- **`backend/`** — Express REST API
  - Entry: `backend/src/index.js`
  - Routes: `backend/src/routes/` (search, leads, notifications)
  - Controllers: `backend/src/controllers/`
  - Services: `backend/src/services/` (googleMaps, instagram, competitors, scoring, copyGenerator, discord, email)
  - Dependencies: `@supabase/supabase-js`, `@google/generative-ai` (Gemini), `cheerio` (scraping), `nodemailer`, `pino` logging

- **`frontend/`** — React 18 + Vite + Tailwind CSS SPA
  - Pages: `frontend/src/pages` (SearchPage, DashboardPage, LeadDetailPage)
  - Components: `frontend/src/components`
  - Communicates with backend via `VITE_API_URL` environment variable
  - Production build served via `serve` (`serve dist -s -l ${PORT:-3000}`)

- **`supabase/`** — Database migrations
  - Single migration: `supabase/migrations/001_initial_schema.sql`
  - Tables: `searches`, `leads`, `instagram_data`, `competitors`, `lead_scores`, `copy_variations`, `lead_status_history`

No shared workspace config — each app has its own `package.json`.

## Data Layer

Postgres schema (Supabase):
- `searches` — search query metadata (category, location, status, result counts)
- `leads` — Google Places businesses (name, address, rating, website, phone, Google Maps coordinates)
- `instagram_data` — scraped Instagram profiles for leads (followers, posts count, bio)
- `competitors` — nearby competitors found within search radius
- `lead_scores` — calculated temperature (hot/warm/cold) and score breakdown
- `copy_variations` — AI-generated WhatsApp copy variants (pain_point, social_proof, urgency, value)
- `lead_status_history` — audit log of status transitions (new → contacted → interested/not_interested → converted/archived)

## Deployment

**Railway** (inferred from hardcoded CORS origin in `backend/src/index.js` and `serve` start script in `frontend/package.json`).

Environment variables:
- `backend/.env.example` — Supabase URL/key, Google Maps API key, Gemini API key, Discord webhook, SMTP (Gmail), frontend URL for CORS
- `frontend/.env.example` — `VITE_API_URL`, `VITE_GOOGLE_MAPS_KEY`

## Conventions

- **No tests** — no test runner, no test files anywhere in `backend/` or `frontend/`
- **No CI/CD** — no `.github/workflows`
- **Commit style** — short imperative subject lines (e.g. "Fix POST /api/search 500 error and React object-as-child crash")
- **Logging** — Pino (backend), console (frontend)

## Planning & Backlog

- Product backlog and current priorities live in `BACKLOG.md`
- PO/Scrum Master role definition: `.claude/agents/po-scrum-master.md`
- Process: lightweight Kanban (Backlog → In Progress → Done) tracked in BACKLOG.md
