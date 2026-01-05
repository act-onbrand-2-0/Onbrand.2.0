import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';
import { createClient } from '@supabase/supabase-js';

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

// Main domains (no brand subdomain)
const MAIN_DOMAINS = [
  'onbrand.ai',
  'www.onbrand.ai',
  'onbrandai.app',
  'www.onbrandai.app',
];

/**
 * Validate brand exists in database by subdomain
 * Uses direct Supabase query for Edge runtime compatibility
 */
async function validateBrandSubdomain(subdomain: string): Promise<{ valid: boolean; brandId: string | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    return { valid: false, brandId: null };
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from('brands')
      .select('id, subdomain, is_active')
      .eq('subdomain', subdomain.toLowerCase())
      .single();
    
    if (error || !data) {
      return { valid: false, brandId: null };
    }
    
    // Check if brand is active (default to true if column doesn't exist yet)
    const isActive = data.is_active !== false;
    return { valid: isActive, brandId: data.id };
  } catch (e) {
    console.error('Error validating brand:', e);
    return { valid: false, brandId: null };
  }
}

/**
 * Extract subdomain from hostname
 */
function extractSubdomain(hostname: string): string {
  // Remove port if present
  let host = hostname.split(':')[0].toLowerCase();
  
  // Check for subdomain pattern (*.onbrandai.app or *.onbrand.ai)
  const subdomainMatch = host.match(/^([^.]+)\.(onbrandai\.app|onbrand\.ai)$/);
  if (subdomainMatch && subdomainMatch[1] !== 'www') {
    return subdomainMatch[1];
  }
  
  // For localhost or other domains, extract first part
  const parts = host.split('.');
  return parts[0];
}

/**
 * Check if hostname is a main domain (not a brand subdomain)
 */
function isMainDomain(hostname: string): boolean {
  const host = hostname.split(':')[0].toLowerCase();
  return MAIN_DOMAINS.includes(host) || host === 'localhost' || host === '127.0.0.1';
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl;
  const pathname = url.pathname;
  
  // Skip static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }
  
  // Extract subdomain from hostname
  const subdomain = extractSubdomain(hostname);
  const isMain = isMainDomain(hostname);
  
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
    
    // User is authenticated - add brand headers to the response
    supabaseResponse.headers.set('x-brand-subdomain', subdomain);
    supabaseResponse.headers.set('x-hostname', hostname);
    supabaseResponse.headers.set('x-is-main-domain', String(isMain));
    return supabaseResponse;
  }
  
  // Check if this is a brand-specific path (/brand/[brandName]/...)
  const brandPathMatch = url.pathname.match(/^\/brand\/([\w-]+)/);
  
  if (brandPathMatch) {
    const requestedBrandId = brandPathMatch[1];
    
    // Validate brand exists in database
    const { valid, brandId } = await validateBrandSubdomain(requestedBrandId);
    
    if (!valid) {
      // Brand doesn't exist or is inactive - redirect to 404
      return NextResponse.redirect(new URL('/404', request.url));
    }
    
    // Pass validated brand ID
    const response = NextResponse.next();
    response.headers.set('x-brand-subdomain', requestedBrandId);
    response.headers.set('x-brand-id', brandId || requestedBrandId);
    response.headers.set('x-hostname', hostname);
    return response;
  }
  
  // For subdomain access (e.g., ACT.onbrandai.app), validate the brand
  if (!isMain && subdomain) {
    const { valid, brandId } = await validateBrandSubdomain(subdomain);
    
    if (!valid) {
      // Invalid subdomain - redirect to main site
      const mainUrl = new URL('/', request.url);
      mainUrl.hostname = 'onbrandai.app';
      return NextResponse.redirect(mainUrl);
    }
    
    // Valid brand subdomain - pass brand info to app
    const response = NextResponse.next();
    response.headers.set('x-brand-subdomain', subdomain);
    response.headers.set('x-brand-id', brandId || subdomain);
    response.headers.set('x-hostname', hostname);
    response.headers.set('x-is-main-domain', 'false');
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Brand validated: ${subdomain} (ID: ${brandId}) from ${hostname}`);
    }
    
    return response;
  }
  
  // Main domain - pass through with headers
  const response = NextResponse.next();
  response.headers.set('x-brand-subdomain', subdomain);
  response.headers.set('x-hostname', hostname);
  response.headers.set('x-is-main-domain', String(isMain));
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`Request: ${hostname}${pathname} (subdomain: ${subdomain}, isMain: ${isMain})`);
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
