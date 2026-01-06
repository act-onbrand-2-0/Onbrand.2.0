-- Create project_shares table for sharing folders/projects
CREATE TABLE IF NOT EXISTS public.project_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id TEXT REFERENCES public.brands(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, shared_with)
);

-- Enable RLS
ALTER TABLE public.project_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_shares
CREATE POLICY "Users can view their own shares"
  ON public.project_shares FOR SELECT
  TO authenticated
  USING (shared_by = auth.uid() OR shared_with = auth.uid());

CREATE POLICY "Users can create shares for their projects"
  ON public.project_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    shared_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update shares they received"
  ON public.project_shares FOR UPDATE
  TO authenticated
  USING (shared_with = auth.uid())
  WITH CHECK (shared_with = auth.uid());

CREATE POLICY "Users can delete shares they created or received"
  ON public.project_shares FOR DELETE
  TO authenticated
  USING (shared_by = auth.uid() OR shared_with = auth.uid());

-- Update projects RLS to allow access to shared projects
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view own and shared projects" ON public.projects;

CREATE POLICY "Users can view own and shared projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    -- User's own projects
    user_id = auth.uid()
    OR
    -- Projects shared with user (accepted only)
    EXISTS (
      SELECT 1 FROM public.project_shares ps
      WHERE ps.project_id = id
        AND ps.shared_with = auth.uid()
        AND ps.status = 'accepted'
    )
  );

-- Update conversations RLS to allow access to conversations in shared projects
DROP POLICY IF EXISTS "Users can view own and shared conversations" ON public.conversations;

CREATE POLICY "Users can view own and shared conversations"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (
    -- User's own conversations
    (user_id = auth.uid())
    OR
    -- Shared conversations from their brand (legacy visibility flag)
    (
      visibility = 'shared'
      AND brand_id IN (
        SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
      )
    )
    OR
    -- Conversations shared directly with user
    EXISTS (
      SELECT 1 FROM public.conversation_shares cs
      WHERE cs.conversation_id = id
        AND cs.shared_with = auth.uid()
        AND cs.status = 'accepted'
    )
    OR
    -- Conversations in projects shared with user
    EXISTS (
      SELECT 1 FROM public.project_shares ps
      WHERE ps.project_id = project_id
        AND ps.shared_with = auth.uid()
        AND ps.status = 'accepted'
    )
  );

-- Update messages RLS to allow access to messages in shared projects
DROP POLICY IF EXISTS "Users can view messages from accessible conversations" ON public.messages;

CREATE POLICY "Users can view messages from accessible conversations"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT c.id FROM public.conversations c
      WHERE 
        -- Owner's own conversations
        c.user_id = auth.uid()
        OR
        -- Shared conversations from their brand
        (
          c.visibility = 'shared'
          AND c.brand_id IN (
            SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
          )
        )
        OR
        -- Conversations shared directly
        EXISTS (
          SELECT 1 FROM public.conversation_shares cs
          WHERE cs.conversation_id = c.id
            AND cs.shared_with = auth.uid()
            AND cs.status = 'accepted'
        )
        OR
        -- Conversations in shared projects
        EXISTS (
          SELECT 1 FROM public.project_shares ps
          WHERE ps.project_id = c.project_id
            AND ps.shared_with = auth.uid()
            AND ps.status = 'accepted'
        )
    )
  );

-- Update messages INSERT policy for shared projects (collaborative)
DROP POLICY IF EXISTS "Users can create messages in accessible conversations" ON public.messages;

CREATE POLICY "Users can create messages in accessible conversations"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT c.id FROM public.conversations c
      WHERE 
        -- Owner's own conversations
        c.user_id = auth.uid()
        OR
        -- Shared conversations from their brand
        (
          c.visibility = 'shared'
          AND c.brand_id IN (
            SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
          )
        )
        OR
        -- Conversations in shared PROJECTS only (not single shared chats)
        EXISTS (
          SELECT 1 FROM public.project_shares ps
          WHERE ps.project_id = c.project_id
            AND ps.shared_with = auth.uid()
            AND ps.status = 'accepted'
        )
        -- NOTE: Single shared conversations (via conversation_shares) are READ-ONLY
    )
  );

-- Allow creating conversations in shared projects
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations in own or shared projects" ON public.conversations;

CREATE POLICY "Users can create conversations in own or shared projects"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- No project (general conversation)
      project_id IS NULL
      OR
      -- Own project
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND p.user_id = auth.uid()
      )
      OR
      -- Shared project
      EXISTS (
        SELECT 1 FROM public.project_shares ps
        WHERE ps.project_id = project_id
          AND ps.shared_with = auth.uid()
          AND ps.status = 'accepted'
      )
    )
  );

-- Create notification trigger for project shares
CREATE OR REPLACE FUNCTION public.notify_on_project_share()
RETURNS TRIGGER AS $$
DECLARE
  project_title TEXT;
  sharer_email TEXT;
BEGIN
  -- Get project name
  SELECT name INTO project_title
  FROM public.projects
  WHERE id = NEW.project_id;

  -- Get sharer's email
  SELECT email INTO sharer_email
  FROM auth.users
  WHERE id = NEW.shared_by;

  -- Create notification for the recipient
  INSERT INTO public.notifications (
    user_id,
    brand_id,
    type,
    title,
    message,
    project_id,
    share_id,
    triggered_by
  ) VALUES (
    NEW.shared_with,
    NEW.brand_id,
    'project_shared',
    'Folder shared with you',
    COALESCE(sharer_email, 'Someone') || ' shared the folder "' || COALESCE(project_title, 'Untitled') || '" with you',
    NEW.project_id,
    NEW.id,
    NEW.shared_by
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_project_share_created ON public.project_shares;
CREATE TRIGGER on_project_share_created
  AFTER INSERT ON public.project_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_project_share();

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_project_shares_shared_with ON public.project_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_project_shares_project_id ON public.project_shares(project_id);
