-- Migration 002: Ensure schema matches code expectations (idempotent)
-- This migration is safe to run whether the DB was created from 001 or an older schema.

-- Leads: ensure place_id index exists
CREATE INDEX IF NOT EXISTS idx_leads_place_id ON leads(place_id);

-- Competitors: ensure place_id column exists (older schemas had google_place_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competitors' AND column_name = 'google_place_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competitors' AND column_name = 'place_id'
  ) THEN
    ALTER TABLE competitors RENAME COLUMN google_place_id TO place_id;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_competitors_place_id ON competitors(place_id);

-- Instagram data: add columns code expects
ALTER TABLE instagram_data
  ADD COLUMN IF NOT EXISTS profile_pic_url TEXT;

ALTER TABLE instagram_data
  ADD COLUMN IF NOT EXISTS scrape_status TEXT DEFAULT 'pending';

ALTER TABLE instagram_data
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Copy variations: ensure selected_variant column exists
ALTER TABLE copy_variations
  ADD COLUMN IF NOT EXISTS selected_variant TEXT;

ALTER TABLE copy_variations
  ADD COLUMN IF NOT EXISTS model_used TEXT;

ALTER TABLE copy_variations
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ;
