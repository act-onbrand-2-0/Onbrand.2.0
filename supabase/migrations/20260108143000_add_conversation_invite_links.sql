-- Add invite link support for collaborative chats
-- This allows users to generate shareable links to invite others to a conversation

-- Add invite_token column to conversation_shares for link-based invites
ALTER TABLE public.conversation_shares 
ADD COLUMN IF NOT EXISTS invite_token UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS invite_created_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_conversation_shares_invite_token 
ON public.conversation_shares(invite_token) 
WHERE invite_token IS NOT NULL;

-- Create a table for reusable invite links (one link can be used by multiple people)
CREATE TABLE IF NOT EXISTS public.conversation_invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  permission TEXT NOT NULL DEFAULT 'write' CHECK (permission IN ('read', 'write')),
  max_uses INTEGER DEFAULT NULL, -- NULL means unlimited
  use_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT NULL, -- NULL means never expires
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_invite_token UNIQUE (token)
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_invite_links_token ON public.conversation_invite_links(token);
CREATE INDEX IF NOT EXISTS idx_invite_links_conversation ON public.conversation_invite_links(conversation_id);

-- RLS policies for invite links
ALTER TABLE public.conversation_invite_links ENABLE ROW LEVEL SECURITY;

-- Only conversation owners can create/view/manage invite links
CREATE POLICY "Owners can manage invite links"
  ON public.conversation_invite_links
  FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE user_id = auth.uid()
    )
  );

-- Anyone can read active invite links (for joining via link)
CREATE POLICY "Anyone can read active invite links"
  ON public.conversation_invite_links
  FOR SELECT
  USING (is_active = true);

COMMENT ON TABLE public.conversation_invite_links IS 'Shareable invite links for collaborative chats';
