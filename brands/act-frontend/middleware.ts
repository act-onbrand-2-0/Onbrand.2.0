import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { hasAccessToBrand } from './lib/auth';
import { isValidBrand } from './lib/brand';

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
  
  // Pass brand subdomain to the app via header
  const response = NextResponse.next();
  response.headers.set('x-brand-subdomain', subdomain);
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
