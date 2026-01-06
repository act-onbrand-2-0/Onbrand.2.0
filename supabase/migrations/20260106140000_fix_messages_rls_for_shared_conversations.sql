-- Fix messages RLS policy to allow access for users with accepted conversation shares
-- This complements the conversation_shares table created in 20251224120000

-- Drop existing messages SELECT policy
DROP POLICY IF EXISTS "Users can view messages from accessible conversations" ON public.messages;

-- Create updated policy that includes shared conversations via conversation_shares
CREATE POLICY "Users can view messages from accessible conversations"
  ON public.messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE 
        -- Owner's own conversations
        user_id = auth.uid()
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
          WHERE cs.conversation_id = conversations.id
            AND cs.shared_with = auth.uid()
            AND cs.status = 'accepted'
        )
    )
  );

-- Also update the INSERT policy for messages to allow shared users to reply
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.messages;

CREATE POLICY "Users can create messages in accessible conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE 
        -- Owner's own conversations
        user_id = auth.uid()
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
          WHERE cs.conversation_id = conversations.id
            AND cs.shared_with = auth.uid()
            AND cs.status = 'accepted'
        )
    )
  );

-- Comment for documentation
COMMENT ON POLICY "Users can view messages from accessible conversations" ON public.messages IS 
  'Allows viewing messages from: 1) own conversations, 2) brand-shared conversations, 3) conversations shared via conversation_shares';
