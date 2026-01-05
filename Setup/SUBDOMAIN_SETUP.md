# Multi-Tenant Subdomain Setup Guide

This guide explains how to configure wildcard subdomains for OnBrand.ai multi-tenant architecture.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     DNS Provider                             │
│  *.onbrandai.app → CNAME → your-site.netlify.app            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Netlify                                 │
│  Custom Domain: *.onbrandai.app (wildcard)                  │
│  Routes all subdomains to Next.js app                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Middleware                        │
│  1. Extract subdomain from hostname                         │
│  2. Validate brand exists in Supabase                       │
│  3. Pass brand context via headers                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase                                │
│  brands table: { id, name, subdomain, is_active, ... }      │
└─────────────────────────────────────────────────────────────┘
```

## Step 1: DNS Configuration

### Option A: Cloudflare (Recommended)
1. Log into Cloudflare Dashboard
2. Select your domain (`onbrandai.app`)
3. Go to **DNS** → **Records**
4. Add these records:

| Type  | Name | Target                      | Proxy |
|-------|------|-----------------------------| ------|
| CNAME | @    | your-site.netlify.app       | ✓     |
| CNAME | www  | your-site.netlify.app       | ✓     |
| CNAME | *    | your-site.netlify.app       | ✗     |

> ⚠️ **Important**: Wildcard (*) records cannot be proxied in Cloudflare free tier. Set proxy to OFF (gray cloud).

### Option B: Other DNS Providers
Add these DNS records:
```
A     @       75.2.60.5           (Netlify's load balancer)
CNAME www     your-site.netlify.app
CNAME *       your-site.netlify.app
```

## Step 2: Netlify Configuration

### 2.1 Add Custom Domain
1. Go to **Netlify Dashboard** → Your Site → **Domain Management**
2. Click **Add a domain**
3. Add: `onbrandai.app`
4. Click **Add domain**

### 2.2 Add Wildcard Domain
1. In Domain Management, click **Add a domain** again
2. Add: `*.onbrandai.app`
3. Click **Add domain**

### 2.3 SSL Certificate
Netlify automatically provisions SSL for wildcard domains. This may take a few minutes.

1. Go to **Domain Management** → **HTTPS**
2. Ensure "Automatic TLS certificates" is enabled
3. Wait for certificate to be provisioned

## Step 3: Database Setup

Run the migration to add subdomain support:

```bash
cd /Users/dwayne/Documents/ACT/Onbrand.2.0
npx supabase db push
```

Or manually run:
```sql
-- Add subdomain column
ALTER TABLE public.brands ADD COLUMN subdomain TEXT UNIQUE;
ALTER TABLE public.brands ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Set subdomain for existing brands
UPDATE public.brands SET subdomain = LOWER(name) WHERE subdomain IS NULL;

-- Make subdomain required
ALTER TABLE public.brands ALTER COLUMN subdomain SET NOT NULL;

-- Add index for fast lookups
CREATE INDEX idx_brands_subdomain ON public.brands(subdomain);
```

## Step 4: Add a New Brand

To add a new brand (e.g., ODIDDO):

```sql
INSERT INTO public.brands (id, name, display_name, subdomain, is_active)
VALUES (
  'odiddo',           -- id (used internally)
  'odiddo',           -- name
  'ODIDDO',           -- display_name (shown in UI)
  'odiddo',           -- subdomain (for odiddo.onbrandai.app)
  true                -- is_active
);
```

The brand will immediately be accessible at: `https://odiddo.onbrandai.app`

## How It Works

### Request Flow
1. User visits `https://ACT.onbrandai.app/dashboard`
2. DNS resolves `*.onbrandai.app` to Netlify
3. Netlify routes request to Next.js app
4. Middleware extracts subdomain: `act`
5. Middleware queries Supabase: `SELECT * FROM brands WHERE subdomain = 'act'`
6. If valid, sets `x-brand-subdomain` and `x-brand-id` headers
7. App renders with brand context

### Invalid Subdomain Handling
If someone visits `https://invalid.onbrandai.app`:
1. Middleware queries database for `invalid` subdomain
2. No match found → redirects to `https://onbrandai.app`

## Testing Locally

### Option 1: Use /etc/hosts
Add to `/etc/hosts`:
```
127.0.0.1 act.localhost
127.0.0.1 odiddo.localhost
```

Then visit: `http://act.localhost:3000`

### Option 2: Environment Variable
Set in `.env.local`:
```env
NEXT_PUBLIC_DEFAULT_BRAND=act
```

### Option 3: Debug Endpoint
Visit: `http://localhost:3000/api/debug-headers`
This shows what brand headers are being set.

## Troubleshooting

### Subdomain not working
1. Check DNS propagation: `dig +short ACT.onbrandai.app`
2. Verify Netlify domain settings
3. Check browser console for redirect errors

### Brand not found
1. Verify brand exists: `SELECT * FROM brands WHERE subdomain = 'act';`
2. Check `is_active = true`
3. Ensure subdomain is lowercase

### SSL Certificate Issues
1. Wait 10-15 minutes for Netlify to provision
2. Check Netlify Dashboard → HTTPS section
3. Contact Netlify support if persists

## Environment Variables

Ensure these are set in Netlify:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://onbrandai.app
```

## Security Considerations

- Brand validation happens server-side in middleware
- Invalid subdomains are redirected, not served
- Each brand's data is isolated via `brand_id` foreign keys
- RLS policies enforce tenant isolation in Supabase
