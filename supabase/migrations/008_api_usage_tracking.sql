-- Create API usage tracking table
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name VARCHAR(50) NOT NULL,
  requests_used INT NOT NULL DEFAULT 0,
  total_requests_limit INT NOT NULL DEFAULT 999,
  requests_available INT GENERATED ALWAYS AS (total_requests_limit - requests_used) STORED,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(api_name)
);

-- Insert initial record for Google Places API with current usage of 122
INSERT INTO api_usage (api_name, requests_used, total_requests_limit)
VALUES ('google_places', 122, 999)
ON CONFLICT (api_name) DO UPDATE
SET requests_used = EXCLUDED.requests_used,
    updated_at = NOW();

-- Create index for faster lookups
CREATE INDEX idx_api_usage_name ON api_usage(api_name);

-- Create function to increment API usage
CREATE OR REPLACE FUNCTION increment_api_usage(p_api_name VARCHAR, p_amount INT DEFAULT 1)
RETURNS void AS $$
BEGIN
  UPDATE api_usage
  SET requests_used = requests_used + p_amount,
      updated_at = NOW()
  WHERE api_name = p_api_name;
END;
$$ LANGUAGE plpgsql;

-- Create function to get remaining requests
CREATE OR REPLACE FUNCTION get_api_remaining(p_api_name VARCHAR)
RETURNS INT AS $$
DECLARE
  remaining INT;
BEGIN
  SELECT total_requests_limit - requests_used INTO remaining
  FROM api_usage
  WHERE api_name = p_api_name;
  RETURN COALESCE(remaining, -1);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, UPDATE ON api_usage TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_api_usage TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_api_remaining TO anon, authenticated, service_role;
