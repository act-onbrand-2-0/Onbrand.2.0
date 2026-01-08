-- Add collaborative chat support
-- This migration adds user_id to messages and permission levels to conversation_shares

-- 1. Add user_id column to messages table to track who sent each message
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);

-- 2. Add permission column to conversation_shares (read = view only, write = can send messages)
ALTER TABLE public.conversation_shares 
ADD COLUMN IF NOT EXISTS permission TEXT NOT NULL DEFAULT 'read' 
CHECK (permission IN ('read', 'write'));

-- Add index for permission-based queries
CREATE INDEX IF NOT EXISTS idx_conversation_shares_permission ON public.conversation_shares(permission);

-- 3. Update messages INSERT policy to allow collaborative chat writes
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
        -- Shared conversations from their brand (legacy visibility flag)
        (
          c.visibility = 'shared'
          AND c.brand_id IN (
            SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
          )
        )
        OR
        -- Conversations in shared PROJECTS (collaborative by default)
        EXISTS (
          SELECT 1 FROM public.project_shares ps
          WHERE ps.project_id = c.project_id
            AND ps.shared_with = auth.uid()
            AND ps.status = 'accepted'
        )
        OR
        -- Conversations shared with WRITE permission (collaborative chats)
        EXISTS (
          SELECT 1 FROM public.conversation_shares cs
          WHERE cs.conversation_id = c.id
            AND cs.shared_with = auth.uid()
            AND cs.status = 'accepted'
            AND cs.permission = 'write'
        )
    )
  );

-- 4. Add user_name to the metadata or create a view for messages with user info
-- We'll create a function to get user display name
CREATE OR REPLACE FUNCTION public.get_user_display_name(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  display_name TEXT;
BEGIN
  SELECT COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    SPLIT_PART(email, '@', 1),
    'Unknown User'
  ) INTO display_name
  FROM auth.users
  WHERE id = user_uuid;
  
  RETURN COALESCE(display_name, 'Unknown User');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create a view for messages with user details (for collaborative chats)
CREATE OR REPLACE VIEW public.messages_with_users AS
SELECT 
  m.id,
  m.conversation_id,
  m.role,
  m.content,
  m.tokens_used,
  m.model,
  m.metadata,
  m.created_at,
  m.user_id,
  CASE 
    WHEN m.role = 'user' AND m.user_id IS NOT NULL THEN public.get_user_display_name(m.user_id)
    WHEN m.role = 'user' THEN 'User'
    WHEN m.role = 'assistant' THEN 'Assistant'
    ELSE m.role
  END AS sender_name,
  CASE 
    WHEN m.role = 'user' AND m.user_id IS NOT NULL THEN (
      SELECT email FROM auth.users WHERE id = m.user_id
    )
    ELSE NULL
  END AS sender_email
FROM public.messages m;

-- Grant access to the view
GRANT SELECT ON public.messages_with_users TO authenticated;

-- 6. Function to check if a conversation is collaborative (has any write shares)
CREATE OR REPLACE FUNCTION public.is_collaborative_conversation(conv_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_shares
    WHERE conversation_id = conv_id
      AND permission = 'write'
      AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update conversation_shares to track when permission was changed
ALTER TABLE public.conversation_shares 
ADD COLUMN IF NOT EXISTS permission_changed_at TIMESTAMPTZ;

-- Comments for documentation
COMMENT ON COLUMN public.messages.user_id IS 'The user who sent this message (for user role messages in collaborative chats)';
COMMENT ON COLUMN public.conversation_shares.permission IS 'Access level: read = view only, write = can send messages (collaborative)';
COMMENT ON FUNCTION public.is_collaborative_conversation IS 'Returns true if the conversation has any users with write permission';
COMMENT ON VIEW public.messages_with_users IS 'Messages view with sender name and email for display in collaborative chats';
