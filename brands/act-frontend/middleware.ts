import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isValidBrand } from './lib/brand';

// Routes that require authentication (handled client-side for now)
// Supabase stores session in localStorage, not cookies, so middleware can't check auth
// Auth is enforced in the page components instead
const PROTECTED_ROUTES: string[] = [
  // '/configuration',  // Handled client-side
  // '/settings',
  // '/admin',
];

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl;
  
  // Extract subdomain
  // Examples: nike.onbrand.ai -> nike, localhost:3000 -> localhost
  let subdomain = hostname.split('.')[0];
  
  // Handle localhost with port
  if (subdomain.includes(':')) {
    subdomain = subdomain.split(':')[0];
  }
  
  console.log('Middleware - hostname:', hostname, 'subdomain:', subdomain);
  
  // Check if this is a brand-specific path
  const brandPathMatch = url.pathname.match(/^\/brand\/([\w-]+)(\/.*)?/);
  
  if (brandPathMatch) {
    const requestedBrandId = brandPathMatch[1];
    const subPath = brandPathMatch[2] || '';
    
    // Ensure the brand exists
    if (!isValidBrand(requestedBrandId)) {
      // Brand doesn't exist - redirect to 404
      return NextResponse.redirect(new URL('/404', request.url));
    }
    
    // Check if this is a protected route
    const isProtectedRoute = PROTECTED_ROUTES.some(route => subPath.startsWith(route));
    
    if (isProtectedRoute) {
      console.log(`[Middleware] Protected route accessed: ${url.pathname}`);
      
      // Check for Supabase auth cookie
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
          },
        });
        
        // Log all cookies for debugging
        const allCookies = request.cookies.getAll();
        console.log(`[Middleware] All cookies:`, allCookies.map(c => c.name));
        
        // Get session from cookie
        const accessToken = request.cookies.get('sb-access-token')?.value;
        
        // Also check for the combined auth cookie (newer Supabase format)
        // Format: sb-<project-ref>-auth-token
        const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
        const authCookieName = `sb-${projectRef}-auth-token`;
        const authCookie = request.cookies.get(authCookieName)?.value;
        
        console.log(`[Middleware] Looking for cookie: ${authCookieName}`);
        console.log(`[Middleware] Auth cookie found: ${!!authCookie}`);
        console.log(`[Middleware] Access token found: ${!!accessToken}`);
        
        let isAuthenticated = false;
        
        if (authCookie) {
          try {
            const parsed = JSON.parse(authCookie);
            console.log(`[Middleware] Parsed auth cookie, has access_token: ${!!parsed.access_token}`);
            if (parsed.access_token) {
              const { data: { user }, error } = await supabase.auth.getUser(parsed.access_token);
              console.log(`[Middleware] User from token:`, user?.email, 'Error:', error?.message);
              isAuthenticated = !!user;
            }
          } catch (e) {
            console.error('[Middleware] Auth cookie parse error:', e);
          }
        } else if (accessToken) {
          const { data: { user }, error } = await supabase.auth.getUser(accessToken);
          console.log(`[Middleware] User from access token:`, user?.email, 'Error:', error?.message);
          isAuthenticated = !!user;
        }
        
        console.log(`[Middleware] Is authenticated: ${isAuthenticated}`);
        
        if (!isAuthenticated) {
          // Redirect to login with return URL
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('returnTo', url.pathname);
          console.log(`[Middleware] Redirecting to: ${loginUrl.toString()}`);
          return NextResponse.redirect(loginUrl);
        }
        
        console.log(`[Middleware] Access granted to ${url.pathname}`);
      }
    }
  }
  
  // Handle parent domain (onbrand.ai)
  if (
    hostname === 'onbrand.ai' || 
    hostname === 'www.onbrand.ai' ||
    hostname === 'onbrandai.app' ||
    hostname === 'www.onbrandai.app' ||
    hostname.startsWith('localhost')
  ) {
    // Redirect to marketing page for parent domain
    if (url.pathname === '/' || url.pathname === '') {
      return NextResponse.rewrite(new URL('/marketing', request.url));
    }
  }
  
  // Get the brand from URL path if it exists (already checked above)
  let brandFromUrl = brandPathMatch ? brandPathMatch[1] : null;
  
  // Pass brand subdomain to the app via header, prioritizing URL path brand if available
  const response = NextResponse.next();
  response.headers.set('x-brand-subdomain', brandFromUrl || subdomain);
  response.headers.set('x-hostname', hostname);
  
  // Optional: Log brand detection for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`Brand detected: ${subdomain} from ${hostname}`);
  }
  
  return response;
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    // Match all routes except static assets
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
    // Match brand-specific routes for tenant isolation
    '/brand/:brandName*',
    // Ensure API routes are checked too
    '/api/:path*'
  ],
};
