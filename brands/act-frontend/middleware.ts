import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
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
    // Match all routes including API routes for testing
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
