-- Auto-Search Scheduler Tables & Columns

-- New table: auto_search_config (singleton row for configuration)
CREATE TABLE auto_search_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN DEFAULT false,
  state TEXT DEFAULT NULL,  -- UF code (SP, RJ, etc.) or NULL for all Brazil
  city_count INT DEFAULT 5 CHECK (city_count > 0 AND city_count <= 50),
  city_selection_mode TEXT DEFAULT 'top_populous' CHECK (city_selection_mode IN ('top_populous', 'manual')),
  manual_cities JSONB DEFAULT '[]',  -- Array of city strings if mode='manual'
  niche_count INT DEFAULT 5 CHECK (niche_count > 0 AND niche_count <= 16),
  niche_selection_mode TEXT DEFAULT 'random' CHECK (niche_selection_mode IN ('random', 'manual')),
  manual_niches JSONB DEFAULT '[]',  -- Array of niche strings if mode='manual'
  schedule_times JSONB DEFAULT '[]',  -- Array of "HH:00" strings (e.g. ["08:00","14:00"])
  max_runs_per_day INT DEFAULT 3 CHECK (max_runs_per_day > 0 AND max_runs_per_day <= 24),
  results_per_search INT DEFAULT 10 CHECK (results_per_search >= 5 AND results_per_search <= 15),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default singleton config
INSERT INTO auto_search_config (id, is_enabled) VALUES (gen_random_uuid(), false)
  ON CONFLICT DO NOTHING;

-- New table: auto_search_runs (run history and logs)
CREATE TABLE auto_search_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('scheduled', 'manual')),
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'completed_with_errors', 'failed')),
  cities JSONB NOT NULL,  -- Snapshot of cities chosen for this run
  niches JSONB NOT NULL,  -- Snapshot of niches chosen for this run
  searches_total INT NOT NULL,
  searches_completed INT DEFAULT 0,
  searches_failed INT DEFAULT 0,
  error_message TEXT DEFAULT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for run history queries (most recent first)
CREATE INDEX idx_auto_search_runs_started_at_desc ON auto_search_runs (started_at DESC);

-- Extend searches table to link to auto_search_runs
ALTER TABLE searches
  ADD COLUMN auto_search_run_id UUID REFERENCES auto_search_runs(id) ON DELETE SET NULL,
  ADD COLUMN error_message TEXT DEFAULT NULL;

-- Index for finding searches by their scheduler run
CREATE INDEX idx_searches_auto_search_run_id ON searches (auto_search_run_id);
