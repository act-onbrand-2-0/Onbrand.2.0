-- Add subdomain column to brands table for multi-tenant subdomain routing
-- This enables dynamic brand resolution via subdomains (e.g., ACT.onbrandai.app)

-- Add subdomain column
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE;

-- Add index for fast subdomain lookups
CREATE INDEX IF NOT EXISTS idx_brands_subdomain ON public.brands(subdomain);

-- Update existing brands with their subdomain (lowercase of name)
UPDATE public.brands SET subdomain = LOWER(name) WHERE subdomain IS NULL;

-- Make subdomain NOT NULL after setting defaults
ALTER TABLE public.brands ALTER COLUMN subdomain SET NOT NULL;

-- Add custom_domain column for brands that want their own domain (e.g., brand.com)
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;

-- Add is_active flag to enable/disable brands
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add settings JSONB for flexible brand configuration
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Comment on columns
COMMENT ON COLUMN public.brands.subdomain IS 'Subdomain for accessing this brand (e.g., "act" for act.onbrandai.app)';
COMMENT ON COLUMN public.brands.custom_domain IS 'Optional custom domain for the brand (e.g., "mybrand.com")';
COMMENT ON COLUMN public.brands.is_active IS 'Whether this brand is active and accessible';
COMMENT ON COLUMN public.brands.settings IS 'JSON settings for brand-specific configuration';
