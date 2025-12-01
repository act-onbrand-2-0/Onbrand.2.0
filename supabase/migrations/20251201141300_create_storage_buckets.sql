-- Create storage buckets for brand assets
-- Each brand will have their files organized in folders within these buckets

-- 1. Brand Documents bucket (PDFs, documents for RAG)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-documents',
  'brand-documents',
  false, -- Private by default
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Brand Images bucket (logos, photos, marketing images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-images',
  'brand-images',
  true, -- Public for web display
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Brand Assets bucket (logos, fonts, design files)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-assets',
  'brand-assets',
  false, -- Private by default
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'application/zip', 'font/ttf', 'font/otf', 'font/woff', 'font/woff2']
)
ON CONFLICT (id) DO NOTHING;

-- 4. Training Data bucket (for LoRA training images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'training-data',
  'training-data',
  false, -- Private
  10485760, -- 10MB per image
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 5. Generated Content bucket (AI-generated images, content exports)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-content',
  'generated-content',
  false, -- Private
  20971520, -- 20MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
-- Pattern: Files are organized as {brand_id}/{category}/{filename}

-- ============================================
-- BRAND DOCUMENTS POLICIES
-- ============================================

-- Allow users to view documents from their brands
CREATE POLICY "Users can view brand documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'brand-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
  )
);

-- Allow users to upload documents to their brands
CREATE POLICY "Users can upload brand documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'brand-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
  )
);

-- Allow editors to update documents in their brands
CREATE POLICY "Editors can update brand documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'brand-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT brand_id FROM public.brand_users 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
  )
);

-- Allow admins to delete documents from their brands
CREATE POLICY "Admins can delete brand documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'brand-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT brand_id FROM public.brand_users 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- ============================================
-- BRAND IMAGES POLICIES (Public bucket)
-- ============================================

-- Allow anyone to view brand images (public bucket)
CREATE POLICY "Anyone can view brand images"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-images');

-- Allow users to upload images to their brands
CREATE POLICY "Users can upload brand images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'brand-images' AND
  (storage.foldername(name))[1] IN (
    SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
  )
);

-- Allow editors to update images
CREATE POLICY "Editors can update brand images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'brand-images' AND
  (storage.foldername(name))[1] IN (
    SELECT brand_id FROM public.brand_users 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
  )
);

-- Allow admins to delete images
CREATE POLICY "Admins can delete brand images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'brand-images' AND
  (storage.foldername(name))[1] IN (
    SELECT brand_id FROM public.brand_users 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- ============================================
-- BRAND ASSETS POLICIES
-- ============================================

-- Allow users to view assets from their brands
CREATE POLICY "Users can view brand assets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'brand-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
  )
);

-- Allow users to upload assets
CREATE POLICY "Users can upload brand assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'brand-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
  )
);

-- Allow editors to update assets
CREATE POLICY "Editors can update brand assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'brand-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT brand_id FROM public.brand_users 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
  )
);

-- Allow admins to delete assets
CREATE POLICY "Admins can delete brand assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'brand-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT brand_id FROM public.brand_users 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- ============================================
-- TRAINING DATA POLICIES
-- ============================================

-- Allow users to view training data from their brands
CREATE POLICY "Users can view training data"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'training-data' AND
  (storage.foldername(name))[1] IN (
    SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
  )
);

-- Allow users to upload training data
CREATE POLICY "Users can upload training data"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'training-data' AND
  (storage.foldername(name))[1] IN (
    SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
  )
);

-- Allow admins to delete training data
CREATE POLICY "Admins can delete training data"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'training-data' AND
  (storage.foldername(name))[1] IN (
    SELECT brand_id FROM public.brand_users 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- ============================================
-- GENERATED CONTENT POLICIES
-- ============================================

-- Allow users to view generated content from their brands
CREATE POLICY "Users can view generated content"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'generated-content' AND
  (storage.foldername(name))[1] IN (
    SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
  )
);

-- Allow service role to insert generated content
CREATE POLICY "Service can upload generated content"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'generated-content' AND
  auth.role() = 'service_role'
);

-- Allow admins to delete generated content
CREATE POLICY "Admins can delete generated content"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'generated-content' AND
  (storage.foldername(name))[1] IN (
    SELECT brand_id FROM public.brand_users 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);
