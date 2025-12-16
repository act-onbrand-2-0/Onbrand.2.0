-- Fix messages table schema to match expected structure
-- The original migration may not have created the table correctly

-- Check if messages table exists with wrong schema and recreate
DO $$
BEGIN
  -- Check if conversation_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' 
    AND column_name = 'conversation_id'
    AND table_schema = 'public'
  ) THEN
    -- Drop the old table if it exists but has wrong schema
    DROP TABLE IF EXISTS public.messages CASCADE;
    
    -- Recreate messages table with correct schema
    CREATE TABLE public.messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tokens_used INTEGER DEFAULT 0,
      model TEXT NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      CONSTRAINT valid_role CHECK (role IN ('system', 'user', 'assistant', 'function')),
      CONSTRAINT positive_message_tokens CHECK (tokens_used >= 0),
      CONSTRAINT non_empty_content CHECK (LENGTH(content) > 0)
    );

    -- Recreate indexes
    CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
    CREATE INDEX idx_messages_created_at ON public.messages(created_at);
    CREATE INDEX idx_messages_role ON public.messages(role);

    -- Enable RLS
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

    -- Recreate RLS policies
    CREATE POLICY "Users can view messages from their brand conversations"
      ON public.messages FOR SELECT
      USING (
        conversation_id IN (
          SELECT id FROM public.conversations
          WHERE brand_id IN (
            SELECT brand_id FROM public.brand_users
            WHERE user_id = auth.uid()
          )
        )
      );

    CREATE POLICY "Users can create messages in their conversations"
      ON public.messages FOR INSERT
      WITH CHECK (
        conversation_id IN (
          SELECT id FROM public.conversations
          WHERE brand_id IN (
            SELECT brand_id FROM public.brand_users
            WHERE user_id = auth.uid()
          )
        )
      );

    CREATE POLICY "Users can update messages in their conversations"
      ON public.messages FOR UPDATE
      USING (
        conversation_id IN (
          SELECT id FROM public.conversations
          WHERE brand_id IN (
            SELECT brand_id FROM public.brand_users
            WHERE user_id = auth.uid()
          )
        )
      );

    CREATE POLICY "Users can delete messages in their conversations"
      ON public.messages FOR DELETE
      USING (
        conversation_id IN (
          SELECT id FROM public.conversations
          WHERE brand_id IN (
            SELECT brand_id FROM public.brand_users
            WHERE user_id = auth.uid()
          )
        )
      );

    -- Grant permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
  END IF;
END $$;
