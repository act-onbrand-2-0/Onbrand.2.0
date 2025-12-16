import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';
import { isValidBrand } from './lib/brand';

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/chat',
  '/dashboard',
  '/settings',
];

// Routes that are public (no auth required)
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth',
  '/marketing',
  '/api/auth',
  '/api/chat',
  '/brand',
  '/_next',
  '/favicon.ico',
];

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl;
  const pathname = url.pathname;
  
  // Skip static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }
  
  // Extract subdomain
  let subdomain = hostname.split('.')[0];
  if (subdomain.includes(':')) {
    subdomain = subdomain.split(':')[0];
  }
  
  // Check if this is a protected route
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
  
  // For protected routes, check authentication using Supabase SSR
  if (isProtectedRoute && !isPublicRoute) {
    const { user, supabaseResponse } = await updateSession(request);
    
    if (!user) {
      // Not authenticated - redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // User is authenticated - continue with the updated response (includes refreshed cookies)
    return supabaseResponse;
  }
  
  // Check if this is a brand-specific path
  const brandPathMatch = url.pathname.match(/^\/brand\/([\w-]+)/);
  
  if (brandPathMatch) {
    const requestedBrandId = brandPathMatch[1];
    
    // Ensure the brand exists
    if (!isValidBrand(requestedBrandId)) {
      // Brand doesn't exist - redirect to 404
      return NextResponse.redirect(new URL('/404', request.url));
    }
    
    // Get session and user for tenant isolation
    const authHeader = request.headers.get('authorization');
    let userId = null;
    
    // Only check authorization for authenticated routes
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        // If we have auth token, get the user ID
        // In a real implementation you'd validate the JWT token here
        // For now, we'll assume the user is always allowed
      } catch (e) {
        console.error('Auth error:', e);
      }
    }
    
    // For now, allow access in development - in production, you would check:
    // if (userId && process.env.NODE_ENV === 'production') {
    //   // Check if user has access to this brand
    //   const hasAccess = await hasAccessToBrand(userId, requestedBrandId);
    //   if (!hasAccess) {
    //     // User doesn't have access - redirect to their default brand
    //     return NextResponse.redirect(new URL('/unauthorized', request.url));
    //   }
    // }
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
