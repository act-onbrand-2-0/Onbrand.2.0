-- Fix function search paths to prevent potential security issues

-- Fix update_conversation_timestamp function
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Get brand_id from user metadata, default to email domain
  INSERT INTO public.brand_users (user_id, brand_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'brand_id', 'act'),
    'user'
  )
  ON CONFLICT (user_id, brand_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;
