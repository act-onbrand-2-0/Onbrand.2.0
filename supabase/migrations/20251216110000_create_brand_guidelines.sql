-- Create brand_guidelines table for structured brand configuration
-- This stores the AI-extracted and user-approved brand guidelines

CREATE TABLE IF NOT EXISTS public.brand_guidelines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id TEXT REFERENCES public.brands(id) ON DELETE CASCADE UNIQUE,
  
  -- Source document reference
  source_document_id UUID REFERENCES public.brand_documents(id) ON DELETE SET NULL,
  
  -- Status tracking
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'archived')),
  
  -- Voice & Personality
  voice JSONB DEFAULT '{}'::jsonb,
  -- Expected structure:
  -- {
  --   "personality": ["confident", "approachable", "innovative"],
  --   "tone": "professional yet friendly",
  --   "writeAs": "Write as a trusted advisor, not a salesperson",
  --   "audienceLevel": "professionals who value clarity"
  -- }
  
  -- Copy Guidelines
  copy_guidelines JSONB DEFAULT '{}'::jsonb,
  -- Expected structure:
  -- {
  --   "dos": [
  --     { "rule": "Use active voice", "example": "We build tools", "why": "More direct and engaging" }
  --   ],
  --   "donts": [
  --     { "rule": "Avoid jargon", "badExample": "Leverage synergies", "goodExample": "Work together effectively" }
  --   ],
  --   "wordChoices": [
  --     { "avoid": "users", "prefer": "customers" }
  --   ],
  --   "phrases": {
  --     "required": ["taglines", "CTAs"],
  --     "banned": ["competitor names", "outdated terms"]
  --   }
  -- }
  
  -- Visual Guidelines
  visual_guidelines JSONB DEFAULT '{}'::jsonb,
  -- Expected structure:
  -- {
  --   "colors": {
  --     "primary": "#2563eb",
  --     "secondary": "#1e40af",
  --     "accent": "#fbbf24",
  --     "neutrals": ["#111827", "#6b7280", "#f3f4f6"],
  --     "usage": "Primary for CTAs and headings, secondary for backgrounds"
  --   },
  --   "typography": {
  --     "headings": { "family": "Inter", "weights": ["600", "700"] },
  --     "body": { "family": "Inter", "weights": ["400", "500"] },
  --     "usage": "Headings should be bold and clear"
  --   },
  --   "imagery": {
  --     "style": "Warm, authentic, real people in real situations",
  --     "avoid": ["Stock photos with fake smiles", "Overly corporate settings"],
  --     "prefer": ["Natural lighting", "Diverse representation", "Action shots"]
  --   },
  --   "logo": {
  --     "clearSpace": "Minimum 20px around logo",
  --     "minSize": "24px height",
  --     "donts": ["Don't stretch", "Don't change colors", "Don't add effects"]
  --   }
  -- }
  
  -- Messaging Guidelines
  messaging JSONB DEFAULT '{}'::jsonb,
  -- Expected structure:
  -- {
  --   "pillars": ["Trust", "Innovation", "Simplicity"],
  --   "valueProposition": "We help brands stay consistent across all channels",
  --   "tagline": "Stay on brand, always",
  --   "boilerplate": "ACT is a brand management platform..."
  -- }
  
  -- Raw extraction from AI (for reference/debugging)
  raw_extraction JSONB,
  
  -- Audit trail
  extracted_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  extracted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast brand lookup
CREATE INDEX IF NOT EXISTS idx_brand_guidelines_brand_id ON public.brand_guidelines(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_guidelines_status ON public.brand_guidelines(status);

-- Enable RLS
ALTER TABLE public.brand_guidelines ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view guidelines from their brands"
  ON public.brand_guidelines FOR SELECT
  USING (
    brand_id IN (
      SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage brand guidelines"
  ON public.brand_guidelines FOR ALL
  USING (
    brand_id IN (
      SELECT brand_id FROM public.brand_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Create brand_check_logs table for tracking brand checks
CREATE TABLE IF NOT EXISTS public.brand_check_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id TEXT REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- What was checked
  check_type TEXT NOT NULL CHECK (check_type IN ('copy', 'image', 'color', 'logo', 'full')),
  content_checked TEXT, -- The content that was submitted for checking
  content_metadata JSONB, -- Additional context (e.g., image URL, platform, etc.)
  
  -- Results
  score INTEGER CHECK (score >= 0 AND score <= 100),
  is_compliant BOOLEAN,
  issues JSONB DEFAULT '[]'::jsonb,
  -- Expected structure for issues:
  -- [
  --   { "severity": "error", "rule": "Avoid jargon", "found": "leverage", "suggestion": "use" },
  --   { "severity": "warning", "rule": "Use active voice", "found": "was done", "suggestion": "we did" }
  -- ]
  suggestions JSONB DEFAULT '[]'::jsonb,
  
  -- AI response metadata
  model_used TEXT,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_brand_check_logs_brand_id ON public.brand_check_logs(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_check_logs_check_type ON public.brand_check_logs(check_type);
CREATE INDEX IF NOT EXISTS idx_brand_check_logs_created_at ON public.brand_check_logs(created_at);

-- Enable RLS
ALTER TABLE public.brand_check_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their brand check logs"
  ON public.brand_check_logs FOR SELECT
  USING (
    brand_id IN (
      SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create check logs for their brands"
  ON public.brand_check_logs FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
    )
  );

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_brand_guidelines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brand_guidelines_updated_at
  BEFORE UPDATE ON public.brand_guidelines
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_guidelines_updated_at();

-- Comment for documentation
COMMENT ON TABLE public.brand_guidelines IS 'Stores structured brand guidelines extracted from brand documents by AI and approved by users';
COMMENT ON TABLE public.brand_check_logs IS 'Logs all brand compliance checks for analytics and audit purposes';
