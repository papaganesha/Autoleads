-- Fix schema to match code expectations
-- Code expects: place_id, name, latitude, longitude, user_rating_count
-- Schema had: google_place_id, business_name, location_lat, location_lng, review_count

-- Drop the index first
DROP INDEX IF EXISTS idx_leads_google_place_id;

-- Rename columns to match code
ALTER TABLE leads
  RENAME COLUMN business_name TO name;

ALTER TABLE leads
  RENAME COLUMN location_lat TO latitude;

ALTER TABLE leads
  RENAME COLUMN location_lng TO longitude;

ALTER TABLE leads
  RENAME COLUMN review_count TO user_rating_count;

-- Rename google_place_id to place_id and make it the upsert key
ALTER TABLE leads
  RENAME COLUMN google_place_id TO place_id;

-- Add unique constraint on place_id and create index
ALTER TABLE leads
  ADD CONSTRAINT unique_place_id UNIQUE (place_id);

CREATE INDEX idx_leads_place_id ON leads(place_id);

-- Fix competitors table to use place_id as well for consistency
ALTER TABLE competitors
  RENAME COLUMN google_place_id TO place_id;

CREATE INDEX idx_competitors_place_id ON competitors(place_id);

-- Fix instagram_data table column names
ALTER TABLE instagram_data
  RENAME COLUMN instagram_handle TO handle;

ALTER TABLE instagram_data
  RENAME COLUMN followers TO followers_count;

ALTER TABLE instagram_data
  RENAME COLUMN following TO following_count;

ALTER TABLE instagram_data
  RENAME COLUMN post_count TO posts_count;

-- Add new columns that code expects but schema doesn't have
ALTER TABLE instagram_data
  ADD COLUMN IF NOT EXISTS profile_pic_url TEXT;

ALTER TABLE instagram_data
  ADD COLUMN IF NOT EXISTS scrape_status TEXT DEFAULT 'pending';

ALTER TABLE instagram_data
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Drop last_post_date as it's not used by the code
-- (no drop needed, just not populated)

-- Fix copy_variations table column names
ALTER TABLE copy_variations
  RENAME COLUMN copy_pain_point TO pain_point;

ALTER TABLE copy_variations
  RENAME COLUMN copy_social_proof TO social_proof;

ALTER TABLE copy_variations
  RENAME COLUMN copy_urgency TO urgency;

ALTER TABLE copy_variations
  RENAME COLUMN copy_value TO value;

ALTER TABLE copy_variations
  RENAME COLUMN selected_copy TO selected_variant;
