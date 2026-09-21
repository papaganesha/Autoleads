-- Add real bio content and extracted contact signals to instagram_data table
-- This migration supports bio link extraction and phone-in-bio discovery

ALTER TABLE instagram_data
  ADD COLUMN IF NOT EXISTS bio_links JSONB;

ALTER TABLE instagram_data
  ADD COLUMN IF NOT EXISTS bio_phone TEXT;

ALTER TABLE instagram_data
  ADD COLUMN IF NOT EXISTS has_bio_contact BOOLEAN DEFAULT FALSE;

ALTER TABLE instagram_data
  ADD COLUMN IF NOT EXISTS bio_scrape_status TEXT;

-- Create index for quick lookup of leads with bio contact info
CREATE INDEX IF NOT EXISTS idx_instagram_data_has_bio_contact
  ON instagram_data(has_bio_contact);
