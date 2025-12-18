-- Create project_files table for storing documents that provide context to AI chats
-- Files are stored in Supabase Storage, metadata stored here

CREATE TABLE IF NOT EXISTS public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  brand_id TEXT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- File metadata
  name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Path in storage bucket
  file_type TEXT NOT NULL, -- MIME type
  file_size INTEGER NOT NULL, -- Size in bytes
  
  -- Processing status for AI context
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  extracted_text TEXT, -- Extracted/parsed content for AI context
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT file_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT positive_file_size CHECK (file_size > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON public.project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_brand_id ON public.project_files(brand_id);
CREATE INDEX IF NOT EXISTS idx_project_files_user_id ON public.project_files(user_id);
CREATE INDEX IF NOT EXISTS idx_project_files_status ON public.project_files(status);

-- Enable RLS
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_files
-- Users can view files in projects they have access to (within their brand)
CREATE POLICY "Users can view project files in their brand"
  ON public.project_files
  FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
    )
  );

-- Users can upload files to their own projects
CREATE POLICY "Users can upload files to their projects"
  ON public.project_files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

-- Users can update their own files
CREATE POLICY "Users can update their own files"
  ON public.project_files
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own files
CREATE POLICY "Users can delete their own files"
  ON public.project_files
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create storage bucket for project files if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-files',
  'project-files',
  false,
  52428800, -- 50MB limit
  ARRAY[
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/pdf',
    'application/json',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for project-files bucket
CREATE POLICY "Users can upload project files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-files' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view project files in their brand"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'project-files' AND
    (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM public.projects p
      JOIN public.brand_users bu ON bu.brand_id = p.brand_id
      WHERE bu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own project files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'project-files' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.projects WHERE user_id = auth.uid()
    )
  );

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_project_files_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_project_files_updated_at ON public.project_files;
CREATE TRIGGER update_project_files_updated_at
  BEFORE UPDATE ON public.project_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_files_updated_at();
