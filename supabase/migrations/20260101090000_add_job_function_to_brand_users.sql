-- Add job_function column to brand_users and update new-user trigger to store it

ALTER TABLE public.brand_users
ADD COLUMN IF NOT EXISTS job_function TEXT;

-- Recreate function to ensure job_function from metadata is captured
CREATE OR REPLACE FUNCTION public.handle_new_user_with_auto_brand()
RETURNS TRIGGER AS $$
DECLARE
  email_domain TEXT;
  brand_slug TEXT;
  brand_display_name TEXT;
  is_owner BOOLEAN := false;
  -- Public email domains are routed to 'act' brand for testing
  public_domains TEXT[] := ARRAY[
    'gmail.com','googlemail.com',
    'yahoo.com','yahoo.co.uk','ymail.com',
    'hotmail.com','hotmail.co.uk','live.com','outlook.com',
    'icloud.com','me.com','mac.com',
    'aol.com','aim.com',
    'protonmail.com','proton.me',
    'mail.com','zoho.com',
    'inbox.com','fastmail.com'
  ];
BEGIN
  -- Extract domain from email
  email_domain := split_part(NEW.email, '@', 2);

  -- Determine brand
  IF email_domain = ANY(public_domains) THEN
    brand_slug := 'act';
    is_owner := false;
  ELSE
    brand_slug := split_part(email_domain, '.', 1);
    brand_display_name := initcap(brand_slug);

    -- Create brand if it does not exist
    INSERT INTO public.brands (id, name, description, created_at)
    VALUES (
      brand_slug,
      brand_display_name,
      'Auto-created from ' || email_domain,
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- First user for the brand becomes owner
    is_owner := NOT EXISTS (SELECT 1 FROM public.brand_users WHERE brand_id = brand_slug);
  END IF;

  -- Assign user to brand, capture role and job_function from metadata when present
  INSERT INTO public.brand_users (user_id, brand_id, role, job_function)
  VALUES (
    NEW.id,
    brand_slug,
    CASE 
      WHEN is_owner THEN 'owner'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    END,
    NULLIF(NEW.raw_user_meta_data->>'job_function', '')
  )
  ON CONFLICT (user_id, brand_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_with_auto_brand();


