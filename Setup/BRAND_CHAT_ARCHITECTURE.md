# Brand-Scoped Chat Architecture

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐     ┌─────────────────┐                     │
│  │ Brand        │────▶│ Chat List       │                     │
│  │ Selector     │     │ (Brand Scoped)  │                     │
│  └──────────────┘     └─────────────────┘                     │
│         │                      │                               │
│         │                      ▼                               │
│         │              ┌─────────────────┐                     │
│         │              │ Chat Interface  │                     │
│         │              │ (Active Chat)   │                     │
│         │              └─────────────────┘                     │
│         │                      │                               │
└─────────┼──────────────────────┼───────────────────────────────┘
          │                      │
          │                      │ POST /api/chat
          │                      │ { chatId, brandId, messages }
          │                      │
┌─────────▼──────────────────────▼───────────────────────────────┐
│                         API LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Authenticate User                                           │
│     ├─ Get user from session                                   │
│     └─ Return 401 if not authenticated                         │
│                                                                 │
│  2. Validate Brand Access                                       │
│     ├─ Call: validate_chat_access(userId, chatId)             │
│     ├─ Check: user is member of brand                          │
│     ├─ Check: chat.brand_id === requested brandId             │
│     └─ Return 403 if validation fails                          │
│                                                                 │
│  3. Process Chat Request                                        │
│     ├─ Stream AI response                                      │
│     └─ Save messages with brand context                        │
│                                                                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    DATABASE LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    BRAND ISOLATION                        │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                           │  │
│  │  brands                                                   │  │
│  │  ├─ id (TEXT) PK                                         │  │
│  │  ├─ name                                                  │  │
│  │  └─ settings                                             │  │
│  │       │                                                   │  │
│  │       │ 1:N                                              │  │
│  │       ▼                                                   │  │
│  │  brand_users (ACCESS CONTROL)                            │  │
│  │  ├─ user_id (UUID) FK → auth.users                      │  │
│  │  ├─ brand_id (TEXT) FK → brands                         │  │
│  │  ├─ role (owner/admin/member)                           │  │
│  │  └─ status (active/inactive)                            │  │
│  │       │                                                   │  │
│  │       │ Validates                                        │  │
│  │       ▼                                                   │  │
│  │  chats (BRAND SCOPED)                                    │  │
│  │  ├─ id (UUID) PK                                         │  │
│  │  ├─ brand_id (TEXT) FK → brands ✓ NOT NULL             │  │
│  │  ├─ user_id (UUID) FK → auth.users                      │  │
│  │  ├─ title                                                │  │
│  │  ├─ visibility (public/private)                         │  │
│  │  └─ settings (model, tokens, cost)                      │  │
│  │       │                                                   │  │
│  │       │ 1:N                                              │  │
│  │       ▼                                                   │  │
│  │  chat_messages                                           │  │
│  │  ├─ id (UUID) PK                                         │  │
│  │  ├─ chat_id (UUID) FK → chats                           │  │
│  │  ├─ role (user/assistant/system)                        │  │
│  │  ├─ parts (JSON) - Message content                      │  │
│  │  └─ attachments (JSON) - File attachments               │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              ROW LEVEL SECURITY (RLS)                     │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                           │  │
│  │  SELECT chats:                                           │  │
│  │    WHERE brand_id IN (                                   │  │
│  │      SELECT brand_id FROM brand_users                    │  │
│  │      WHERE user_id = auth.uid()                          │  │
│  │        AND status = 'active'                             │  │
│  │    )                                                      │  │
│  │                                                           │  │
│  │  INSERT chats:                                           │  │
│  │    CHECK brand_id IN (user's active brands)             │  │
│  │    TRIGGER validates brand access                        │  │
│  │                                                           │  │
│  │  UPDATE/DELETE chats:                                    │  │
│  │    WHERE user_id = auth.uid()                            │  │
│  │      AND brand_id IN (user's active brands)             │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Security Layers

### Layer 1: Database Triggers
```sql
-- Validates brand access BEFORE insert
CREATE TRIGGER trigger_validate_chat_brand_access
  BEFORE INSERT ON public.chats
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_chat_brand_access();
```
**Prevents:** Creating chats for brands user doesn't belong to

### Layer 2: Row Level Security (RLS)
```sql
-- Only shows chats from user's brands
CREATE POLICY "Users can view chats from their brands only"
  ON public.chats FOR SELECT
  USING (
    brand_id IN (
      SELECT brand_id FROM public.brand_users
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
```
**Prevents:** Viewing chats from other brands

### Layer 3: API Validation
```typescript
// Validates brand access in API route
const validation = await supabase.rpc('validate_chat_access', {
  p_user_id: user.id,
  p_chat_id: chatId,
});

if (!validation || validation.brand_id !== brandId) {
  return new Response('Forbidden', { status: 403 });
}
```
**Prevents:** API manipulation attempts

### Layer 4: UI Context
```typescript
// Brand context provider ensures UI always has brand context
const { activeBrandId } = useBrand();

// All queries filtered by active brand
const chats = await getBrandChats(activeBrandId, userId);
```
**Prevents:** UI showing wrong brand data

## Access Control Matrix

| User Role | View Chats | Create Chat | Edit Own Chat | Edit Others | Delete Own | Delete Others |
|-----------|------------|-------------|---------------|-------------|------------|---------------|
| Owner     | ✅ All     | ✅          | ✅            | ✅          | ✅         | ✅            |
| Admin     | ✅ All     | ✅          | ✅            | ✅          | ✅         | ✅            |
| Member    | ✅ Own + Public | ✅     | ✅            | ❌          | ✅         | ❌            |
| Inactive  | ❌         | ❌          | ❌            | ❌          | ❌         | ❌            |

## Query Patterns

### ✅ Correct: Always Include Brand Context
```typescript
// Get chats for specific brand
const chats = await supabase
  .from('chats')
  .select('*')
  .eq('brand_id', activeBrandId)  // ← Always filter by brand
  .eq('user_id', userId)
  .order('last_message_at', { ascending: false });

// Create chat with brand
const chat = await createChat(activeBrandId, userId, title);

// Validate before operations
const access = await validateChatAccess(userId, chatId);
if (access.brand_id !== activeBrandId) throw new Error('Brand mismatch');
```

### ❌ Incorrect: Missing Brand Context
```typescript
// DON'T: Query without brand filter
const chats = await supabase
  .from('chats')
  .select('*')
  .eq('user_id', userId);  // ← Missing brand_id filter!

// DON'T: Create chat without brand
const chat = await createChat(userId, title);  // ← No brand_id!

// DON'T: Skip validation
const result = await processChat(chatId);  // ← No brand check!
```

## URL Structure

```
/brands/[brandId]/chat                    → Chat list
/brands/[brandId]/chat/new                → New chat
/brands/[brandId]/chat/[chatId]           → Specific chat
/brands/[brandId]/chat/[chatId]/share     → Share settings
```

**Benefits:**
- Brand context always in URL
- Easy to validate route params
- Clear data isolation
- Shareable brand-specific links

## Helper Functions

### 1. Check Brand Access
```sql
SELECT user_has_brand_access(
  'user-uuid',
  'brand-id'
) AS has_access;
```

### 2. Get User's Brand Role
```sql
SELECT get_user_brand_role(
  'user-uuid',
  'brand-id'
) AS role;
```

### 3. Validate Chat Access
```sql
SELECT * FROM validate_chat_access(
  'user-uuid',
  'chat-uuid'
);
-- Returns: has_access, brand_id, user_role
```

### 4. Get Brand Chats
```sql
SELECT * FROM get_brand_chats(
  'user-uuid',
  'brand-id',
  50,  -- limit
  0    -- offset
);
```

## Testing Scenarios

### Test 1: Cross-Brand Access Prevention
```typescript
// User A belongs to Brand X
// User A tries to access chat from Brand Y
const result = await fetch('/api/chat', {
  body: JSON.stringify({
    chatId: 'brand-y-chat-id',
    brandId: 'brand-x',  // Mismatch!
  })
});
// Expected: 403 Forbidden
```

### Test 2: Brand Switch Mid-Chat
```typescript
// User switches from Brand X to Brand Y
setActiveBrandId('brand-y');

// Previous chat from Brand X should not be accessible
const chat = await getChat('brand-x-chat-id');
// Expected: Error or redirect
```

### Test 3: Inactive Member Access
```typescript
// User's brand_users.status = 'inactive'
const chats = await getBrandChats(brandId, userId);
// Expected: Empty array or error
```

### Test 4: Public Chat Visibility
```typescript
// User B in Brand X
// Chat created by User A in Brand X with visibility='public'
const chats = await getBrandChats('brand-x', 'user-b-id');
// Expected: Includes User A's public chats
```

## Migration Checklist

- [x] Add brand_id to chats table (NOT NULL)
- [x] Create brand validation functions
- [x] Add brand access trigger
- [x] Update RLS policies for brand filtering
- [x] Add brand-scoped indexes
- [x] Create get_brand_chats function
- [x] Create validate_chat_access function
- [ ] Update frontend to use brand context
- [ ] Add brand selector component
- [ ] Update API routes with validation
- [ ] Test cross-brand access prevention
- [ ] Test brand switching behavior

## Performance Considerations

### Indexes for Brand Queries
```sql
-- Composite index for common query pattern
CREATE INDEX idx_chats_brand_user_last_message 
  ON chats(brand_id, user_id, last_message_at DESC);

-- Partial index for active chats
CREATE INDEX idx_chats_brand_archived 
  ON chats(brand_id, archived) 
  WHERE NOT archived;
```

### Query Optimization
- Always filter by `brand_id` first (most selective)
- Use composite indexes for multi-column filters
- Leverage partial indexes for common WHERE clauses
- Consider materialized views for analytics

## Summary

**Brand isolation is enforced at 4 levels:**
1. 🔒 **Database Triggers** - Prevent invalid inserts
2. 🔒 **RLS Policies** - Filter all queries automatically
3. 🔒 **API Validation** - Verify access before operations
4. 🔒 **UI Context** - Ensure correct brand always selected

**Every chat operation requires:**
- ✅ Valid `brand_id`
- ✅ User is active member of brand
- ✅ Brand context in URL/API calls
- ✅ Validation before sensitive operations

This architecture ensures **complete data isolation** between brands while maintaining a seamless user experience! 🎯
