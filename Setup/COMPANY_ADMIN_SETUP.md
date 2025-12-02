# Setting Up ACT Company Admins

## Overview

**Company Admins** are superusers who belong to the ACT brand and have platform-wide access. They can:
- Manage all brands
- Top up quotas for any brand
- View all analytics and data
- Manage other Company Admins

---

## Methods to Create Company Admins

### **Method 1: Direct SQL (First Admin Setup)**

Use this method to create your **very first Company Admin** when the platform is empty.

```sql
-- Step 1: Sign up a user via GitHub OAuth
-- (User will be auto-assigned to ACT brand with 'user' role)

-- Step 2: Manually promote them to Company Admin
UPDATE public.brand_users
SET role = 'company_admin'
WHERE user_id = 'USER_UUID_HERE' 
  AND brand_id = 'act';
```

**To get the user UUID:**
```sql
-- Find user by email
SELECT id, email FROM auth.users WHERE email = 'admin@act.com';
```

**Complete example:**
```sql
-- 1. Find your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@act.com';

-- 2. Promote to Company Admin
UPDATE public.brand_users
SET role = 'company_admin'
WHERE user_id = '12345678-1234-1234-1234-123456789abc'
  AND brand_id = 'act';

-- 3. Verify
SELECT u.email, bu.role, bu.brand_id
FROM public.brand_users bu
JOIN auth.users u ON u.id = bu.user_id
WHERE bu.brand_id = 'act' AND bu.role = 'company_admin';
```

---

### **Method 2: Database Function (Recommended)**

Once you have at least one Company Admin, use the database function:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key
);

// Promote user to Company Admin
const { data, error } = await supabase.rpc('set_company_admin', {
  p_user_id: 'user-uuid-here'
});

if (!error) {
  console.log('User promoted to Company Admin!');
}
```

---

### **Method 3: TypeScript Utility (Best for Apps)**

Use the provided utility functions:

```typescript
import { setCompanyAdmin, createClient } from '@act/auth';

const supabase = createClient(url, serviceRoleKey);

// Promote user
const { success, error } = await setCompanyAdmin(
  supabase,
  'user-uuid-here'
);

if (success) {
  console.log('User is now a Company Admin!');
}
```

---

### **Method 4: Via Supabase Dashboard**

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/editor
2. Open Table Editor → `brand_users`
3. Find the user's row where `brand_id = 'act'`
4. Change `role` from `user` to `company_admin`
5. Save

---

## Complete Setup Workflow

### **Initial Setup (First Admin)**

**Step 1: Create ACT Brand User**
```bash
# User signs up via GitHub OAuth
# System auto-creates record in brand_users with role='user'
```

**Step 2: Promote to Company Admin (SQL)**
```sql
-- Run in Supabase SQL Editor
UPDATE public.brand_users
SET role = 'company_admin'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'your-email@act.com'
)
AND brand_id = 'act';
```

**Step 3: Verify**
```sql
SELECT 
  u.email,
  bu.role,
  bu.brand_id,
  bu.created_at
FROM public.brand_users bu
JOIN auth.users u ON u.id = bu.user_id
WHERE bu.brand_id = 'act' 
  AND bu.role = 'company_admin';
```

---

### **Adding Additional Company Admins**

Once you have one Company Admin, they can promote others:

```typescript
import { setCompanyAdmin, listCompanyAdmins } from '@act/auth';

// 1. New user signs up
// 2. Company Admin promotes them

const { success } = await setCompanyAdmin(supabase, newUserId);

// 3. List all admins
const { admins } = await listCompanyAdmins(supabase);
console.log('Company Admins:', admins);
```

---

## Management Functions

### **List All Company Admins**

```typescript
import { listCompanyAdmins } from '@act/auth';

const { admins, error } = await listCompanyAdmins(supabase);

admins.forEach(admin => {
  console.log(`${admin.email} (${admin.full_name})`);
  console.log(`User ID: ${admin.user_id}`);
  console.log(`Added: ${admin.created_at}`);
});
```

### **Check If User Is Company Admin**

```typescript
import { isCompanyAdmin, checkIsCompanyAdmin } from '@act/auth';

// Check specific user
const { isAdmin } = await isCompanyAdmin(supabase, userId);

// Check current logged-in user
const isCurrentUserAdmin = await checkIsCompanyAdmin(supabase);

if (isCurrentUserAdmin) {
  console.log('Current user is a Company Admin');
}
```

### **Remove Company Admin** (Demote to Owner)

```typescript
import { removeCompanyAdmin } from '@act/auth';

// Demotes to 'owner' role instead of deleting
const { success, error } = await removeCompanyAdmin(supabase, userId);

