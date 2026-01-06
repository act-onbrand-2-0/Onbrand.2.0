# Supabase Authentication Configuration for Multi-Tenant Setup

## The Problem

When using OAuth (Microsoft/Azure) with subdomains on Netlify, users get 404 errors after login because Supabase doesn't know about your subdomain URLs.

## Required Configuration

### 1. Supabase Dashboard Settings

Go to **Supabase Dashboard → Authentication → URL Configuration**

#### Site URL
```
https://onbrandai.app
```

#### Redirect URLs (Add ALL of these)

**Production URLs:**
```
https://onbrandai.app/auth/callback
https://act.onbrandai.app/auth/callback
https://acme.onbrandai.app/auth/callback
https://nike.onbrandai.app/auth/callback
https://creativetechnologists.onbrandai.app/auth/callback
```

**Netlify Deploy Previews (IMPORTANT!):**
```
https://deploy-preview-*--onbrand-act.netlify.app/auth/callback
https://*--onbrand-act.netlify.app/auth/callback
```

Or if wildcards aren't supported, add specific ones as you create them.

**Local Development:**
```
http://localhost:3000/auth/callback
http://127.0.0.1:3000/auth/callback
```

### 2. Why This Matters

The OAuth flow works like this:

```
1. User on https://act.onbrandai.app/login clicks "Sign in with Microsoft"
   
2. App calls signInWithOAuth() with redirectTo: "https://act.onbrandai.app/auth/callback"

3. Supabase redirects to Azure for authentication

4. Azure authenticates and redirects back to Supabase

5. Supabase checks if the redirectTo URL is in its Redirect URLs allowlist
   - If YES: Redirects to https://act.onbrandai.app/auth/callback
   - If NO: Either fails or redirects to Site URL (causing 404)

6. The callback route exchanges the code for a session and redirects to /dashboard
```

### 3. Adding New Brands/Subdomains

When you add a new brand with a subdomain, you MUST:

1. Add the callback URL to Supabase Dashboard:
   ```
   https://newbrand.onbrandai.app/auth/callback
   ```

2. Add the brand to `BRAND_CONFIGS` in `lib/brand.ts`

3. Add the brand to Netlify DNS if using custom subdomains

### 4. Debugging 404 Errors

If you're getting 404 after login, check:

1. **Browser Network Tab**: Look at where the redirect is going
   - Is it going to `act.onbrandai.app` or just `onbrandai.app`?

2. **Netlify Function Logs**: Check the auth callback logs
   ```
   [Auth Callback] URL: https://...
   [Auth Callback] Origin: https://...
   [Auth Callback] Redirecting to: https://...
   ```

3. **Supabase Dashboard → Authentication → Logs**
   - Look for OAuth errors or redirect URL validation failures

### 5. Environment Variables

Ensure these are set in Netlify:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SITE_URL=https://onbrandai.app
```

For deploy previews, Netlify automatically provides:
- `DEPLOY_URL` - The unique URL for this deploy
- `DEPLOY_PRIME_URL` - The deploy URL or branch URL
- `URL` - The main site URL

The app uses these to construct the correct callback URL.

### 6. Testing OAuth Locally

For local development:

1. Ensure `http://localhost:3000/auth/callback` is in Supabase Redirect URLs
2. Run `pnpm dev`
3. Test OAuth login - it should redirect back to localhost

### 7. Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 404 after OAuth | Redirect URL not in allowlist | Add URL to Supabase Dashboard |
| Redirected to wrong domain | Site URL mismatch | Check `getBrandCallbackUrl()` returns correct origin |
| Session not persisting | Cookie domain issues | Check cookie settings in Supabase client config |
| OAuth error in URL | Azure app misconfigured | Check Azure AD app redirect URIs match Supabase |

### 8. Azure AD Configuration

If using Microsoft OAuth, also ensure Azure AD has the correct redirect URIs:

**Azure Portal → App Registrations → Your App → Authentication → Redirect URIs:**
```
https://your-project.supabase.co/auth/v1/callback
```

This is Supabase's callback URL, NOT your app's. Supabase handles the Azure→Supabase redirect, then redirects to your app.
