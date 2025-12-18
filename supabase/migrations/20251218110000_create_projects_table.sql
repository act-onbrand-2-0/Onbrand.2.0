-- Create projects table for organizing conversations into folders
-- Projects are scoped to a brand and optionally to a user

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id TEXT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1', -- Default indigo color for project icon
  icon TEXT DEFAULT 'folder', -- Lucide icon name
  is_default BOOLEAN DEFAULT FALSE, -- One default project per user/brand
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT project_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT valid_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Add project_id to conversations (nullable for backward compatibility)
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_brand_id ON public.projects(brand_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_brand_user ON public.projects(brand_id, user_id);
CREATE INDEX IF NOT EXISTS idx_projects_archived ON public.projects(archived) WHERE NOT archived;
CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON public.conversations(project_id);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
-- Users can view projects in their brand
CREATE POLICY "Users can view projects in their brand"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
    )
  );

-- Users can create projects in their brand
CREATE POLICY "Users can create projects in their brand"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    brand_id IN (
      SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
    )
  );

-- Users can update their own projects
CREATE POLICY "Users can update their own projects"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own projects
CREATE POLICY "Users can delete their own projects"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to create a default project for new users
CREATE OR REPLACE FUNCTION public.create_default_project_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.projects (brand_id, user_id, name, description, is_default)
  VALUES (NEW.brand_id, NEW.user_id, 'General', 'Default project for uncategorized chats', TRUE)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to auto-create default project when user joins a brand
DROP TRIGGER IF EXISTS create_default_project_trigger ON public.brand_users;
CREATE TRIGGER create_default_project_trigger
  AFTER INSERT ON public.brand_users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_project_for_user();

-- Create default projects for existing brand_users
INSERT INTO public.projects (brand_id, user_id, name, description, is_default)
SELECT DISTINCT brand_id, user_id, 'General', 'Default project for uncategorized chats', TRUE
FROM public.brand_users
WHERE NOT EXISTS (
  SELECT 1 FROM public.projects p 
  WHERE p.brand_id = brand_users.brand_id 
  AND p.user_id = brand_users.user_id 
  AND p.is_default = TRUE
)
ON CONFLICT DO NOTHING;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_project_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_updated_at();
