# Chat SDK Migration Plan for Supabase

## Overview
This document outlines the required changes to migrate your current Supabase conversation schema to be compatible with the Vercel AI Chat SDK (https://chat-sdk.dev).

## Current Schema vs Chat SDK Schema

### Your Current Schema
```sql
-- conversations table
- id (UUID)
- brand_id (TEXT) - YOUR CUSTOM FIELD
- user_id (UUID)
- title (TEXT)
- model (TEXT)
- system_prompt (TEXT)
- settings (JSONB)
- total_tokens_used (INTEGER)
- total_cost_usd (DECIMAL)
- archived (BOOLEAN)
- timestamps

-- messages table
- id (UUID)
- conversation_id (UUID)
- role (TEXT)
- content (TEXT) - SINGLE TEXT FIELD
- tokens_used (INTEGER)
- model (TEXT)
- metadata (JSONB)
- created_at
```

### Chat SDK Expected Schema
```sql
-- Chat table
- id (UUID)
- createdAt (TIMESTAMP)
- title (TEXT)
- userId (UUID)
- visibility (VARCHAR) - 'public' or 'private'

-- Message_v2 table (NEW FORMAT)
- id (UUID)
- chatId (UUID)
- role (VARCHAR)
- parts (JSON) - ARRAY OF MESSAGE PARTS
- attachments (JSON) - ARRAY OF ATTACHMENTS
- createdAt (TIMESTAMP)

-- Vote_v2 table (OPTIONAL)
- chatId (UUID)
- messageId (UUID)
- isUpvoted (BOOLEAN)

-- Document table (FOR ARTIFACTS - OPTIONAL)
- id (UUID)
- createdAt (TIMESTAMP)
- title (TEXT)
- content (TEXT)
- kind (VARCHAR) - 'text', 'code', 'image', 'sheet'
- userId (UUID)

-- Stream table (FOR RESUMABLE STREAMS - OPTIONAL)
- id (UUID)
- chatId (UUID)
- createdAt (TIMESTAMP)
```

## Required Changes

### 1. Update Messages Table Structure

**CRITICAL**: The Chat SDK uses a **message parts** structure instead of simple text content.

#### Message Parts Format
```typescript
// Instead of: content: "Hello world"
// Chat SDK uses:
parts: [
  { type: "text", text: "Hello world" },
  { type: "image", image: "data:image/png;base64,..." },
  { type: "tool-call", toolCallId: "...", toolName: "...", args: {...} },
  { type: "tool-result", toolCallId: "...", toolName: "...", result: {...} }
]

attachments: [
  { name: "file.pdf", contentType: "application/pdf", url: "..." }
]
```

### 2. Migration Strategy

#### Option A: Create New Tables (Recommended for Production)
Keep your existing tables and create new Chat SDK compatible tables:

```sql
-- Create new chat table (maps to your conversations)
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id TEXT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  visibility VARCHAR(10) NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Keep your custom fields
  model TEXT,
  system_prompt TEXT,
  settings JSONB DEFAULT '{"temperature": 0.7, "max_tokens": 2000, "top_p": 1.0}'::jsonb,
  total_tokens_used INTEGER DEFAULT 0,
  total_cost_usd DECIMAL(10, 6) DEFAULT 0,
  archived BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create new messages table with parts structure
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'function', 'tool')),
  parts JSON NOT NULL, -- Array of message parts
  attachments JSON NOT NULL DEFAULT '[]'::json, -- Array of file attachments
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Keep your custom fields
  tokens_used INTEGER DEFAULT 0,
  model TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Optional: Votes table for message feedback
CREATE TABLE IF NOT EXISTS public.chat_votes (
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  is_upvoted BOOLEAN NOT NULL,
  PRIMARY KEY (chat_id, message_id)
);

-- Optional: Documents table for artifacts
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

-- Optional: Streams table for resumable streams
CREATE TABLE IF NOT EXISTS public.chat_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

#### Option B: Modify Existing Tables (Simpler but Requires Migration)
Add new columns to existing tables:

```sql
-- Add new columns to messages table
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS parts JSON,
  ADD COLUMN IF NOT EXISTS attachments JSON DEFAULT '[]'::json;

-- Migrate existing content to parts format
UPDATE public.messages
SET parts = json_build_array(
  json_build_object(
    'type', 'text',
    'text', content
  )
)
WHERE parts IS NULL;

-- Make parts NOT NULL after migration
ALTER TABLE public.messages 
  ALTER COLUMN parts SET NOT NULL;

-- Add visibility to conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(10) DEFAULT 'private' 
  CHECK (visibility IN ('public', 'private'));
```

### 3. Required Indexes

```sql
-- Chats indexes
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_brand_id ON public.chats(brand_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON public.chats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_visibility ON public.chats(visibility) WHERE visibility = 'public';

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON public.chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON public.chat_messages(role);
```

### 4. RLS Policies

```sql
-- Enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chats policies
CREATE POLICY "Users can view their brand chats"
  ON public.chats FOR SELECT
  USING (
    user_id = auth.uid() OR
    (visibility = 'public') OR
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
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own chats"
  ON public.chats FOR DELETE
  USING (user_id = auth.uid());

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
```

### 5. Helper Functions

```sql
-- Function to convert text content to message parts format
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

-- Function to save chat with message parts
CREATE OR REPLACE FUNCTION public.save_chat_message(
  p_chat_id UUID,
  p_role TEXT,
  p_parts JSON,
  p_attachments JSON DEFAULT '[]'::json,
  p_tokens_used INTEGER DEFAULT 0,
  p_model TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
  v_brand_id TEXT;
BEGIN
  -- Get brand_id from chat
  SELECT brand_id INTO v_brand_id
  FROM public.chats
  WHERE id = p_chat_id;

  IF v_brand_id IS NULL THEN
    RAISE EXCEPTION 'Chat not found';
  END IF;

  -- Insert message
  INSERT INTO public.chat_messages (
    chat_id,
    role,
    parts,
    attachments,
    tokens_used,
    model
  ) VALUES (
    p_chat_id,
    p_role,
    p_parts,
    p_attachments,
    p_tokens_used,
    p_model
  ) RETURNING id INTO v_message_id;

  -- Update chat timestamp
  UPDATE public.chats
  SET 
    updated_at = NOW(),
    last_message_at = NOW(),
    total_tokens_used = total_tokens_used + p_tokens_used
  WHERE id = p_chat_id;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Frontend Integration

### Using with AI SDK useChat Hook

```typescript
import { useChat } from 'ai/react';

export function ChatComponent({ chatId, brandId }: { chatId: string; brandId: string }) {
  const { messages, input, handleInputChange, handleSubmit, append } = useChat({
    api: '/api/chat',
    id: chatId,
    body: {
      brandId, // Pass your custom brand context
    },
    // Load initial messages from Supabase
    initialMessages: [], // Fetch from your chats/chat_messages tables
    onFinish: async (message) => {
      // Messages are automatically saved via the API route's onFinish callback
      console.log('Message saved:', message);
    },
  });

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          <strong>{message.role}:</strong>
          {/* Render message parts */}
          {message.parts?.map((part, i) => {
            if (part.type === 'text') return <p key={i}>{part.text}</p>;
            if (part.type === 'image') return <img key={i} src={part.image} />;
            // Handle other part types
            return null;
          })}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

### API Route with Supabase Persistence

```typescript
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const { messages, id: chatId, brandId } = await req.json();
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const result = streamText({
    model: openai('gpt-4-turbo'),
    messages,
    async onFinish({ messages: finishedMessages }) {
      // Save all messages to Supabase
      for (const msg of finishedMessages) {
        await supabase.from('chat_messages').insert({
          chat_id: chatId,
          role: msg.role,
          parts: msg.parts || [{ type: 'text', text: msg.content }],
          attachments: msg.experimental_attachments || [],
          model: 'gpt-4-turbo',
        });
      }
      
      // Update chat timestamp
      await supabase
        .from('chats')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', chatId);
    },
  });

  return result.toDataStreamResponse();
}
```

## Migration Steps

1. **Create new migration file**: `20251216150000_add_chat_sdk_support.sql`
2. **Choose strategy**: Option A (new tables) or Option B (modify existing)
3. **Run migration**: `supabase db push`
4. **Update frontend code**: Use AI SDK's `useChat` hook
5. **Test with a simple chat**: Verify messages persist correctly
6. **Migrate existing data** (if using Option A): Write script to copy old conversations to new format

## Key Differences to Remember

1. **Message Parts**: Content is now an array of typed parts, not a single string
2. **Attachments**: Separate field for file attachments
3. **Visibility**: Chats can be public or private (for sharing)
4. **Simplified Structure**: Chat SDK uses simpler field names (camelCase)
5. **Brand Context**: You'll need to maintain your `brand_id` field as custom extension

## Recommended Approach

**Use Option A (New Tables)** because:
- ✅ Keeps existing data intact
- ✅ Allows gradual migration
- ✅ Can run both systems in parallel
- ✅ Easier to rollback if needed
- ✅ Maintains your custom fields (brand_id, tokens, cost tracking)

## Next Steps

1. Review this plan
2. Decide on Option A or B
3. Create the migration SQL file
4. Test in development environment
5. Update frontend to use AI SDK's `useChat` hook
6. Deploy to production
