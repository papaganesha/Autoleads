-- Add website_filter and whatsapp_filter columns to searches table
ALTER TABLE searches
ADD COLUMN website_filter TEXT DEFAULT 'any',
ADD COLUMN whatsapp_filter TEXT DEFAULT 'any';
