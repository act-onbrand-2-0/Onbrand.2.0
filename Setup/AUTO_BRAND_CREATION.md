# Auto-Brand Creation System

## Overview

The platform automatically creates brands based on user email domains during signup. No manual setup required!

## How It Works

### 1. User Signs Up

User enters email: `dwayne@creativetechnologists.nl`

### 2. System Extracts Domain

- Full domain: `creativetechnologists.nl`
- Brand slug: `creativetechnologists` (first part of domain)
- Brand name: `Creativetechnologists` (capitalized)

### 3. Auto-Create Brand

If brand doesn't exist:
```sql
INSERT INTO brands (id, name, description)
VALUES (
  'creativetechnologists',
  'Creativetechnologists',
  'Auto-created from creativetechnologists.nl'
);
```

### 4. Assign User to Brand

```sql
INSERT INTO brand_users (user_id, brand_id, role)
VALUES (
  'user-uuid',
  'creativetechnologists',
  'owner'  -- First user becomes owner!
);
```

### 5. Data Isolation

User can only see data for their brand (enforced by RLS policies).

---

## Examples

### Example 1: Creative Technology Collective

```
Email: dwayne@creativetechnologists.nl

Extracted:
- Domain: creativetechnologists.nl
- Brand ID: creativetechnologists
- Brand Name: Creativetechnologists
- Role: owner (first user)

Result:
✅ Brand created
✅ User assigned as owner
✅ User can invite team members
```

### Example 2: Multiple Users from Same Domain

```
First user:
- Email: dwayne@acmecompany.com
- Role: owner

Second user:
- Email: john@acmecompany.com  
- Role: user (brand already exists)

Third user:
- Email: jane@acmecompany.com
- Role: user
```

**All three users belong to "acmecompany" brand!**

---

## User Roles

### Owner (First User)
- First person to sign up from a domain
- Full admin privileges
- Can invite users
- Can manage brand settings

### User (Subsequent Users)
- Additional users from same domain
- Standard access
- Can be promoted to admin by owner

### Admin
- Can be assigned by owner
- Elevated privileges
- Can manage users

---

## Signup Flow

### Step 1: User Enters Email

```
┌─────────────────────────────────────────┐
│ Email: dwayne@creativetechnologists.nl  │
└─────────────────────────────────────────┘
```

### Step 2: Brand Preview Shown

```
┌─────────────────────────────────────────┐
│ ℹ️ Creating account for:                │
│ Creativetechnologists                   │
│                                         │
│ Brand ID: creativetechnologists         │
│ (auto-detected from email domain)      │
└─────────────────────────────────────────┘
```

### Step 3: User Completes Signup

```
✅ Account created
✅ Brand created (if new)
✅ User assigned to brand
✅ Email confirmation sent
```

---

## Brand Naming Rules

### Domain Processing

| Email Domain | Brand ID | Brand Name |
|-------------|----------|------------|
| `creativetechnologists.nl` | `creativetechnologists` | `Creativetechnologists` |
| `acmecompany.com` | `acmecompany` | `Acmecompany` |
| `tech-startup.io` | `tech-startup` | `Tech-startup` |
| `my.company.co.uk` | `my` | `My` |

**Note:** Brand ID is lowercase slug, Brand Name is capitalized.

---

## Database Tables

### brands

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Brand slug (e.g., "creativetechnologists") |
| `name` | TEXT | Display name (e.g., "Creativetechnologists") |
| `description` | TEXT | Auto-generated description |
| `created_at` | TIMESTAMP | When brand was created |

### brand_users

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID | User ID from auth.users |
| `brand_id` | TEXT | Brand ID (references brands.id) |
| `role` | TEXT | "owner", "admin", or "user" |
| `created_at` | TIMESTAMP | When user joined brand |

---

## Data Isolation

### Row Level Security (RLS)

All data tables have RLS policies that automatically filter by brand:

```sql
-- Example: content table
CREATE POLICY "Users can view brand content"
  ON content FOR SELECT
  USING (
    brand_id IN (
      SELECT brand_id FROM brand_users
      WHERE user_id = auth.uid()
    )
  );
```

**Result:** Users can ONLY see data from their brand(s).

---

## Multi-Brand Users (Future)

Currently, each user belongs to ONE brand (their email domain).

**Future enhancement:** Allow users to be invited to multiple brands.

```sql
-- User could belong to multiple brands
brand_users:
- user-123 → creativetechnologists (owner)
- user-123 → acmecompany (user)
- user-123 → techstartup (admin)
```

---

## Advantages

