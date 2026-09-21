-- Create enriched view for listing leads with score, temperature, and Instagram data as flat columns
-- This allows proper ORDER BY, WHERE filtering, and pagination at the database level

CREATE OR REPLACE VIEW leads_enriched AS
SELECT
  l.*,
  ls.total_score,
  ls.temperature,
  ls.score_breakdown,
  ls.scored_at,
  ig.handle AS instagram_handle,
  ig.followers_count AS instagram_followers_count,
  ig.scrape_status AS instagram_scrape_status
FROM leads l
LEFT JOIN lead_scores ls ON ls.lead_id = l.id
LEFT JOIN instagram_data ig ON ig.lead_id = l.id;

GRANT SELECT ON leads_enriched TO anon, authenticated, service_role;
