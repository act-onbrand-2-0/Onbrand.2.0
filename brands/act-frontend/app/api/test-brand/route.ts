import { NextResponse, NextRequest } from 'next/server';
import { getBrandConfig } from '../../../lib/brand';

/**
 * Simple API endpoint to test subdomain-based brand detection
 * We use the request object directly instead of headers() to avoid Promise issues
 */
export async function GET(request: NextRequest) {
  // Get subdomain from request headers directly instead of using headers()
  const subdomain = request.headers.get('x-brand-subdomain') || 'Not set';
  const hostname = request.headers.get('x-hostname') || 'Not set';
  
  // Get brand config
  const brandConfig = getBrandConfig();
  
  return NextResponse.json({
    middleware: {
      subdomain,
      hostname,
    },
    browser: {
      host: request.headers.get('host')
    },
    brand: {
      id: brandConfig.id,
      displayName: brandConfig.displayName,
      colors: brandConfig.colors
    },
    timestamp: new Date().toISOString()
  });
}
