-- Add facebook_url column to leads table
ALTER TABLE leads ADD COLUMN facebook_url TEXT;

-- Index for potential future filtering
CREATE INDEX idx_leads_facebook_url ON leads(facebook_url) WHERE facebook_url IS NOT NULL;
