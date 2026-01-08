import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * OAuth Callback Handler
 * 
 * This route handles the OAuth callback from Supabase Auth.
 * It exchanges the authorization code for a session and redirects
 * the user to the appropriate destination.
 * 
 * IMPORTANT: For this to work with subdomains, you must configure
 * Supabase Dashboard > Authentication > URL Configuration:
 * 
 * 1. Site URL: https://onbrandai.app
 * 2. Redirect URLs (add ALL of these):
 *    - https://onbrandai.app/auth/callback
 *    - https://*.onbrandai.app/auth/callback (if wildcard supported)
 *    - Or explicitly add each subdomain:
 *      - https://act.onbrandai.app/auth/callback
 *      - https://acme.onbrandai.app/auth/callback
 *    - For Netlify deploy previews:
 *      - https://*.netlify.app/auth/callback
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';
  const error_description = requestUrl.searchParams.get('error_description');
  const error_param = requestUrl.searchParams.get('error');

  // Get the actual external hostname from headers (Netlify provides internal URL in request.url)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = request.headers.get('host');
  const actualHost = forwardedHost || host || requestUrl.host;
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const actualOrigin = `${protocol}://${actualHost}`;

  // Log for debugging
  console.log('[Auth Callback] ========== DEBUG ==========');
  console.log('[Auth Callback] request.url:', request.url);
  console.log('[Auth Callback] x-forwarded-host:', forwardedHost);
  console.log('[Auth Callback] host header:', host);
  console.log('[Auth Callback] actualHost:', actualHost);
  console.log('[Auth Callback] actualOrigin:', actualOrigin);
  console.log('[Auth Callback] Code present:', !!code);
  console.log('[Auth Callback] ========== END DEBUG ==========');

  // Handle OAuth errors from provider
  if (error_param) {
    console.error('[Auth Callback] OAuth error:', error_param, error_description);
    const loginUrl = new URL('/login', actualOrigin);
    loginUrl.searchParams.set('error', error_param);
    if (error_description) {
      loginUrl.searchParams.set('error_description', error_description);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing sessions.
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('[Auth Callback] Session exchange error:', error.message);
      return NextResponse.redirect(new URL(`/login?error=auth_failed&message=${encodeURIComponent(error.message)}`, actualOrigin));
    }

    if (data?.user) {
      console.log('[Auth Callback] User authenticated:', data.user.email);
      
      // Successful auth - redirect to intended destination using actualOrigin
      // This preserves the subdomain (e.g., chatbot.onbrandai.app) instead of Netlify deploy URL
      const redirectUrl = new URL(next, actualOrigin);
      console.log('[Auth Callback] Redirecting to:', redirectUrl.toString());
      return NextResponse.redirect(redirectUrl);
    }
  }

  // No code provided - redirect to login
  console.error('[Auth Callback] No code provided');
  return NextResponse.redirect(new URL('/login?error=no_code', actualOrigin));
}
