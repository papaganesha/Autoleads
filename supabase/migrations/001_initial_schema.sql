CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_results INTEGER DEFAULT 0,
  processed_results INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES searches(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  category TEXT,
  address TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  phone TEXT,
  website TEXT,
  google_maps_url TEXT,
  google_place_id TEXT UNIQUE,
  rating NUMERIC(2,1),
  review_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE instagram_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  instagram_handle TEXT,
  followers INTEGER,
  following INTEGER,
  post_count INTEGER,
  last_post_date TIMESTAMPTZ,
  bio TEXT,
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  distance_meters INTEGER,
  rating NUMERIC(2,1),
  review_count INTEGER DEFAULT 0,
  website TEXT,
  google_place_id TEXT
);

CREATE TABLE lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  temperature TEXT NOT NULL DEFAULT 'cold',
  total_score INTEGER NOT NULL DEFAULT 0,
  score_breakdown JSONB NOT NULL DEFAULT '{}',
  has_competitors BOOLEAN DEFAULT false,
  scored_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE copy_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  copy_pain_point TEXT,
  copy_social_proof TEXT,
  copy_urgency TEXT,
  copy_value TEXT,
  selected_copy INTEGER,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lead_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  notes TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_search_id ON leads(search_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_google_place_id ON leads(google_place_id);
CREATE INDEX idx_lead_scores_temperature ON lead_scores(temperature);
CREATE INDEX idx_lead_scores_total_score ON lead_scores(total_score DESC);
CREATE INDEX idx_competitors_lead_id ON competitors(lead_id);
CREATE INDEX idx_lead_status_history_lead_id ON lead_status_history(lead_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
