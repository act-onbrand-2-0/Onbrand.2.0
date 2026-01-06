-- Fix conversations RLS policy to allow access for users with accepted shares
-- This ensures non-team members can view shared conversations

-- Drop any existing SELECT policies on conversations
DROP POLICY IF EXISTS "Users can view their brand conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view own and shared brand conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view own and shared conversations" ON public.conversations;

-- Create the correct policy that includes accepted shares
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
    -- Conversations shared with user via conversation_shares (accepted only)
    EXISTS (
      SELECT 1 FROM public.conversation_shares cs
      WHERE cs.conversation_id = id
        AND cs.shared_with = auth.uid()
        AND cs.status = 'accepted'
    )
  );
