-- Consolidate place identifiers: drop google_place_id (redundant with place_id)
-- place_id is the UNIQUE key and is always populated from Google Maps API

ALTER TABLE leads DROP COLUMN IF EXISTS google_place_id;

-- Drop the index if it exists
DROP INDEX IF EXISTS idx_leads_google_place_id;