if (success) {
  console.log('User demoted to Owner role');
}
```

---

## API Route Example

Create an admin management API:

```typescript
// app/api/admin/promote/route.ts
import { createClient } from '@supabase/supabase-js';
import { setCompanyAdmin, checkIsCompanyAdmin } from '@act/auth';

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get current user
  const authHeader = req.headers.get('authorization');
  const userSupabase = createClient(
    process.env.SUPABASE_URL!,
    authHeader?.replace('Bearer ', '') || ''
  );

  // Check if requester is Company Admin
  const isAdmin = await checkIsCompanyAdmin(userSupabase);
  if (!isAdmin) {
    return new Response('Forbidden', { status: 403 });
  }

  // Get target user ID from body
  const { userId } = await req.json();

  // Promote user
  const { success, error } = await setCompanyAdmin(supabase, userId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ success: true }));
}
```

---

## Security & Permissions

### **What Company Admins Can Do:**
- ✅ Top up quotas for any brand
- ✅ View all brands and their data
- ✅ Manage users across all brands
- ✅ Access all analytics and reports
- ✅ Promote/demote other Company Admins
- ✅ All permissions from lower roles

### **RLS Protection:**
- Only existing Company Admins can promote others
- Service role key required for initial setup
- All actions are logged in `quota_transactions` and audit logs
- Company Admin role is specific to ACT brand only

### **Best Practices:**
- ⚠️ Limit number of Company Admins (2-5 recommended)
- 🔒 Use 2FA/MFA for all Company Admin accounts
- 📝 Log all admin actions
- 🔄 Regular access reviews
- 🚫 Never share service role keys

---

## Database Functions Reference

### `set_company_admin(p_user_id UUID)`
**Purpose:** Promote user to Company Admin  
**Access:** Company Admins or service role  
**Returns:** `BOOLEAN` (success/failure)

### `remove_company_admin(p_user_id UUID)`
**Purpose:** Demote Company Admin to Owner  
**Access:** Company Admins or service role  
**Returns:** `BOOLEAN` (success/failure)

### `list_company_admins()`
**Purpose:** Get all Company Admins  
**Access:** Anyone  
**Returns:** Table of admins with email, name, created_at

### `is_company_admin(p_user_id UUID)`
**Purpose:** Check if user is Company Admin  
**Access:** Anyone  
**Returns:** `BOOLEAN`

---

## Common Scenarios

### **Scenario 1: Platform Initialization**
```sql
-- After first user signs up via OAuth
UPDATE public.brand_users
SET role = 'company_admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'founder@act.com')
  AND brand_id = 'act';
```

### **Scenario 2: Add Second Admin**
```typescript
// Existing admin promotes new admin
await setCompanyAdmin(supabase, newUserId);
```

### **Scenario 3: Temporary Admin Access**
```typescript
// Grant temporary admin
await setCompanyAdmin(supabase, tempUserId);

// Later, remove access
await removeCompanyAdmin(supabase, tempUserId);
// User is now 'owner' instead of 'company_admin'
```

### **Scenario 4: Audit Admin Actions**
```typescript
// Get all quota topups by admins
const { data } = await supabase
  .from('quota_transactions')
  .select('*, performed_by_user:auth.users!performed_by(email)')
  .eq('transaction_type', 'topup')
  .order('created_at', { ascending: false });
```

---

## Troubleshooting

### **Problem: Can't promote user**
**Solution:** 
1. Verify user exists in `brand_users` with `brand_id = 'act'`
2. Check if you're using service role key (not anon key)
3. Ensure user has signed up and been assigned to ACT brand

### **Problem: User not in ACT brand**
**Solution:**
```sql
-- Manually add user to ACT brand first
INSERT INTO public.brand_users (user_id, brand_id, role)
VALUES ('user-uuid', 'act', 'user');

-- Then promote
UPDATE public.brand_users
SET role = 'company_admin'
WHERE user_id = 'user-uuid' AND brand_id = 'act';
```

### **Problem: Permission denied**
**Solution:** Use service role key for initial admin setup, not anon key.

---

## Migration Applied

✅ **Migration:** `20251202090100_add_company_admin_helpers.sql`  
✅ **Functions Created:** 4 admin management functions  
✅ **RLS Policy:** Company admins can manage other admins  
✅ **Utilities:** TypeScript helpers exported  

---

## Quick Reference

```bash
# CLI: View Company Admins
psql $DATABASE_URL -c "SELECT * FROM list_company_admins();"

# CLI: Promote User
psql $DATABASE_URL -c "SELECT set_company_admin('user-uuid-here');"

# CLI: Check If User Is Admin
psql $DATABASE_URL -c "SELECT is_company_admin('user-uuid-here');"
```

---

**Your Company Admin system is ready! Start by promoting your first admin using Method 1 (SQL). 👤**
