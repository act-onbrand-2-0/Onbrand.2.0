# Brand-Scoped Chat Quick Reference

## 🎯 Core Principle
**Every chat MUST belong to a brand. No exceptions.**

## 📋 Quick Checklist

### Before Any Chat Operation
```typescript
✅ Do you have the brandId?
✅ Is the user authenticated?
✅ Does the user belong to this brand?
✅ Does the chat belong to this brand?
```

## 🔑 Key Functions

### Check Brand Access
```typescript
const hasAccess = await supabase.rpc('user_has_brand_access', {
  p_user_id: userId,
  p_brand_id: brandId
});
```

### Validate Chat Access
```typescript
const validation = await supabase.rpc('validate_chat_access', {
  p_user_id: userId,
  p_chat_id: chatId
});
// Returns: { has_access, brand_id, user_role }
```

### Get Brand Chats
```typescript
const chats = await supabase.rpc('get_brand_chats', {
  p_user_id: userId,
  p_brand_id: brandId,
  p_limit: 50,
  p_offset: 0
});
```

### Create Chat
```typescript
const chatId = await supabase.rpc('create_chat_with_quota_check', {
  p_brand_id: brandId,
  p_user_id: userId,
  p_title: 'New Chat',
  p_model: 'gpt-4',
  p_visibility: 'private'
});
```

## 🛡️ Security Patterns

### Pattern 1: API Route Validation
```typescript
export async function POST(req: Request) {
  const { chatId, brandId } = await req.json();
  
  // 1. Authenticate
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  
  // 2. Validate chat access
  const { data: validation } = await supabase.rpc('validate_chat_access', {
    p_user_id: user.id,
    p_chat_id: chatId
  });
  
  // 3. Verify brand match
  if (!validation?.[0]?.has_access || validation[0].brand_id !== brandId) {
    return new Response('Forbidden', { status: 403 });
  }
  
  // 4. Proceed with operation
  // ...
}
```

### Pattern 2: Server Action Validation
```typescript
'use server';

export async function updateChat(chatId: string, brandId: string, updates: any) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  
  // Validate access
  const validation = await validateChatAccess(session.user.id, chatId);
  if (!validation.has_access || validation.brand_id !== brandId) {
    throw new Error('Access denied');
  }
  
  // Update chat
  await supabase.from('chats').update(updates).eq('id', chatId);
}
```

### Pattern 3: Component Brand Context
```typescript
'use client';

export function ChatComponent() {
  const { activeBrandId } = useBrand();
  
  // Always check brand context
  if (!activeBrandId) {
    return <div>Please select a brand</div>;
  }
  
  // Load brand-specific data
  const { data: chats } = useSWR(
    ['chats', activeBrandId],
    () => getBrandChats(activeBrandId, userId)
  );
  
  return <ChatList chats={chats} />;
}
```

## 🚫 Common Mistakes

### ❌ Mistake 1: Missing Brand Filter
```typescript
// BAD - No brand filter
const chats = await supabase
  .from('chats')
  .select('*')
  .eq('user_id', userId);

// GOOD - Always filter by brand
const chats = await supabase
  .from('chats')
  .select('*')
  .eq('brand_id', activeBrandId)
  .eq('user_id', userId);
```

### ❌ Mistake 2: Skipping Validation
```typescript
// BAD - No validation
const chat = await getChat(chatId);

// GOOD - Validate first
const validation = await validateChatAccess(userId, chatId);
if (!validation.has_access) throw new Error('Access denied');
const chat = await getChat(chatId);
```

### ❌ Mistake 3: Trusting Client Data
```typescript
// BAD - Trust client-provided brandId
const { brandId } = await req.json();
await processChat(chatId, brandId);

// GOOD - Verify brand from database
const { data: chat } = await supabase
  .from('chats')
  .select('brand_id')
  .eq('id', chatId)
  .single();

if (chat.brand_id !== brandId) {
  throw new Error('Brand mismatch');
}
```

## 🔍 Debugging

### Check User's Brands
```sql
SELECT b.id, b.name, bu.role, bu.status
FROM brands b
JOIN brand_users bu ON bu.brand_id = b.id
WHERE bu.user_id = 'user-uuid';
```

### Check Chat's Brand
```sql
SELECT c.id, c.title, c.brand_id, b.name as brand_name
FROM chats c
JOIN brands b ON b.id = c.brand_id
WHERE c.id = 'chat-uuid';
```

### Test Brand Access
```sql
SELECT user_has_brand_access(
  'user-uuid',
  'brand-id'
) AS has_access;
```

### Verify RLS Policies
```sql
-- Test as specific user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub = 'user-uuid';

SELECT * FROM chats WHERE brand_id = 'brand-id';
```

## 📊 Database Queries

### Get User's Active Brands
```sql
SELECT b.*
FROM brands b
JOIN brand_users bu ON bu.brand_id = b.id
WHERE bu.user_id = $1
  AND bu.status = 'active'
ORDER BY b.name;
```

