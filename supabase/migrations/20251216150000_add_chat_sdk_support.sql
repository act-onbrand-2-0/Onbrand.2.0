-- Migration: Add Chat SDK Support for Persistent Conversations
-- This migration adds tables compatible with Vercel AI Chat SDK (https://chat-sdk.dev)
-- while maintaining your existing brand-based architecture

-- ============================================================================
-- CHATS TABLE (replaces/extends conversations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id TEXT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  visibility VARCHAR(10) NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Custom fields for your ACT platform
  model TEXT DEFAULT 'gpt-4',
  system_prompt TEXT,
  settings JSONB DEFAULT '{
    "temperature": 0.7,
    "max_tokens": 2000,
    "top_p": 1.0
  }'::jsonb,
  total_tokens_used INTEGER DEFAULT 0,
  total_cost_usd DECIMAL(10, 6) DEFAULT 0,
  archived BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_model CHECK (
    model IN ('gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku')
  ),
  CONSTRAINT positive_tokens CHECK (total_tokens_used >= 0),
  CONSTRAINT positive_cost CHECK (total_cost_usd >= 0)
);

-- ============================================================================
-- CHAT MESSAGES TABLE (with message parts support)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'function', 'tool')),
  
  -- Chat SDK required fields
  parts JSON NOT NULL, -- Array of message parts: [{ type: 'text', text: '...' }, { type: 'image', image: '...' }]
  attachments JSON NOT NULL DEFAULT '[]'::json, -- Array of file attachments
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Custom fields for your platform
  tokens_used INTEGER DEFAULT 0,
  model TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT positive_message_tokens CHECK (tokens_used >= 0)
);

-- ============================================================================
-- VOTES TABLE (optional - for message feedback)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_votes (
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  is_upvoted BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (chat_id, message_id)
);

-- ============================================================================
-- DOCUMENTS TABLE (optional - for artifacts like code, images, sheets)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id TEXT REFERENCES public.brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  kind VARCHAR(10) NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'code', 'image', 'sheet')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  PRIMARY KEY (id, created_at)
);

