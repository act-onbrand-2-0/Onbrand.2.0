# Chat SDK Quick Start Guide

## What You Need to Know

The [Vercel AI Chat SDK](https://chat-sdk.dev) uses a **message parts** structure instead of simple text strings. This allows for:
- 📝 Text messages
- 🖼️ Images
- 🔧 Tool calls and results
- 📎 File attachments
- 🎨 Multimodal content

## Key Changes Required

### 1. Database Schema
Your current `messages` table stores content as a single TEXT field:
```sql
content TEXT NOT NULL
```

Chat SDK requires:
```sql
parts JSON NOT NULL,           -- Array of message parts
attachments JSON NOT NULL      -- Array of file attachments
```

### 2. Message Format

**Current format:**
```typescript
{
  role: "user",
  content: "Hello world"
}
```

**Chat SDK format:**
```typescript
{
  role: "user",
  parts: [
    { type: "text", text: "Hello world" }
  ],
  attachments: []
}
```

## Installation Steps

### Step 1: Install Dependencies
```bash
cd brands/act-frontend
pnpm add ai @ai-sdk/openai @ai-sdk/anthropic
```

### Step 2: Run Migration
```bash
cd ../..  # Back to root
supabase db push
```

This will apply the migration file: `20251216150000_add_chat_sdk_support.sql`

### Step 3: Update Environment Variables
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Provider Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

### Step 4: Create API Route
Create `brands/act-frontend/app/api/chat/route.ts`:

```typescript
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
      // Save to database
      for (const msg of finishedMessages) {
        await supabase.from('chat_messages').insert({
          chat_id: chatId,
          role: msg.role,
          parts: msg.parts || [{ type: 'text', text: msg.content }],
          attachments: msg.experimental_attachments || [],
        });
      }
    },
  });

  return result.toDataStreamResponse();
}
```

### Step 5: Create Chat Component
```typescript
'use client';

import { useChat } from 'ai/react';

export function ChatInterface({ chatId, brandId }) {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
    id: chatId,
    body: { brandId },
  });

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>
          <strong>{m.role}:</strong> {m.content}
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

## What Gets Created

The migration creates these new tables:

1. **`chats`** - Chat sessions (replaces `conversations`)
   - Includes your custom fields: `brand_id`, `model`, `settings`, `total_tokens_used`, etc.
   - Adds Chat SDK fields: `visibility` for sharing

2. **`chat_messages`** - Messages with parts support
   - `parts` - Array of message parts (text, images, tool calls)
   - `attachments` - Array of file attachments
   - Keeps your custom fields: `tokens_used`, `model`, `metadata`

3. **`chat_votes`** (optional) - Message feedback
4. **`chat_documents`** (optional) - Artifacts (code, images, sheets)
5. **`chat_streams`** (optional) - Resumable streams

## Key Features You Get

✅ **Persistent conversations** - All messages saved to Supabase
✅ **Multimodal support** - Text, images, files, tool calls
✅ **Streaming responses** - Real-time AI responses
✅ **File attachments** - Upload and attach files to messages
✅ **Message voting** - Upvote/downvote messages
✅ **Chat sharing** - Public/private visibility
✅ **Brand isolation** - All chats scoped to brands
✅ **Token tracking** - Monitor usage and costs
✅ **Quota management** - Existing quota system integrated

## Your Existing Features Preserved

✅ `brand_id` - All chats belong to brands
✅ `total_tokens_used` - Token tracking maintained
✅ `total_cost_usd` - Cost tracking maintained
✅ `settings` - Model settings (temperature, max_tokens, etc.)
✅ `archived` - Soft delete functionality
✅ RLS policies - Brand-based access control
✅ Quota system - Integrated with `check_and_use_quota()`

## Testing

### 1. Create a test chat
```typescript
const chatId = await createChat('your-brand-id', 'user-id', 'Test Chat');
```

### 2. Send a message
Use the chat interface or call the API directly:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "id": "chat-id",
    "brandId": "brand-id"
  }'
```

### 3. Verify in database
```sql
SELECT * FROM chats WHERE brand_id = 'your-brand-id';
SELECT * FROM chat_messages WHERE chat_id = 'your-chat-id';
```

## Migration from Old Schema (Optional)

If you want to migrate existing `conversations` and `messages`:

```sql
-- Copy conversations to chats
INSERT INTO chats (
  id, brand_id, user_id, title, model, system_prompt,
  settings, total_tokens_used, total_cost_usd, archived,
  created_at, updated_at, last_message_at
)
SELECT 
  id, brand_id, user_id, title, model, system_prompt,
  settings, total_tokens_used, total_cost_usd, archived,
  created_at, updated_at, last_message_at
FROM conversations;

-- Copy messages to chat_messages (converting content to parts)
INSERT INTO chat_messages (
  id, chat_id, role, parts, attachments, tokens_used, model, metadata, created_at
)
SELECT 
  id,
  conversation_id,
  role,
  json_build_array(json_build_object('type', 'text', 'text', content)),
  '[]'::json,
  tokens_used,
  model,
  metadata,
  created_at
FROM messages;
```

## Troubleshooting

### Issue: "Chat not found"
- Check that the chat exists in the `chats` table
- Verify the user has access via `brand_users` table

### Issue: "Insufficient quota"
- Check brand quota: `SELECT * FROM brand_quotas WHERE brand_id = 'your-brand-id'`
- Increase quota or reset usage

### Issue: Messages not saving
- Check Supabase service role key is set
- Verify RLS policies allow insert
- Check browser console for errors

### Issue: Stream not working
- Ensure API route returns `result.toDataStreamResponse()`
- Check CORS settings if calling from different domain
- Verify OpenAI/Anthropic API keys are valid

## Next Steps

1. ✅ Review the migration plan: `CHAT_SDK_MIGRATION_PLAN.md`
2. ✅ Check the integration example: `CHAT_SDK_INTEGRATION_EXAMPLE.tsx`
3. ⬜ Run the migration: `supabase db push`
4. ⬜ Install AI SDK packages: `pnpm add ai @ai-sdk/openai`
5. ⬜ Create API route: `app/api/chat/route.ts`
6. ⬜ Build chat interface component
7. ⬜ Test with a simple conversation
8. ⬜ Add file upload support
9. ⬜ Implement message voting
10. ⬜ Add chat sharing functionality

## Resources

- [Chat SDK Docs](https://chat-sdk.dev/docs)
- [AI SDK Docs](https://ai-sdk.dev)
- [Vercel AI Chatbot Template](https://github.com/vercel/ai-chatbot)
- [Supabase Docs](https://supabase.com/docs)

## Support

If you run into issues:
1. Check the migration file for any errors
2. Review the RLS policies
3. Test with a simple example first
4. Check Supabase logs for errors
5. Verify all environment variables are set
