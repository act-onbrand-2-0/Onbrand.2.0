-- Create social_analytics table for storing getlate.dev metrics
CREATE TABLE IF NOT EXISTS public.social_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id TEXT REFERENCES public.brands(id) ON DELETE CASCADE,
  
  -- Analytics data from getlate.dev
  data JSONB NOT NULL,
  
  -- Metadata
  platform TEXT, -- 'twitter', 'linkedin', 'instagram', etc.
  metric_type TEXT, -- 'engagement', 'reach', 'followers', etc.
  
  -- Timestamps
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_analytics_brand_id ON public.social_analytics(brand_id);
CREATE INDEX IF NOT EXISTS idx_social_analytics_platform ON public.social_analytics(platform);
CREATE INDEX IF NOT EXISTS idx_social_analytics_fetched_at ON public.social_analytics(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_analytics_data ON public.social_analytics USING gin(data);

-- Enable RLS
ALTER TABLE public.social_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view analytics from their brands"
  ON public.social_analytics FOR SELECT
  USING (
    brand_id IN (
      SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert analytics"
  ON public.social_analytics FOR INSERT
  WITH CHECK (true); -- Edge functions use service role

CREATE POLICY "Admins can delete brand analytics"
  ON public.social_analytics FOR DELETE
  USING (
    brand_id IN (
      SELECT brand_id FROM public.brand_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );
