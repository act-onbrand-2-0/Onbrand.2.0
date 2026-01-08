-- Fix messages RLS to support cross-brand collaborative sharing
-- Issue: Users from different brands with valid conversation_shares couldn't INSERT messages
-- The policy was too restrictive - it needs to check shares directly, not through conversations

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create messages in accessible conversations" ON public.messages;

-- Create a simpler, more direct INSERT policy that checks shares properly
CREATE POLICY "Users can create messages in accessible conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    -- Option 1: User owns the conversation
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND c.user_id = auth.uid()
    )
    OR
    -- Option 2: User has an accepted share with write permission (works across brands)
    EXISTS (
      SELECT 1 FROM public.conversation_shares cs
      WHERE cs.conversation_id = messages.conversation_id
        AND cs.shared_with = auth.uid()
        AND cs.status = 'accepted'
        AND cs.permission = 'write'
    )
  );

-- Also update SELECT policy to be more direct (for cross-brand support)
DROP POLICY IF EXISTS "Users can view messages from accessible conversations" ON public.messages;

CREATE POLICY "Users can view messages from accessible conversations"
  ON public.messages FOR SELECT
  USING (
    -- Option 1: User owns the conversation
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND c.user_id = auth.uid()
    )
    OR
    -- Option 2: User has an accepted share (any permission - read or write)
    EXISTS (
      SELECT 1 FROM public.conversation_shares cs
      WHERE cs.conversation_id = messages.conversation_id
        AND cs.shared_with = auth.uid()
        AND cs.status = 'accepted'
    )
  );

COMMENT ON POLICY "Users can create messages in accessible conversations" ON public.messages IS 
  'Allows inserting messages if: 1) user owns the conversation, or 2) user has an accepted share with write permission (supports cross-brand sharing)';

COMMENT ON POLICY "Users can view messages from accessible conversations" ON public.messages IS 
  'Allows viewing messages if: 1) user owns the conversation, or 2) user has an accepted share (supports cross-brand sharing)';
