# Brand-Scoped Chat Selection Guide

## Overview
This guide ensures that every chat interaction is properly scoped to a specific brand, maintaining data isolation and security across your multi-tenant ACT platform.

## Architecture Principles

### 1. **Brand Context is Required**
- Every chat MUST belong to a brand (`brand_id` is NOT NULL)
- Users can only access chats from brands they're members of
- Chat selection always filters by active brand context

### 2. **User-Brand Relationship**
```
User → brand_users → Brand → chats → chat_messages
```

### 3. **Access Control Layers**
1. **Database Level**: RLS policies enforce brand access
2. **API Level**: Validate brand membership before operations
3. **UI Level**: Only show chats for selected brand

---

## Database Enhancements

### Additional Indexes for Brand Filtering
```sql
-- Add to migration file
CREATE INDEX IF NOT EXISTS idx_chats_brand_user_last_message 
  ON public.chats(brand_id, user_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_chats_brand_archived 
  ON public.chats(brand_id, archived) 
  WHERE NOT archived;

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_chats_brand_visibility_created 
  ON public.chats(brand_id, visibility, created_at DESC);
```

### Enhanced RLS Policies with Brand Validation

```sql
-- Drop existing policies and recreate with stricter brand checks
DROP POLICY IF EXISTS "Users can view their brand chats or public chats" ON public.chats;
DROP POLICY IF EXISTS "Users can create chats for their brands" ON public.chats;

-- VIEW: Users can only see chats from brands they belong to
CREATE POLICY "Users can view chats from their brands only"
  ON public.chats FOR SELECT
  USING (
    -- User must be a member of the brand
    brand_id IN (
      SELECT brand_id 
      FROM public.brand_users
      WHERE user_id = auth.uid()
        AND status = 'active' -- Only active members
    )
    AND (
      -- Either own chat or public chat within their brand
      user_id = auth.uid() 
      OR visibility = 'public'
    )
  );

-- INSERT: Validate brand membership before creating chat
CREATE POLICY "Users can create chats only for their active brands"
  ON public.chats FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND brand_id IN (
      SELECT brand_id 
      FROM public.brand_users
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
  );

-- UPDATE: Can only update own chats in their brands
CREATE POLICY "Users can update only their own brand chats"
  ON public.chats FOR UPDATE
  USING (
    user_id = auth.uid()
    AND brand_id IN (
      SELECT brand_id 
      FROM public.brand_users
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
  );

-- DELETE: Can only delete own chats
CREATE POLICY "Users can delete only their own chats"
  ON public.chats FOR DELETE
  USING (
    user_id = auth.uid()
    AND brand_id IN (
      SELECT brand_id 
      FROM public.brand_users
      WHERE user_id = auth.uid()
    )
  );
```

### Helper Functions for Brand Validation

```sql
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
```

---

## Frontend Implementation

### 1. Brand Context Provider

```typescript
// lib/contexts/BrandContext.tsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface BrandContextType {
  activeBrandId: string | null;
  setActiveBrandId: (brandId: string) => void;
  userBrands: Brand[];
  isLoading: boolean;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [userBrands, setUserBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadUserBrands();
  }, []);

  async function loadUserBrands() {
    try {
      const response = await fetch('/api/brands');
      const brands = await response.json();
      setUserBrands(brands);
      
      // Set first brand as active if none selected
      if (!activeBrandId && brands.length > 0) {
        setActiveBrandId(brands[0].id);
      }
    } catch (error) {
      console.error('Failed to load brands:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSetActiveBrand = (brandId: string) => {
    setActiveBrandId(brandId);
    // Store in localStorage for persistence
    localStorage.setItem('activeBrandId', brandId);
    // Redirect to brand-specific chat page
    router.push(`/brands/${brandId}/chat`);
  };

  return (
    <BrandContext.Provider
      value={{
        activeBrandId,
        setActiveBrandId: handleSetActiveBrand,
        userBrands,
        isLoading,
      }}
    >
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within BrandProvider');
  }
  return context;
}
```

