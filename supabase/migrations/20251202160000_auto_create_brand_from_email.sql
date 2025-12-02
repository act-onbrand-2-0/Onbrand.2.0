-- Enhanced auto-brand creation function
-- Automatically creates brands from email domains during signup

CREATE OR REPLACE FUNCTION public.handle_new_user_with_auto_brand()
RETURNS TRIGGER AS $$
DECLARE
  email_domain TEXT;
  brand_slug TEXT;
  brand_display_name TEXT;
BEGIN
  -- Extract domain from email
  email_domain := split_part(NEW.email, '@', 2);
  
  -- Create brand slug from domain (remove .com, .nl, etc.)
  brand_slug := split_part(email_domain, '.', 1);
  
  -- Create display name (capitalize first letter)
  brand_display_name := initcap(brand_slug);
  
  -- Check if brand already exists, if not create it
  INSERT INTO public.brands (id, name, description, created_at)
  VALUES (
    brand_slug,
    brand_display_name,
    'Auto-created from ' || email_domain,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Assign user to the brand
  -- First user from a domain becomes owner, others become users
  INSERT INTO public.brand_users (user_id, brand_id, role)
  VALUES (
    NEW.id,
    brand_slug,
    CASE 
      WHEN NOT EXISTS (
        SELECT 1 FROM public.brand_users WHERE brand_id = brand_slug
      ) THEN 'owner'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    END
  )
  ON CONFLICT (user_id, brand_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_with_auto_brand();

-- Add comment
COMMENT ON FUNCTION public.handle_new_user_with_auto_brand IS 
'Automatically creates brand from email domain and assigns user. First user becomes owner.';
