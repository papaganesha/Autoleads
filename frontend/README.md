# AutoLeads Frontend

Lead discovery and management dashboard built with React 18 + Vite + Tailwind CSS.

## Quick Start

### Prerequisites
- Node.js 16+
- Backend API running (see `backend/README.md`)

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment variables** — Copy `.env.example` to `.env`:
   ```
   VITE_API_URL=http://localhost:3001  # Backend API URL
   VITE_GOOGLE_MAPS_KEY=your-google-maps-key
   ```

3. **Development server**
   ```bash
   npm run dev
   ```
   Opens http://localhost:5173

4. **Production build**
   ```bash
   npm run build
   npm run preview  # Test production build locally
   ```

## Pages

### Search (`/`)
- Enter category (e.g. "salão de beleza") and location (e.g. "Salvador")
- Triggers `POST /api/search` pipeline
- Shows search ID and "processing" status
- Pipeline runs async in background

### Dashboard (`/dashboard/:searchId`)
- Lists all leads from a search
- Filter by temperature (hot/warm/cold)
- Sort by score, recent activity
- Click a lead to view details
- Status badges show current lead state

### Lead Detail (`/leads/:leadId`)
- Full lead profile with:
  - Google Maps data (name, address, rating, phone)
  - Instagram metrics (followers, posts, bio)
  - Competitor analysis (nearby businesses)
  - Lead score breakdown and temperature
  - Status history (audit trail of changes)
- Actions:
  - Change status (new → contacted → interested/converted/archived)
  - Regenerate WhatsApp copy variants
  - Copy WhatsApp link and send

## Components

- `SearchForm` — Category + location input, submit search
- `LeadTable` — Paginated leads list with filters and sorting
- `LeadDetail` — Full lead profile view
- `ScoreBadge` — Visual indicator (hot/warm/cold temperature)
- `ScoreBreakdown` — Score calculation details
- `CompetitorList` — Nearby competitors
- `CopyCard` — WhatsApp copy variant selector
- `FilterTabs` — Temperature filter tabs

## State Management

Uses React Context + hooks. API calls via `axios`:

```javascript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Example: fetch leads
const leads = await api.get(`/leads?search_id=${searchId}`);
```

## Styling

Tailwind CSS + custom utility classes. Dark mode supported via `prefers-color-scheme` media query.

Color scheme:
- Hot: Red / Orange
- Warm: Yellow / Amber
- Cold: Gray / Blue

## Key Flows

### Search Flow
1. User enters category + location on `/`
2. Submit → `POST /api/search` → gets `searchId`
3. Redirect to `/dashboard/:searchId`
4. Poll `GET /api/search/:id` for status updates
5. When `status === 'completed'`, show leads list

### Lead Management Flow
1. User clicks lead in dashboard
2. Navigate to `/leads/:leadId`
3. Fetch full lead detail from `GET /api/leads/:leadId`
4. Display score, Instagram, competitors, copy variants
5. User can:
   - Update status: `PATCH /api/leads/:leadId/status`
   - Change copy: `POST /api/leads/:leadId/select-copy`
   - Open WhatsApp: `GET /api/leads/:leadId/whatsapp`

## Environment Variables

- `VITE_API_URL` — Backend API base URL (e.g. http://localhost:3001 or https://api.autoleads.com)
- `VITE_GOOGLE_MAPS_KEY` — Google Maps API key for embedded maps and autocomplete

## Deployment

### Railway
1. Set `VITE_API_URL` to your deployed backend URL
2. Build: `npm run build` → outputs to `dist/`
3. Serve: `npm start` (uses `serve` package to run `dist/` on `$PORT`)

### Vercel
1. Connect GitHub repo to Vercel
2. Set `VITE_API_URL` in environment variables
3. Vercel auto-builds and deploys on push

## Common Issues

### "API is not reachable" (network errors)
- Ensure `VITE_API_URL` points to correct backend (include protocol: `http://` or `https://`)
- Check CORS policy — backend must allow frontend origin
- Backend runs on `localhost:3001`, frontend on `localhost:5173` in dev

### Maps not displaying
- Verify `VITE_GOOGLE_MAPS_KEY` is valid and has Maps Embed API enabled
- Check browser console for API key errors

### Copy variants not showing
- Lead must have been scored and copy generated via `POST /leads/:id/copy`
- Check backend logs for Gemini API errors

### Status history empty
- Lead status must be updated via the dashboard (not directly in database)
- Each status change via API creates a history entry

## Development

- `npm run dev` — Start dev server with hot reload
- `npm run build` — Build for production
- `npm run preview` — Test production build locally
- Vite config: `vite.config.js`
- Tailwind config: `tailwind.config.js`

## Contributing

- Keep components small and composable
- Use Tailwind utilities over CSS files where possible
- Handle loading/error states explicitly
- Test API integrations in browser DevTools Network tab
