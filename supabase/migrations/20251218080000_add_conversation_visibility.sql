-- Add visibility column to conversations
-- Allows users to share chats with their brand team

ALTER TABLE public.conversations 
ADD COLUMN visibility TEXT DEFAULT 'private' 
CHECK (visibility IN ('private', 'shared'));

-- Create index for efficient filtering
CREATE INDEX idx_conversations_visibility ON public.conversations(visibility);

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view their brand conversations" ON public.conversations;

-- Create new SELECT policy with visibility logic
-- Users can see:
-- 1. Their own conversations (any visibility)
-- 2. Shared conversations from their brand
CREATE POLICY "Users can view own and shared brand conversations"
  ON public.conversations FOR SELECT
  USING (
    -- User's own conversations (private or shared)
    (user_id = auth.uid())
    OR
    -- Shared conversations from their brand
    (
      visibility = 'shared'
      AND brand_id IN (
        SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
      )
    )
  );

-- Add comment for documentation
COMMENT ON COLUMN public.conversations.visibility IS 'private = only owner can see, shared = all brand users can see';

-- Also update messages SELECT policy to respect visibility
DROP POLICY IF EXISTS "Users can view messages from their brand conversations" ON public.messages;

-- Users can see messages from:
-- 1. Their own conversations
-- 2. Shared conversations in their brand
CREATE POLICY "Users can view messages from accessible conversations"
  ON public.messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE 
        -- Owner's own conversations
        user_id = auth.uid()
        OR
        -- Shared conversations from their brand
        (
          visibility = 'shared'
          AND brand_id IN (
            SELECT brand_id FROM public.brand_users WHERE user_id = auth.uid()
          )
        )
    )
  );