### Get Brand Chats with Message Count
```sql
SELECT 
  c.*,
  COUNT(cm.id) as message_count,
  MAX(cm.created_at) as last_message_at
FROM chats c
LEFT JOIN chat_messages cm ON cm.chat_id = c.id
WHERE c.brand_id = $1
  AND c.user_id = $2
  AND NOT c.archived
GROUP BY c.id
ORDER BY last_message_at DESC;
```

### Get Chat with Brand Info
```sql
SELECT 
  c.*,
  b.name as brand_name,
  b.settings as brand_settings
FROM chats c
JOIN brands b ON b.id = c.brand_id
WHERE c.id = $1;
```

## 🎨 UI Components

### Brand Selector
```typescript
import { useBrand } from '@/lib/contexts/BrandContext';

export function BrandSelector() {
  const { activeBrandId, setActiveBrandId, userBrands } = useBrand();
  
  return (
    <select 
      value={activeBrandId || ''} 
      onChange={(e) => setActiveBrandId(e.target.value)}
    >
      {userBrands.map(brand => (
        <option key={brand.id} value={brand.id}>
          {brand.name}
        </option>
      ))}
    </select>
  );
}
```

### Brand-Scoped Chat List
```typescript
export function ChatList() {
  const { activeBrandId } = useBrand();
  const [chats, setChats] = useState([]);
  
  useEffect(() => {
    if (!activeBrandId) return;
    
    loadChats();
  }, [activeBrandId]);
  
  async function loadChats() {
    const data = await supabase.rpc('get_brand_chats', {
      p_user_id: userId,
      p_brand_id: activeBrandId
    });
    setChats(data);
  }
  
  return (
    <div>
      {chats.map(chat => (
        <ChatItem key={chat.id} chat={chat} />
      ))}
    </div>
  );
}
```

## 🧪 Testing

### Test 1: Cross-Brand Access
```typescript
test('prevents access to chats from other brands', async () => {
  const userA = await createUser();
  const brandX = await createBrand();
  const brandY = await createBrand();
  
  await addUserToBrand(userA.id, brandX.id);
  
  const chatInBrandY = await createChat(brandY.id, 'other-user-id');
  
  // Should fail
  await expect(
    getChat(userA.id, chatInBrandY.id)
  ).rejects.toThrow('Access denied');
});
```

### Test 2: Brand Switch
```typescript
test('updates chat list when brand switches', async () => {
  const { result } = renderHook(() => useBrand());
  
  act(() => {
    result.current.setActiveBrandId('brand-x');
  });
  
  await waitFor(() => {
    expect(screen.getByText('Brand X Chat')).toBeInTheDocument();
  });
  
  act(() => {
    result.current.setActiveBrandId('brand-y');
  });
  
  await waitFor(() => {
    expect(screen.queryByText('Brand X Chat')).not.toBeInTheDocument();
    expect(screen.getByText('Brand Y Chat')).toBeInTheDocument();
  });
});
```

### Test 3: RLS Policy
```typescript
test('RLS prevents viewing other brand chats', async () => {
  const supabase = createClient(url, anonKey);
  
  // Sign in as user A
  await supabase.auth.signInWithPassword({
    email: 'userA@example.com',
    password: 'password'
  });
  
  // Try to query brand B's chats
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('brand_id', 'brand-b');
  
  // Should return empty (RLS filters it out)
  expect(data).toEqual([]);
});
```

## 📝 Implementation Checklist

### Database
- [x] Add `brand_id` column to chats (NOT NULL)
- [x] Create brand validation functions
- [x] Add brand access trigger
- [x] Update RLS policies
- [x] Add brand-scoped indexes

### Backend
- [ ] Update API routes with brand validation
- [ ] Add brand context to all chat operations
- [ ] Implement `validateChatAccess` in all endpoints
- [ ] Add error handling for brand mismatches

### Frontend
- [ ] Create BrandContext provider
- [ ] Add BrandSelector component
- [ ] Update chat list to filter by brand
- [ ] Add brand validation to chat interface
- [ ] Update URLs to include brand context

### Testing
- [ ] Test cross-brand access prevention
- [ ] Test brand switching behavior
- [ ] Test RLS policies
- [ ] Test API validation
- [ ] Test UI brand context

## 🚀 Quick Start

1. **Run Migration**
   ```bash
   supabase db push
   ```

2. **Add Brand Context to App**
   ```typescript
   // app/layout.tsx
   <BrandProvider>
     {children}
   </BrandProvider>
   ```

3. **Update API Routes**
   ```typescript
   // Add validation to all chat endpoints
   const validation = await validateChatAccess(userId, chatId);
   if (!validation.has_access) return 403;
   ```

4. **Test**
   ```bash
   npm test -- brand-isolation
   ```

## 📚 Related Files

- `BRAND_SCOPED_CHAT_SELECTION.md` - Detailed implementation guide
- `BRAND_CHAT_ARCHITECTURE.md` - Architecture diagrams
- `20251216150000_add_chat_sdk_support.sql` - Migration file
- `CHAT_SDK_INTEGRATION_EXAMPLE.tsx` - Code examples

---

**Remember: Brand context is ALWAYS required. No brand = No chat!** 🔒
