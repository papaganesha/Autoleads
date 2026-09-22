-- Migration: Add niche tracking for daily rotation
-- Run this in Supabase SQL Editor to enable daily niche rotation without repeats

-- Add columns to auto_search_config for tracking niches used today
ALTER TABLE auto_search_config
ADD COLUMN IF NOT EXISTS niches_used_today JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS niches_reset_at TIMESTAMP NULL;

-- Comment for clarity
COMMENT ON COLUMN auto_search_config.niches_used_today IS 'Array of niches already used in runs today, to prevent duplicates';
COMMENT ON COLUMN auto_search_config.niches_reset_at IS 'When the daily niche tracking was last reset (midnight)';

-- Optional: Add index for performance
CREATE INDEX IF NOT EXISTS idx_auto_search_runs_started_at ON auto_search_runs(started_at DESC);

-- Test that columns were added successfully
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'auto_search_config'
AND column_name IN ('niches_used_today', 'niches_reset_at');
