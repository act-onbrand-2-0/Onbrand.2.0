-- Update role system and add token quota management

-- 1. Update brand_users table to support new roles
ALTER TABLE public.brand_users DROP CONSTRAINT IF EXISTS brand_users_role_check;

ALTER TABLE public.brand_users 
ADD CONSTRAINT brand_users_role_check 
CHECK (role IN ('company_admin', 'owner', 'creator', 'reviewer', 'user'));

-- Update existing roles (migration path)
UPDATE public.brand_users SET role = 'creator' WHERE role = 'editor';
UPDATE public.brand_users SET role = 'creator' WHERE role = 'admin';

-- 2. Create brand_quotas table for token management
CREATE TABLE IF NOT EXISTS public.brand_quotas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id TEXT REFERENCES public.brands(id) ON DELETE CASCADE UNIQUE,
  
  -- Token quotas
  prompt_tokens_limit INTEGER DEFAULT 100000, -- 100k tokens default
  prompt_tokens_used INTEGER DEFAULT 0,
  prompt_tokens_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days',
  
  -- Additional quotas
  image_generation_limit INTEGER DEFAULT 100,
  image_generation_used INTEGER DEFAULT 0,
  
  storage_limit_mb INTEGER DEFAULT 1024, -- 1GB default
  
  workflow_executions_limit INTEGER DEFAULT 1000,
  workflow_executions_used INTEGER DEFAULT 0,
  
  -- Tracking
  last_topped_up_at TIMESTAMP WITH TIME ZONE,
  last_topped_up_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on brand_id
CREATE INDEX IF NOT EXISTS idx_brand_quotas_brand_id ON public.brand_quotas(brand_id);

-- Enable RLS
ALTER TABLE public.brand_quotas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quotas
CREATE POLICY "Users can view their brand quotas"
  ON public.brand_quotas FOR SELECT
  USING (
    brand_id IN (
      SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Company admins can update any brand quotas"
  ON public.brand_quotas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.brand_users bu
      JOIN public.brands b ON bu.brand_id = b.id
      WHERE bu.user_id = auth.uid()
        AND bu.role = 'company_admin'
        AND b.id = 'act' -- Only ACT company admins
    )
  );

CREATE POLICY "Owners can view quota details"
  ON public.brand_quotas FOR SELECT
  USING (
    brand_id IN (
      SELECT brand_id FROM public.brand_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'company_admin')
    )
  );

-- 3. Create quota_transactions table for audit trail
CREATE TABLE IF NOT EXISTS public.quota_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id TEXT REFERENCES public.brands(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('topup', 'usage', 'reset', 'deduction')),
  quota_type TEXT NOT NULL CHECK (quota_type IN ('prompt_tokens', 'image_generation', 'workflow_executions')),
  
  amount INTEGER NOT NULL, -- Positive for topup, negative for usage
  previous_value INTEGER NOT NULL,
  new_value INTEGER NOT NULL,
  
  -- Who did it
  performed_by UUID REFERENCES auth.users(id),
  
  -- Context
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quota_transactions_brand_id ON public.quota_transactions(brand_id);
CREATE INDEX IF NOT EXISTS idx_quota_transactions_type ON public.quota_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_quota_transactions_created_at ON public.quota_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE public.quota_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their brand quota transactions"
  ON public.quota_transactions FOR SELECT
  USING (
    brand_id IN (
      SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Company admins can insert quota transactions"
  ON public.quota_transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brand_users bu
      JOIN public.brands b ON bu.brand_id = b.id
      WHERE bu.user_id = auth.uid()
        AND bu.role = 'company_admin'
        AND b.id = 'act'
    )
  );

