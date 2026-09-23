-- ============================================
-- Fix 1-7 Integration: Database Migrations
-- Execute all in Supabase SQL Console
-- ============================================

-- TABLE 1: Pipeline Jobs (Fix 7: Async Job Queue)
CREATE TABLE IF NOT EXISTS public.pipeline_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  "limit" INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  error_stage TEXT,
  last_error TEXT,
  last_error_stage TEXT,
  created_at BIGINT NOT NULL,
  started_at BIGINT,
  completed_at BIGINT,
  failed_at BIGINT,
  results JSONB,
  created_at_timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_status ON public.pipeline_jobs(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_user_id ON public.pipeline_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_created ON public.pipeline_jobs(created_at DESC);

ALTER TABLE public.pipeline_jobs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.pipeline_jobs TO anon, authenticated, service_role;

-- TABLE 2: Search Checkpoints (Fix 5: SSE Checkpoint Resume)
CREATE TABLE IF NOT EXISTS public.search_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES public.searches(id) ON DELETE CASCADE,
  last_processed_lead_id UUID,
  "timestamp" BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_search_checkpoints_search_id ON public.search_checkpoints(search_id);
CREATE INDEX IF NOT EXISTS idx_search_checkpoints_timestamp ON public.search_checkpoints("timestamp" DESC);

ALTER TABLE public.search_checkpoints ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_checkpoints TO anon, authenticated, service_role;

-- TABLE 3: Stage Errors (Fix 1: Error Logging)
CREATE TABLE IF NOT EXISTS public.stage_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  error_code TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  fallback_action TEXT,
  "timestamp" BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stage_errors_lead_id ON public.stage_errors(lead_id);
CREATE INDEX IF NOT EXISTS idx_stage_errors_stage ON public.stage_errors(stage);
CREATE INDEX IF NOT EXISTS idx_stage_errors_error_code ON public.stage_errors(error_code);
CREATE INDEX IF NOT EXISTS idx_stage_errors_timestamp ON public.stage_errors("timestamp" DESC);

ALTER TABLE public.stage_errors ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.stage_errors TO anon, authenticated, service_role;

-- Verify tables created
SELECT tablename FROM pg_tables WHERE tablename IN ('pipeline_jobs', 'search_checkpoints', 'stage_errors');
