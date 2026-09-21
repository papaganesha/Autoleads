# AutoLeads Backend

Lead enrichment and scoring API built with Node.js + Express + Supabase + Gemini.

## Quick Start

### Prerequisites
- Node.js 16+
- Supabase project (or local Supabase instance)
- Google Maps API key
- Google Gemini API key
- Gmail SMTP credentials (for email notifications)
- Discord webhook URL (for lead alerts)

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment variables** — Copy `.env.example` to `.env` and fill in:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-key
   GOOGLE_MAPS_API_KEY=your-google-maps-key
   GEMINI_API_KEY=your-gemini-key
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
   GMAIL_USER=your-email@gmail.com
   GMAIL_PASS=your-app-password
   FRONTEND_URL=http://localhost:3000  # or your deployed frontend
   PORT=3001
   ```

3. **Database migrations** — Apply Supabase migrations:
   ```bash
   # If using local Supabase CLI:
   supabase migration up
   
   # If using remote Supabase, manually run migrations from:
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_fix_schema_column_names.sql
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```
   Server runs on http://localhost:3001

### Testing

Run smoke tests:
```bash
npm test
```

Tests verify:
- Search API validation (location required, query/category required)
- Status history ordering (by `changed_at`, most recent first)
- Leads list pagination and filtering

## API Routes

### Search
- **POST `/api/search`** — Start a new search pipeline
  - Body: `{ query?, location, category? }` (at least query OR category + location required)
  - Returns: `{ searchId, status: 'processing' }`
  - Processing runs async in background

- **GET `/api/search/:id`** — Get search status
  - Returns: `{ id, status, total_results, processed_results, ... }`

- **GET `/api/search/autocomplete`** — Location autocomplete
  - Query: `?input=salvador`
  - Returns: List of place suggestions

### Leads
- **GET `/api/leads`** — List leads with pagination & filtering
  - Query: `?page=1&limit=20&temperature=hot&search_id=...`
  - Returns: `{ data: [...], pagination: { page, limit, total, totalPages } }`

- **GET `/api/leads/:id`** — Get lead detail with score breakdown
  - Returns: Lead object + `status_history` array (ordered by `changed_at` DESC)

- **PATCH `/api/leads/:id/status`** — Update lead status
  - Body: `{ status, notes? }`
  - Valid statuses: `new`, `contacted`, `interested`, `not_interested`, `converted`, `archived`
  - Returns: Updated lead object

- **POST `/api/leads/:id/copy`** — Regenerate WhatsApp copy variants
  - Returns: `{ copies: { pain_point, social_proof, urgency, value } }`

- **POST `/api/leads/:id/select-copy`** — Pick a copy variant
  - Body: `{ copyNumber: 1-4 }`  (1=pain_point, 2=social_proof, 3=urgency, 4=value)
  - Returns: `{ selected, text }`

- **GET `/api/leads/:id/whatsapp`** — Generate WhatsApp deep link
  - Returns: `{ whatsapp_link, selected_variant, message }`

## Data Flow

1. **Search** → POST `/api/search` kicks off async pipeline
2. **Google Maps lookup** → Fetch businesses matching category + location
3. **Instagram enrichment** → Scrape Instagram handles, followers, posts
4. **Competitor analysis** → Find nearby competitors (within 2km radius)
5. **Lead scoring** → Calculate temperature (hot/warm/cold) based on heuristics
6. **AI copy generation** → Gemini generates 4 WhatsApp variants
7. **Discord alert** → "Hot" leads notify via Discord webhook
8. **Lead detail** → Frontend fetches complete lead object with scores & history

## Schema

See `supabase/migrations/` for full schema. Key tables:

- `searches` — Search queries and pipeline status
- `leads` — Business records from Google Maps
- `instagram_data` — Instagram profile metrics
- `competitors` — Nearby competitors per lead
- `lead_scores` — Calculated scores and temperature
- `copy_variations` — AI-generated WhatsApp copy variants (4 types)
- `lead_status_history` — Audit trail of status changes

## Architecture

```
backend/
├── src/
│   ├── index.js              # Express app entry
│   ├── routes/               # API endpoints (search, leads, notifications)
│   ├── controllers/          # Request handlers
│   ├── services/             # Business logic (googleMaps, instagram, scoring, copyGenerator, etc)
│   ├── db/                   # Supabase client
│   └── utils/                # Helpers
├── __tests__/                # Jest smoke tests
├── jest.config.js            # Test configuration
└── package.json
```

## Common Issues

### "location is required" (400)
- Ensure `location` field is present in POST `/api/search` request body

### Empty `status_history` on lead detail
- Status must be updated via `PATCH /api/leads/:id/status` to create history records
- History is ordered by `changed_at` (most recent first)

### Upsert conflicts not working
- Ensure `place_id` is correctly populated from Google Maps API response
- Check that migration `002_fix_schema_column_names.sql` has been applied to Supabase

### Gemini copy generation fails
- Verify `GEMINI_API_KEY` is valid and has quota remaining
- Check that lead object has required fields (name, instagram_data, competitors)

## Deployment

### Railway
Set environment variables in Railway project settings, then deploy:
```bash
npm start
```

The app is containerless — just point Railway to this directory and set `start` script.

## Contributing

- Write tests in `__tests__/` for new routes
- Run `npm test` before committing
- Keep Supabase migrations organized (1=schema, 2+=alterations)