-- 4. Function to check and update quota
CREATE OR REPLACE FUNCTION public.check_and_use_quota(
  p_brand_id TEXT,
  p_quota_type TEXT,
  p_amount INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_used INTEGER;
  v_current_limit INTEGER;
  v_quota_id UUID;
BEGIN
  -- Get current quota
  SELECT id,
    CASE 
      WHEN p_quota_type = 'prompt_tokens' THEN prompt_tokens_used
      WHEN p_quota_type = 'image_generation' THEN image_generation_used
      WHEN p_quota_type = 'workflow_executions' THEN workflow_executions_used
    END,
    CASE 
      WHEN p_quota_type = 'prompt_tokens' THEN prompt_tokens_limit
      WHEN p_quota_type = 'image_generation' THEN image_generation_limit
      WHEN p_quota_type = 'workflow_executions' THEN workflow_executions_limit
    END
  INTO v_quota_id, v_current_used, v_current_limit
  FROM public.brand_quotas
  WHERE brand_id = p_brand_id;

  -- Check if brand has quota record
  IF v_quota_id IS NULL THEN
    RAISE EXCEPTION 'No quota record found for brand %', p_brand_id;
  END IF;

  -- Check if within limit
  IF v_current_used + p_amount > v_current_limit THEN
    RETURN FALSE;
  END IF;

  -- Update quota
  UPDATE public.brand_quotas
  SET 
    prompt_tokens_used = CASE WHEN p_quota_type = 'prompt_tokens' THEN prompt_tokens_used + p_amount ELSE prompt_tokens_used END,
    image_generation_used = CASE WHEN p_quota_type = 'image_generation' THEN image_generation_used + p_amount ELSE image_generation_used END,
    workflow_executions_used = CASE WHEN p_quota_type = 'workflow_executions' THEN workflow_executions_used + p_amount ELSE workflow_executions_used END,
    updated_at = NOW()
  WHERE brand_id = p_brand_id;

  -- Log transaction
  INSERT INTO public.quota_transactions (
    brand_id,
    transaction_type,
    quota_type,
    amount,
    previous_value,
    new_value,
    performed_by
  ) VALUES (
    p_brand_id,
    'usage',
    p_quota_type,
    -p_amount,
    v_current_used,
    v_current_used + p_amount,
    auth.uid()
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to top up quota (Company Admin only)
CREATE OR REPLACE FUNCTION public.topup_quota(
  p_brand_id TEXT,
  p_quota_type TEXT,
  p_amount INTEGER,
  p_description TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_limit INTEGER;
  v_new_limit INTEGER;
  v_is_company_admin BOOLEAN;
BEGIN
  -- Check if user is company admin from ACT
  SELECT EXISTS (
    SELECT 1 FROM public.brand_users bu
    JOIN public.brands b ON bu.brand_id = b.id
    WHERE bu.user_id = auth.uid()
      AND bu.role = 'company_admin'
      AND b.id = 'act'
  ) INTO v_is_company_admin;

  IF NOT v_is_company_admin THEN
    RAISE EXCEPTION 'Only Company Admins from ACT can top up quotas';
  END IF;

  -- Get current limit
  SELECT 
    CASE 
      WHEN p_quota_type = 'prompt_tokens' THEN prompt_tokens_limit
      WHEN p_quota_type = 'image_generation' THEN image_generation_limit
      WHEN p_quota_type = 'workflow_executions' THEN workflow_executions_limit
    END
  INTO v_current_limit
  FROM public.brand_quotas
  WHERE brand_id = p_brand_id;

  v_new_limit := v_current_limit + p_amount;

  -- Update quota limit
  UPDATE public.brand_quotas
  SET 
    prompt_tokens_limit = CASE WHEN p_quota_type = 'prompt_tokens' THEN v_new_limit ELSE prompt_tokens_limit END,
    image_generation_limit = CASE WHEN p_quota_type = 'image_generation' THEN v_new_limit ELSE image_generation_limit END,
    workflow_executions_limit = CASE WHEN p_quota_type = 'workflow_executions' THEN v_new_limit ELSE workflow_executions_limit END,
    last_topped_up_at = NOW(),
    last_topped_up_by = auth.uid(),
    updated_at = NOW()
  WHERE brand_id = p_brand_id;

  -- Log transaction
  INSERT INTO public.quota_transactions (
    brand_id,
    transaction_type,
    quota_type,
    amount,
    previous_value,
    new_value,
    performed_by,
    description
  ) VALUES (
    p_brand_id,
    'topup',
    p_quota_type,
    p_amount,
    v_current_limit,
    v_new_limit,
    auth.uid(),
    p_description
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create default quota for ACT brand
INSERT INTO public.brand_quotas (brand_id, prompt_tokens_limit, image_generation_limit, workflow_executions_limit)
VALUES ('act', 1000000, 1000, 10000) -- 1M tokens, 1k images, 10k workflows for ACT
ON CONFLICT (brand_id) DO NOTHING;

-- 7. Trigger to create quota record when new brand is created
CREATE OR REPLACE FUNCTION public.create_default_quota_for_brand()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.brand_quotas (brand_id)
  VALUES (NEW.id)
  ON CONFLICT (brand_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_brand_quota
  AFTER INSERT ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_quota_for_brand();
