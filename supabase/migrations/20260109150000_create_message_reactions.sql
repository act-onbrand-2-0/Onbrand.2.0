-- Create message_reactions table for emoji reactions on messages
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Each user can only react once with the same emoji per message
  UNIQUE(message_id, user_id, emoji)
);

-- Create indexes for efficient queries
CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON message_reactions(user_id);

-- Enable RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can see reactions on messages they have access to
-- For simplicity, allow all authenticated users to see reactions (they already need message access)
CREATE POLICY "Users can view reactions on accessible messages"
  ON message_reactions FOR SELECT
  TO authenticated
  USING (true);

-- Users can add their own reactions
CREATE POLICY "Users can add their own reactions"
  ON message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions"
  ON message_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
