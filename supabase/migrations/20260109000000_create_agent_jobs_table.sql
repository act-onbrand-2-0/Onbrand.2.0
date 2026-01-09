-- Agent Jobs Table
-- Stores async job status for long-running agent tasks

CREATE TABLE IF NOT EXISTS agent_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id TEXT NOT NULL, -- Brand slug like 'act' (not UUID)
  agent_type TEXT NOT NULL, -- 'corvee' or 'budget'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  input_data JSONB NOT NULL, -- Store the input parameters
  result JSONB, -- Store the result when completed
  error TEXT, -- Store error message if failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID, -- Can be null for system-created jobs
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT valid_agent_type CHECK (agent_type IN ('corvee', 'budget'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_jobs_brand_id ON agent_jobs(brand_id);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_status ON agent_jobs(status);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_created_at ON agent_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_created_by ON agent_jobs(created_by);

-- Enable Row Level Security
ALTER TABLE agent_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own jobs OR jobs for their brand
CREATE POLICY "Users can view agent jobs for their brand"
  ON agent_jobs
  FOR SELECT
  USING (
    auth.uid() = created_by 
    OR created_by IS NULL
    OR brand_id IN (
      SELECT brand_id FROM user_brands WHERE user_id = auth.uid()
    )
  );

-- Policy: Authenticated users can create jobs
CREATE POLICY "Authenticated users can create agent jobs"
  ON agent_jobs
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    OR auth.role() = 'service_role'
  );

-- Policy: Service role can update all jobs (for background processing)
-- Users can update their own jobs
CREATE POLICY "Update agent jobs"
  ON agent_jobs
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR auth.uid() = created_by
  );

-- Add comment
COMMENT ON TABLE agent_jobs IS 'Stores async job status for long-running agent tasks (Corvee, Budget Planning)';

