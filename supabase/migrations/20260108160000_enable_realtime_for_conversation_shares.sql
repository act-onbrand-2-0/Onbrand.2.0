-- Enable Realtime for the conversation_shares table
-- This allows conversation owners to detect when shares are accepted/updated
-- Needed for collaborative chat detection in real-time

ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_shares;

COMMENT ON TABLE public.conversation_shares IS 'Tracks selective sharing of conversations with specific team members. Realtime enabled for collaborative chat detection.';
