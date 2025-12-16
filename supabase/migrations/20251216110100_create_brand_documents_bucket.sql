-- Create storage bucket for brand documents (PDFs, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-documents',
  'brand-documents',
  true,  -- Public bucket (uploads still controlled by API)
  52428800,  -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for brand-documents bucket
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can upload to their brand folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their brand documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete brand documents" ON storage.objects;
DROP POLICY IF EXISTS "Service role has full access to brand documents" ON storage.objects;

-- Allow authenticated users to upload to their brand's folder
CREATE POLICY "Users can upload to their brand folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
  )
);

-- Allow users to read their brand's documents
CREATE POLICY "Users can read their brand documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'brand-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
  )
);

-- Allow admins to delete brand documents
CREATE POLICY "Admins can delete brand documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'brand-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT brand_id FROM public.brand_users 
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
);

-- Allow service role full access
CREATE POLICY "Service role has full access to brand documents"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'brand-documents')
WITH CHECK (bucket_id = 'brand-documents');
