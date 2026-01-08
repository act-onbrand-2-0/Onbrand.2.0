-- Enable Realtime for the messages table (for collaborative chats)
-- This allows users to receive real-time updates when teammates send messages

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
