-- Fix messages INSERT policy to properly allow write access for shared users
-- The issue: shared users with write permission couldn't insert messages

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create messages in accessible conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.messages;

-- Create updated INSERT policy that checks for write permission on shares
CREATE POLICY "Users can create messages in accessible conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE 
        -- Owner's own conversations (always can write)
        user_id = auth.uid()
        OR
        -- Conversations shared with user via conversation_shares with WRITE permission
        EXISTS (
          SELECT 1 FROM public.conversation_shares cs
          WHERE cs.conversation_id = conversations.id
            AND cs.shared_with = auth.uid()
            AND cs.status = 'accepted'
            AND cs.permission = 'write'
        )
    )
  );

-- Also ensure SELECT policy is correct
DROP POLICY IF EXISTS "Users can view messages from accessible conversations" ON public.messages;

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
        -- Conversations shared with user via conversation_shares (any permission)
        EXISTS (
          SELECT 1 FROM public.conversation_shares cs
          WHERE cs.conversation_id = conversations.id
            AND cs.shared_with = auth.uid()
            AND cs.status = 'accepted'
        )
    )
  );

COMMENT ON POLICY "Users can create messages in accessible conversations" ON public.messages IS 
  'Allows inserting messages in: 1) own conversations, 2) conversations shared with write permission';
