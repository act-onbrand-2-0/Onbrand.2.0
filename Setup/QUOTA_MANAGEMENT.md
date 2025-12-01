# Quota Management System

## Overview

Each brand has token-based quotas that can be topped up by **Company Admins** from ACT. This ensures fair usage and cost control across all brands.

---

## Role System (Updated)

### Role Hierarchy

1. **Company Admin** (Level 6) - ACT Superadmin
   - Full access to all brands
   - Can top up quotas for any brand
   - Manages platform-wide settings
   - **Only ACT company has Company Admins**

2. **Owner** (Level 5) - Brand Owner
   - Full access to their brand
   - Can manage users and settings
   - Can view quota usage
   - Cannot top up quotas (must request from Company Admin)

3. **Creator** (Level 3) - Content Creator
   - Can create and publish content
   - Can use AI features
   - Can upload documents
   - Consumes quotas when using AI

4. **Reviewer** (Level 2) - Content Reviewer
   - Can view and review content
   - Cannot publish or edit
   - Cannot use AI features

5. **User** (Level 1) - Basic User
   - Read-only access
   - Can view analytics
   - Cannot create or modify content

---

## Quota Types

### 1. **Prompt Tokens**
- Used for: OpenAI/Anthropic API calls
- Default: 100,000 tokens per brand
- Resets: Every 30 days
- Tracked per: API request

### 2. **Image Generation**
- Used for: AI image generation (Replicate)
- Default: 100 images per brand
- Resets: Every 30 days
- Tracked per: Image generated

### 3. **Workflow Executions**
- Used for: n8n workflow triggers
- Default: 1,000 executions per brand
- Resets: Every 30 days
- Tracked per: Workflow run

### 4. **Storage**
- Used for: File uploads
- Default: 1GB (1,024 MB) per brand
- No auto-reset
- Tracked by: Total file size

---

## Database Schema

### `brand_quotas` Table

