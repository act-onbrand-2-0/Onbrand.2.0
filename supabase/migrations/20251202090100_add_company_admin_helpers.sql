-- Helper functions and utilities for managing Company Admins

-- Function to promote a user to Company Admin (for ACT brand only)
CREATE OR REPLACE FUNCTION public.set_company_admin(
  p_user_id UUID,
  p_email TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_brand_user_exists BOOLEAN;
BEGIN
  -- Check if user already exists in ACT brand
  SELECT EXISTS (
    SELECT 1 FROM public.brand_users
    WHERE user_id = p_user_id AND brand_id = 'act'
  ) INTO v_brand_user_exists;

  IF v_brand_user_exists THEN
    -- Update existing record to company_admin
    UPDATE public.brand_users
    SET role = 'company_admin', updated_at = NOW()
    WHERE user_id = p_user_id AND brand_id = 'act';
  ELSE
    -- Insert new record with company_admin role
    INSERT INTO public.brand_users (user_id, brand_id, role)
    VALUES (p_user_id, 'act', 'company_admin');
  END IF;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to set company admin: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove Company Admin role (demote to owner)
CREATE OR REPLACE FUNCTION public.remove_company_admin(
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Update role to owner instead of deleting
  UPDATE public.brand_users
  SET role = 'owner', updated_at = NOW()
  WHERE user_id = p_user_id AND brand_id = 'act' AND role = 'company_admin';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User is not a company admin';
  END IF;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to remove company admin: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to list all Company Admins
CREATE OR REPLACE FUNCTION public.list_company_admins()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bu.user_id,
    u.email,
    u.raw_user_meta_data->>'full_name' as full_name,
    bu.created_at
  FROM public.brand_users bu
  JOIN auth.users u ON u.id = bu.user_id
  WHERE bu.brand_id = 'act' 
    AND bu.role = 'company_admin'
  ORDER BY bu.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is Company Admin
CREATE OR REPLACE FUNCTION public.is_company_admin(
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.brand_users
    WHERE user_id = p_user_id 
      AND brand_id = 'act' 
      AND role = 'company_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policy: Only existing Company Admins can call set_company_admin
CREATE POLICY "Company admins can manage other admins"
  ON public.brand_users FOR UPDATE
  USING (
    brand_id = 'act' AND
    EXISTS (
      SELECT 1 FROM public.brand_users
      WHERE user_id = auth.uid()
        AND brand_id = 'act'
        AND role = 'company_admin'
    )
  );