-- ============================================================================
-- STREAMS TABLE (optional - for resumable streams)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Chats indexes
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_brand_id ON public.chats(brand_id);
CREATE INDEX IF NOT EXISTS idx_chats_brand_user ON public.chats(brand_id, user_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON public.chats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_last_message ON public.chats(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_archived ON public.chats(archived) WHERE NOT archived;
CREATE INDEX IF NOT EXISTS idx_chats_visibility ON public.chats(visibility) WHERE visibility = 'public';

-- Brand-scoped indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_chats_brand_user_last_message 
  ON public.chats(brand_id, user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_brand_archived 
  ON public.chats(brand_id, archived) WHERE NOT archived;
CREATE INDEX IF NOT EXISTS idx_chats_brand_visibility_created 
  ON public.chats(brand_id, visibility, created_at DESC);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON public.chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON public.chat_messages(role);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_chat_documents_chat_id ON public.chat_documents(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_documents_user_id ON public.chat_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_documents_brand_id ON public.chat_documents(brand_id);

-- Streams indexes
CREATE INDEX IF NOT EXISTS idx_chat_streams_chat_id ON public.chat_streams(chat_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update chat timestamp when message is added
CREATE OR REPLACE FUNCTION public.update_chat_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chats
  SET 
    updated_at = NOW(),
    last_message_at = NOW()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_on_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_timestamp();

-- Update chat tokens when message is added
CREATE OR REPLACE FUNCTION public.update_chat_tokens()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chats
  SET total_tokens_used = total_tokens_used + COALESCE(NEW.tokens_used, 0)
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_tokens
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_tokens();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Convert text content to message parts format
CREATE OR REPLACE FUNCTION public.text_to_message_parts(content_text TEXT)
RETURNS JSON AS $$
BEGIN
  RETURN json_build_array(
    json_build_object(
      'type', 'text',
      'text', content_text
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a new chat with quota check
CREATE OR REPLACE FUNCTION public.create_chat_with_quota_check(
  p_brand_id TEXT,
  p_user_id UUID,
  p_title TEXT,
  p_model TEXT DEFAULT 'gpt-4',
  p_system_prompt TEXT DEFAULT NULL,
  p_settings JSONB DEFAULT NULL,
  p_visibility VARCHAR DEFAULT 'private'
) RETURNS UUID AS $$
DECLARE
  v_chat_id UUID;
BEGIN
  -- Create the chat
  INSERT INTO public.chats (
    brand_id,
    user_id,
    title,
    model,
    system_prompt,
    settings,
    visibility
  ) VALUES (
    p_brand_id,
    p_user_id,
    p_title,
    p_model,
    p_system_prompt,
    COALESCE(p_settings, '{
      "temperature": 0.7,
      "max_tokens": 2000,
      "top_p": 1.0
    }'::jsonb),
    p_visibility
  ) RETURNING id INTO v_chat_id;

  RETURN v_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Save a chat message with message parts
CREATE OR REPLACE FUNCTION public.save_chat_message(
  p_chat_id UUID,
  p_role TEXT,
  p_parts JSON,
  p_attachments JSON DEFAULT '[]'::json,
  p_tokens_used INTEGER DEFAULT 0,
  p_model TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
  v_brand_id TEXT;
  v_quota_available BOOLEAN;
BEGIN
  -- Get brand_id from chat
  SELECT brand_id INTO v_brand_id
  FROM public.chats
  WHERE id = p_chat_id;

  IF v_brand_id IS NULL THEN
    RAISE EXCEPTION 'Chat not found';
  END IF;

  -- Check and use quota (only for assistant messages)
  IF p_role = 'assistant' AND p_tokens_used > 0 THEN
    SELECT check_and_use_quota(v_brand_id, 'prompt_tokens', p_tokens_used)
    INTO v_quota_available;

    IF NOT v_quota_available THEN
      RAISE EXCEPTION 'Insufficient quota for brand %', v_brand_id;
    END IF;
  END IF;

  -- Insert the message
  INSERT INTO public.chat_messages (
    chat_id,
    role,
    parts,
    attachments,
    tokens_used,
    model,
    metadata
  ) VALUES (
    p_chat_id,
    p_role,
    p_parts,
    p_attachments,
    p_tokens_used,
    p_model,
    p_metadata
  ) RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all messages for a chat (formatted for AI SDK)
CREATE OR REPLACE FUNCTION public.get_chat_messages(p_chat_id UUID)
RETURNS TABLE (
  id UUID,
  role VARCHAR,
  parts JSON,
  attachments JSON,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.role,
    cm.parts,
    cm.attachments,
    cm.created_at
  FROM public.chat_messages cm
  WHERE cm.chat_id = p_chat_id
  ORDER BY cm.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- BRAND VALIDATION FUNCTIONS
-- ============================================================================

-- Check if user has access to a brand
CREATE OR REPLACE FUNCTION public.user_has_brand_access(
  p_user_id UUID,
  p_brand_id TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.brand_users
    WHERE user_id = p_user_id
      AND brand_id = p_brand_id
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's role in a brand
CREATE OR REPLACE FUNCTION public.get_user_brand_role(
  p_user_id UUID,
  p_brand_id TEXT
) RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.brand_users
  WHERE user_id = p_user_id
    AND brand_id = p_brand_id
    AND status = 'active';
  
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate chat access with brand check
CREATE OR REPLACE FUNCTION public.validate_chat_access(
  p_user_id UUID,
  p_chat_id UUID
) RETURNS TABLE (
  has_access BOOLEAN,
  brand_id TEXT,
  user_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE as has_access,
    c.brand_id,
    bu.role as user_role
  FROM public.chats c
  INNER JOIN public.brand_users bu 
    ON bu.brand_id = c.brand_id 
    AND bu.user_id = p_user_id
    AND bu.status = 'active'
  WHERE c.id = p_chat_id
    AND (c.user_id = p_user_id OR c.visibility = 'public');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all chats for a user in a specific brand
CREATE OR REPLACE FUNCTION public.get_brand_chats(
  p_user_id UUID,
  p_brand_id TEXT,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  title TEXT,
  visibility VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE,
  last_message_at TIMESTAMP WITH TIME ZONE,
  total_tokens_used INTEGER,
  message_count BIGINT
) AS $$
BEGIN
  -- Validate brand access first
  IF NOT user_has_brand_access(p_user_id, p_brand_id) THEN
    RAISE EXCEPTION 'User does not have access to brand %', p_brand_id;
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.visibility,
    c.created_at,
    c.last_message_at,
    c.total_tokens_used,
    COUNT(cm.id) as message_count
  FROM public.chats c
  LEFT JOIN public.chat_messages cm ON cm.chat_id = c.id
  WHERE c.brand_id = p_brand_id
    AND c.user_id = p_user_id
    AND NOT c.archived
  GROUP BY c.id
  ORDER BY c.last_message_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate brand access before chat creation (trigger function)
CREATE OR REPLACE FUNCTION public.validate_chat_brand_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure user has access to the brand
  IF NOT EXISTS (
    SELECT 1 FROM public.brand_users
    WHERE user_id = NEW.user_id
      AND brand_id = NEW.brand_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'User does not have access to brand %', NEW.brand_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_chat_brand_access
  BEFORE INSERT ON public.chats
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_chat_brand_access();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_streams ENABLE ROW LEVEL SECURITY;

-- Chats policies
CREATE POLICY "Users can view their brand chats or public chats"
  ON public.chats FOR SELECT
  USING (
    user_id = auth.uid() OR
    visibility = 'public' OR
    brand_id IN (
      SELECT brand_id FROM public.brand_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chats for their brands"
  ON public.chats FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    brand_id IN (
      SELECT brand_id FROM public.brand_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own chats"
  ON public.chats FOR UPDATE
  USING (
    user_id = auth.uid() AND
    brand_id IN (
      SELECT brand_id FROM public.brand_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own chats"
  ON public.chats FOR DELETE
  USING (
    user_id = auth.uid() AND
    brand_id IN (
      SELECT brand_id FROM public.brand_users
      WHERE user_id = auth.uid()
    )
  );

-- Messages policies
CREATE POLICY "Users can view messages from accessible chats"
  ON public.chat_messages FOR SELECT
  USING (
    chat_id IN (
      SELECT id FROM public.chats
      WHERE user_id = auth.uid() OR
            visibility = 'public' OR
            brand_id IN (
              SELECT brand_id FROM public.brand_users
              WHERE user_id = auth.uid()
            )
    )
  );

CREATE POLICY "Users can create messages in their chats"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    chat_id IN (
      SELECT id FROM public.chats
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages in their chats"
  ON public.chat_messages FOR UPDATE
  USING (
    chat_id IN (
      SELECT id FROM public.chats
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages in their chats"
  ON public.chat_messages FOR DELETE
  USING (
    chat_id IN (
      SELECT id FROM public.chats
      WHERE user_id = auth.uid()
    )
  );

-- Votes policies
CREATE POLICY "Users can view votes for accessible chats"
  ON public.chat_votes FOR SELECT
  USING (
    chat_id IN (
      SELECT id FROM public.chats
      WHERE user_id = auth.uid() OR
            visibility = 'public' OR
            brand_id IN (
              SELECT brand_id FROM public.brand_users
              WHERE user_id = auth.uid()
            )
    )
  );

CREATE POLICY "Users can vote on messages in accessible chats"
  ON public.chat_votes FOR INSERT
  WITH CHECK (
    chat_id IN (
      SELECT id FROM public.chats
      WHERE user_id = auth.uid() OR
            visibility = 'public' OR
            brand_id IN (
              SELECT brand_id FROM public.brand_users
              WHERE user_id = auth.uid()
            )
    )
  );

CREATE POLICY "Users can update their votes"
  ON public.chat_votes FOR UPDATE
  USING (
    chat_id IN (
      SELECT id FROM public.chats
      WHERE user_id = auth.uid() OR
            brand_id IN (
              SELECT brand_id FROM public.brand_users
              WHERE user_id = auth.uid()
            )
    )
  );

-- Documents policies
CREATE POLICY "Users can view documents from their brands"
  ON public.chat_documents FOR SELECT
  USING (
    user_id = auth.uid() OR
    brand_id IN (
      SELECT brand_id FROM public.brand_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create documents for their brands"
  ON public.chat_documents FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    brand_id IN (
      SELECT brand_id FROM public.brand_users
      WHERE user_id = auth.uid()
    )
  );

-- Streams policies
CREATE POLICY "Users can view streams from their chats"
  ON public.chat_streams FOR SELECT
  USING (
    chat_id IN (
      SELECT id FROM public.chats
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create streams for their chats"
  ON public.chat_streams FOR INSERT
  WITH CHECK (
    chat_id IN (
      SELECT id FROM public.chats
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_votes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_streams TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.chats IS 'Chat sessions compatible with Vercel AI Chat SDK';
COMMENT ON TABLE public.chat_messages IS 'Chat messages with message parts support for multimodal content';
COMMENT ON TABLE public.chat_votes IS 'User feedback on chat messages (upvote/downvote)';
COMMENT ON TABLE public.chat_documents IS 'Artifacts generated during chat (code, images, sheets)';
COMMENT ON TABLE public.chat_streams IS 'Resumable stream tracking for long-running generations';

COMMENT ON COLUMN public.chat_messages.parts IS 'Array of message parts: [{ type: "text", text: "..." }, { type: "image", image: "..." }]';
COMMENT ON COLUMN public.chat_messages.attachments IS 'Array of file attachments: [{ name: "file.pdf", contentType: "application/pdf", url: "..." }]';
