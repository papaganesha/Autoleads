-- Add Gemini completion API tracking
INSERT INTO api_usage (api_name, requests_used, total_requests_limit)
VALUES ('gemini_completion', 0, 999999)
ON CONFLICT (api_name) DO NOTHING;