### 2. Brand Selector Component

```typescript
// components/brand/BrandSelector.tsx
'use client';

import { useBrand } from '@/lib/contexts/BrandContext';
import { Check, ChevronsUpDown } from 'lucide-react';

export function BrandSelector() {
  const { activeBrandId, setActiveBrandId, userBrands, isLoading } = useBrand();
  const [open, setOpen] = useState(false);

  if (isLoading) {
    return <div className="animate-pulse h-10 w-48 bg-gray-200 rounded" />;
  }

  const activeBrand = userBrands.find((b) => b.id === activeBrandId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
      >
        <span className="font-medium">{activeBrand?.name || 'Select Brand'}</span>
        <ChevronsUpDown className="h-4 w-4 opacity-50" />
      </button>

      {open && (
        <div className="absolute top-full mt-2 w-64 bg-white border rounded-lg shadow-lg z-50">
          {userBrands.map((brand) => (
            <button
              key={brand.id}
              onClick={() => {
                setActiveBrandId(brand.id);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50"
            >
              <div>
                <div className="font-medium">{brand.name}</div>
                <div className="text-sm text-gray-500">{brand.industry}</div>
              </div>
              {brand.id === activeBrandId && (
                <Check className="h-4 w-4 text-blue-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 3. Brand-Scoped Chat List

```typescript
// components/chat/ChatList.tsx
'use client';

import { useEffect, useState } from 'react';
import { useBrand } from '@/lib/contexts/BrandContext';
import { createClient } from '@supabase/supabase-js';

interface Chat {
  id: string;
  title: string;
  last_message_at: string;
  message_count: number;
}