```sql
CREATE TABLE public.brand_quotas (
  id UUID PRIMARY KEY,
  brand_id TEXT REFERENCES brands(id) UNIQUE,
  
  -- Token quotas
  prompt_tokens_limit INTEGER DEFAULT 100000,
  prompt_tokens_used INTEGER DEFAULT 0,
  prompt_tokens_reset_at TIMESTAMP WITH TIME ZONE,
  
  -- Image generation
  image_generation_limit INTEGER DEFAULT 100,
  image_generation_used INTEGER DEFAULT 0,
  
  -- Storage
  storage_limit_mb INTEGER DEFAULT 1024,
  
  -- Workflows
  workflow_executions_limit INTEGER DEFAULT 1000,
  workflow_executions_used INTEGER DEFAULT 0,
  
  -- Tracking
  last_topped_up_at TIMESTAMP WITH TIME ZONE,
  last_topped_up_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `quota_transactions` Table

Audit trail of all quota changes:

```sql
CREATE TABLE public.quota_transactions (
  id UUID PRIMARY KEY,
  brand_id TEXT REFERENCES brands(id),
  transaction_type TEXT CHECK (transaction_type IN ('topup', 'usage', 'reset', 'deduction')),
  quota_type TEXT CHECK (quota_type IN ('prompt_tokens', 'image_generation', 'workflow_executions')),
  amount INTEGER,
  previous_value INTEGER,
  new_value INTEGER,
  performed_by UUID REFERENCES auth.users(id),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Usage Examples

### Check Brand Quota

```typescript
import { getBrandQuota } from '@act/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

const { quota, error } = await getBrandQuota(supabase, 'act');

if (quota) {
  console.log('Prompt tokens:', quota.prompt_tokens_used, '/', quota.prompt_tokens_limit);
  console.log('Images:', quota.image_generation_used, '/', quota.image_generation_limit);
}
```

### Check If Brand Has Quota

```typescript
import { checkQuota } from '@act/auth';

// Check if brand has 5000 tokens available
const { hasQuota, remaining, error } = await checkQuota(
  supabase,
  'act',
  'prompt_tokens',
  5000
);

if (hasQuota) {
  console.log(`Brand has enough quota. Remaining: ${remaining} tokens`);
} else {
  console.log('Insufficient quota!');
}
```

### Use Quota

```typescript
import { useQuota } from '@act/auth';

// Use 5000 tokens for an AI request
const { success, error } = await useQuota(
  supabase,
  'act',
  'prompt_tokens',
  5000
);

if (success) {
  // Proceed with AI request
  console.log('Quota deducted successfully');
} else {
  console.error('Quota exceeded:', error);
}
```

### Top Up Quota (Company Admin Only)

```typescript
import { topupQuota } from '@act/auth';

// Add 50,000 tokens to a brand
const { success, error } = await topupQuota(
  supabase,
  'brand-id',
  'prompt_tokens',
  50000,
  'Monthly top-up'
);

if (success) {
  console.log('Quota topped up successfully');
}
```

### Get Quota Status Summary

```typescript
import { getQuotaStatus } from '@act/auth';

const { status, error } = await getQuotaStatus(supabase, 'act');

if (status) {
  console.log('Prompt Tokens:', status.prompt_tokens.percent + '%');
  console.log('Is Low:', status.prompt_tokens.isLow);
  
  console.log('Images:', status.image_generation.percent + '%');
  console.log('Workflows:', status.workflow_executions.percent + '%');
}
```

### Get Transaction History

```typescript
import { getQuotaTransactions } from '@act/auth';

const { transactions, error } = await getQuotaTransactions(
  supabase,
  'act',
  {
    quotaType: 'prompt_tokens',
    transactionType: 'usage',
    limit: 50,
  }
);

transactions.forEach(tx => {
  console.log(`${tx.created_at}: ${tx.amount} tokens used`);
});
```

---

## Edge Function Integration

When making AI requests, check and use quota:

```typescript
// In your OpenAI proxy edge function
import { Deno } from 'https://deno.land/x/deno@v1.30.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Check quota before API call
const { data: hasQuota } = await supabase.rpc('check_and_use_quota', {
  p_brand_id: brandId,
  p_quota_type: 'prompt_tokens',
  p_amount: estimatedTokens,
});

if (!hasQuota) {
  return new Response(
    JSON.stringify({ error: 'Quota exceeded' }),
    { status: 429 }
  );
}

// Make OpenAI API call
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  // ... request
});

// Update quota with actual usage
await supabase.rpc('check_and_use_quota', {
  p_brand_id: brandId,
  p_quota_type: 'prompt_tokens',
  p_amount: actualTokensUsed,
});
```

---

## RLS Policies

### View Quotas
- Users can view quotas for brands they belong to
- Owners can view detailed quota information

### Update Quotas
- **Only Company Admins from ACT** can top up quotas
- System functions can deduct usage

### Audit Trail
- Users can view transaction history for their brands
- Only Company Admins can create topup transactions

---

## Quota Alerts

### Low Quota Warning (< 20%)
```typescript
import { isQuotaRunningLow } from '@act/auth';

const isLow = isQuotaRunningLow(80000, 100000); // 80% used
if (isLow) {
  // Send notification to brand owner
  console.log('Warning: Quota running low!');
}
```

### Quota Exhausted
```typescript
import { isQuotaExhausted } from '@act/auth';

const exhausted = isQuotaExhausted(100000, 100000);
if (exhausted) {
  // Block new requests
  console.log('Quota exhausted! Please contact admin for top-up.');
}
```

---

## Default Quotas

### ACT Brand (Special)
- Prompt Tokens: 1,000,000
- Image Generation: 1,000
- Workflow Executions: 10,000
- Storage: Unlimited

### New Brands (Default)
- Prompt Tokens: 100,000
- Image Generation: 100
- Workflow Executions: 1,000
- Storage: 1GB (1,024 MB)

---

## Top-Up Workflow

1. **Brand Owner** notices low quota
2. **Brand Owner** requests top-up from ACT
3. **Company Admin** (ACT) reviews request
4. **Company Admin** approves and tops up:
   ```typescript
   await topupQuota(supabase, brandId, 'prompt_tokens', 50000);
   ```
5. **Transaction logged** automatically
6. **Brand Owner** receives notification

---

## Monitoring & Analytics

### Track Usage Trends
```typescript
const { transactions } = await getQuotaTransactions(
  supabase,
  brandId,
  { quotaType: 'prompt_tokens', limit: 30 }
);

// Calculate daily average
const dailyUsage = transactions
  .filter(tx => tx.transaction_type === 'usage')
  .reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / 30;

console.log(`Average daily usage: ${dailyUsage} tokens`);
```

### Predict Exhaustion Date
```typescript
const { quota } = await getBrandQuota(supabase, brandId);
const remaining = quota.prompt_tokens_limit - quota.prompt_tokens_used;

// Based on average daily usage
const daysRemaining = remaining / dailyUsage;
console.log(`Quota will exhaust in ${Math.floor(daysRemaining)} days`);
```

---

## Security

- ✅ **RLS Enforced**: Users can only see their brand quotas
- ✅ **Database Functions**: Quota operations use secure server-side functions
- ✅ **Audit Trail**: All changes logged with user ID and timestamp
- ✅ **Role-Based**: Only Company Admins can top up
- ✅ **Brand Isolation**: No cross-brand quota access

---

## API Rate Limits

When quota is low or exhausted, return appropriate status codes:

```typescript
// 429 Too Many Requests - Quota exceeded
if (quotaExhausted) {
  return new Response(
    JSON.stringify({
      error: 'Quota exceeded',
      message: 'Your brand has exhausted its token quota. Please contact support.',
      retry_after: resetDate,
    }),
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(resetTimestamp),
      },
    }
  );
}
```

---

## Migration Applied

✅ **Migration:** `20251201141400_update_roles_and_add_quotas.sql`  
✅ **Tables Created:** `brand_quotas`, `quota_transactions`  
✅ **Functions Created:** `check_and_use_quota()`, `topup_quota()`  
✅ **RLS Applied:** All policies active  
✅ **Default Quotas:** ACT brand initialized  

---

**Your quota management system is production-ready! 🎯**