### ✅ Zero Manual Setup
- No admin intervention needed
- Brands created automatically
- Users assigned automatically

### ✅ Scalable
- Unlimited brands
- Self-service onboarding
- No bottlenecks

### ✅ Secure
- Automatic data isolation
- RLS enforced at database level
- Users can't access other brands

### ✅ Simple UX
- Users just enter email
- Brand auto-detected
- Clear visual feedback

---

## Limitations

### Email-Based Only
- Brand determined by email domain
- Can't manually choose brand during signup
- Personal emails (gmail.com, etc.) create individual brands

### Single Brand Per User
- Users currently belong to one brand
- Based on email domain
- Can't switch brands (yet)

### Domain Collisions
- `user@company.com` and `user@company.co.uk` create separate brands
- Consider implementing domain aliases

---

## Common Scenarios

### Scenario 1: Company Onboarding

```
1. First employee signs up: ceo@newcompany.com
   → Brand "newcompany" created
   → CEO becomes owner

2. Second employee: dev@newcompany.com
   → Joins existing "newcompany" brand
   → Becomes user

3. All employees see same data
   → Shared brand workspace
   → Automatic collaboration
```

### Scenario 2: Freelancer/Consultant

```
1. Freelancer signs up: john@johndoe.com
   → Brand "johndoe" created
   → John is owner

2. John's clients sign up elsewhere
   → Different brands
   → Data isolated

3. John only sees his own data
   → Personal workspace
```

### Scenario 3: Enterprise with Subdomains

```
1. User signs up: dev@engineering.megacorp.com
   → Brand "engineering" created

2. User signs up: sales@sales.megacorp.com  
   → Brand "sales" created

3. Two separate brands!
   → Consider using root domain only
   → Or implement brand merging
```

---

## Customization

### Change Brand Naming

Edit migration: `20251202160000_auto_create_brand_from_email.sql`

```sql
-- Current: Uses first part of domain
brand_slug := split_part(email_domain, '.', 1);

-- Alternative: Use full domain
brand_slug := replace(email_domain, '.', '-');
-- Result: creativetechnologists-nl

-- Alternative: Custom mapping
brand_slug := CASE
  WHEN email_domain = 'gmail.com' THEN 'personal-' || split_part(NEW.email, '@', 1)
  ELSE split_part(email_domain, '.', 1)
END;
```

### Customize Display Names

```sql
-- Current: Simple capitalization
brand_display_name := initcap(brand_slug);

-- Alternative: Proper title case
brand_display_name := regexp_replace(
  initcap(replace(brand_slug, '-', ' ')),
  '\s+', ' ', 'g'
);
-- "tech-startup" → "Tech Startup"
```

---

## Migration

### Apply the Migration

```bash
# Connect to Supabase
supabase db push

# Or run SQL directly in Supabase Dashboard
```

The migration will:
1. Replace old trigger
2. Add auto-brand creation logic
3. Make first user owner automatically

---

## Testing

### Test Auto-Creation

1. Sign up with: `test@mytestcompany.com`
2. Check brand preview appears
3. Complete signup
4. Verify in database:

```sql
-- Check brand was created
SELECT * FROM brands WHERE id = 'mytestcompany';

-- Check user was assigned as owner
SELECT * FROM brand_users 
WHERE brand_id = 'mytestcompany' 
  AND role = 'owner';
```

### Test Multiple Users

1. First user: `alice@company.com` → owner
2. Second user: `bob@company.com` → user
3. Both should see same brand data

---

## Troubleshooting

### Brand Not Created?

Check database logs for errors:
```sql
SELECT * FROM postgres_logs 
WHERE message LIKE '%handle_new_user%'
ORDER BY timestamp DESC;
```

### User Not Assigned to Brand?

Check `brand_users` table:
```sql
SELECT * FROM brand_users WHERE user_id = 'user-uuid';
```

### Wrong Role Assigned?

First user should always be owner:
```sql
-- Fix manually if needed
UPDATE brand_users 
SET role = 'owner'
WHERE user_id = 'user-uuid' 
  AND brand_id = 'brand-slug';
```

---

## Summary

**Auto-brand creation system:**
- ✅ Extracts brand from email domain
- ✅ Creates brand automatically
- ✅ Assigns first user as owner
- ✅ Isolates data by brand
- ✅ Zero manual setup
- ✅ Scales infinitely

**Perfect for:**
- SaaS platforms
- Multi-tenant applications
- Company workspaces
- Team collaboration tools

**Try it:** Sign up with your company email and watch your brand appear!