export function ChatList() {
  const { activeBrandId } = useBrand();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (!activeBrandId) return;
    loadChats();
  }, [activeBrandId]);

  async function loadChats() {
    setIsLoading(true);
    try {
      // Using the brand-scoped function
      const { data, error } = await supabase.rpc('get_brand_chats', {
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_brand_id: activeBrandId,
        p_limit: 50,
        p_offset: 0,
      });

      if (error) throw error;
      setChats(data || []);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (!activeBrandId) {
    return (
      <div className="p-4 text-center text-gray-500">
        Please select a brand to view chats
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-4">Loading chats...</div>;
  }

  return (
    <div className="space-y-2">
      {chats.map((chat) => (
        <a
          key={chat.id}
          href={`/brands/${activeBrandId}/chat/${chat.id}`}
          className="block p-4 border rounded-lg hover:bg-gray-50"
        >
          <div className="font-medium">{chat.title}</div>
          <div className="text-sm text-gray-500">
            {chat.message_count} messages · {formatDate(chat.last_message_at)}
          </div>
        </a>
      ))}
    </div>
  );
}
```

### 4. API Route with Brand Validation

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

  // Get user from session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // CRITICAL: Validate brand access
  const { data: validation } = await supabase.rpc('validate_chat_access', {
    p_user_id: user.id,
    p_chat_id: chatId,
  });

  if (!validation || !validation[0]?.has_access) {
    return new Response('Forbidden: No access to this chat', { status: 403 });
  }

  // Verify the chat belongs to the claimed brand
  const { data: chat } = await supabase
    .from('chats')
    .select('brand_id, model, settings')
    .eq('id', chatId)
    .single();

  if (!chat || chat.brand_id !== brandId) {
    return new Response('Brand mismatch', { status: 400 });
  }

  // Proceed with chat
  const result = streamText({
    model: openai('gpt-4-turbo'),
    messages,
    async onFinish({ messages: finishedMessages }) {
      // Save messages with brand context
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

### 5. Server Actions with Brand Validation

```typescript
// lib/actions/chat.ts
'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Create a new chat (ALWAYS requires brandId)
 */
export async function createChat(
  brandId: string,
  userId: string,
  title: string = 'New Chat'
) {
  // Validate brand access
  const hasAccess = await supabase.rpc('user_has_brand_access', {
    p_user_id: userId,
    p_brand_id: brandId,
  });

  if (!hasAccess.data) {
    throw new Error('User does not have access to this brand');
  }

  // Create chat
  const { data, error } = await supabase.rpc('create_chat_with_quota_check', {
    p_brand_id: brandId,
    p_user_id: userId,
    p_title: title,
  });

  if (error) throw error;

  revalidatePath(`/brands/${brandId}/chat`);
  return data;
}

/**
 * Get chats for a specific brand
 */
export async function getBrandChats(brandId: string, userId: string) {
  const { data, error } = await supabase.rpc('get_brand_chats', {
    p_user_id: userId,
    p_brand_id: brandId,
  });

  if (error) throw error;
  return data;
}

/**
 * Switch active brand (validates access)
 */
export async function switchActiveBrand(userId: string, brandId: string) {
  const { data: hasAccess } = await supabase.rpc('user_has_brand_access', {
    p_user_id: userId,
    p_brand_id: brandId,
  });

  if (!hasAccess) {
    throw new Error('User does not have access to this brand');
  }

  return { success: true, brandId };
}
```

---

## URL Structure for Brand Isolation

### Recommended Route Structure
```
/brands/[brandId]/chat              → Chat list for brand
/brands/[brandId]/chat/new          → Create new chat
/brands/[brandId]/chat/[chatId]     → Specific chat
/brands/[brandId]/settings          → Brand settings
```

### Page Implementation
```typescript
// app/(dashboard)/brands/[brandId]/chat/[chatId]/page.tsx
import { ChatInterface } from '@/components/chat/ChatInterface';
import { validateChatAccess } from '@/lib/actions/chat';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

interface ChatPageProps {
  params: Promise<{ brandId: string; chatId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { brandId, chatId } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Validate access
  const validation = await validateChatAccess(session.user.id, chatId);
  
  if (!validation.has_access || validation.brand_id !== brandId) {
    redirect(`/brands/${brandId}/chat`);
  }

  return (
    <ChatInterface
      chatId={chatId}
      brandId={brandId}
      userId={session.user.id}
    />
  );
}
```

---

## Security Checklist

✅ **Database Level**
- [ ] RLS policies enforce brand membership
- [ ] All queries filter by `brand_id`
- [ ] Foreign key constraints prevent orphaned data
- [ ] Indexes optimize brand-scoped queries

✅ **API Level**
- [ ] Validate brand access before operations
- [ ] Verify chat belongs to claimed brand
- [ ] Check user role for sensitive operations
- [ ] Rate limit per brand

✅ **UI Level**
- [ ] Brand selector always visible
- [ ] Chat list filtered by active brand
- [ ] URLs include brand context
- [ ] Error handling for brand switches

✅ **Testing**
- [ ] Test cross-brand access attempts
- [ ] Verify RLS policies block unauthorized access
- [ ] Test brand switching mid-chat
- [ ] Validate quota enforcement per brand

---

## Common Patterns

### Pattern 1: Always Pass Brand Context
```typescript
// ❌ Bad - No brand context
const chat = await createChat(userId, title);

// ✅ Good - Brand context required
const chat = await createChat(brandId, userId, title);
```

### Pattern 2: Validate Before Operations
```typescript
// ✅ Always validate brand access first
async function updateChat(chatId: string, brandId: string, updates: any) {
  const validation = await validateChatAccess(userId, chatId);
  
  if (!validation.has_access || validation.brand_id !== brandId) {
    throw new Error('Access denied');
  }
  
  // Proceed with update
}
```

### Pattern 3: Brand-Scoped Queries
```typescript
// ✅ Always include brand_id in queries
const { data } = await supabase
  .from('chats')
  .select('*')
  .eq('brand_id', activeBrandId)  // Always filter by brand
  .eq('user_id', userId)
  .order('last_message_at', { ascending: false });
```

---

## Migration Additions

Add these to your migration file:

```sql
-- Add brand validation trigger
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
```

This ensures brand isolation at every level of your application! 🔒
