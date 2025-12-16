-- Create brand-assets storage bucket for extracted logos and brand images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-assets',
  'brand-assets',
  true,
  52428800, -- 50MB limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Public read access for brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to brand-assets" ON storage.objects;

-- Allow public read access to brand-assets bucket
CREATE POLICY "Public read access for brand-assets"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'brand-assets');

-- Allow authenticated users to upload to their brand's folder
CREATE POLICY "Authenticated users can upload brand assets"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'brand-assets');

-- Allow service role full access
CREATE POLICY "Service role full access to brand-assets"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'brand-assets');
