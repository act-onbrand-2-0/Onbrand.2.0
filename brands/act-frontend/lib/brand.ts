/**
 * Brand Detection Utility
 * 
 * Detects which brand the user is accessing based on:
 * 1. Subdomain (e.g., act.yourdomain.com, acme.yourdomain.com)
 * 2. Environment variable override (for development)
 * 3. Defaults to 'act' for localhost and unknown domains
 */

export interface BrandConfig {
  id: string;
  name: string;
  displayName: string;
  domain: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  logo?: string;
  favicon?: string;
}

// Brand configuration registry
const BRAND_CONFIGS: Record<string, BrandConfig> = {
  act: {
    id: 'act',
    name: 'act',
    displayName: 'ACT 2.0',
    domain: 'act',
    colors: {
      primary: '#000000',
      secondary: '#FFFFFF',
      accent: '#FF6B35',
    },
  },
  acme: {
    id: 'acme',
    name: 'acme',
    displayName: 'Acme Corp',
    domain: 'acme',
    colors: {
      primary: '#1E40AF',
      secondary: '#FFFFFF',
      accent: '#F59E0B',
    },
  },
  nike: {
    id: 'nike',
    name: 'nike',
    displayName: 'Nike Brand Portal',
    domain: 'nike',
    colors: {
      primary: '#FF2B19',
      secondary: '#FFFFFF',
      accent: '#000000',
    },
    logo: '/brands/nike/logo.svg',
  },
  creativetechnologists: {
    id: 'creativetechnologists',
    name: 'creativetechnologists',
    displayName: 'Creative Technologists',
    domain: 'creativetechnologists',
    colors: {
      primary: '#6200EA',
      secondary: '#FFFFFF',
      accent: '#00E5FF',
    },
    logo: '/brands/creativetechnologists/logo.svg',
  },
  // Add more brands here as needed
};

/**
 * Detects the current brand from hostname or environment
 * 
 * Detection logic:
 * 1. Check NEXT_PUBLIC_BRAND_ID env var (for development)
 * 2. Extract subdomain from hostname
 * 3. Default to 'act' if not found
 * 
 * Examples:
 * - act.yourdomain.com → 'act'
 * - acme.yourdomain.com → 'acme'
 * - localhost:3000 → 'act' (default)
 * - yourdomain.com → 'act' (default)
 */
export function detectBrandId(): string {
  // Server-side: read from middleware header
  if (typeof window === 'undefined') {
    try {
      // In Next.js App Router, we should avoid using headers() in a synchronous function
      // Instead, we'll rely on alternative detection methods for server components
      // This is a limitation of Next.js 15+ where headers() returns a Promise
      
      // We'll use the environment variable as fallback for server components
      if (process.env.NEXT_PUBLIC_BRAND_ID) {
        return process.env.NEXT_PUBLIC_BRAND_ID;
      }
    } catch (e) {
      console.error('Error in server-side brand detection:', e);
    }
  }
  
  // Check for environment override (useful for development)
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_BRAND_ID) {
    return process.env.NEXT_PUBLIC_BRAND_ID;
  }

  // Client-side: read from window.location
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];
    
    // Handle special cases
    if (hostname.includes('localhost')) {
      return process.env.NEXT_PUBLIC_DEFAULT_BRAND || 'act';
    }
    if (subdomain === 'onbrand' || subdomain === 'www') {
      return process.env.NEXT_PUBLIC_DEFAULT_BRAND || 'act';
    }
    
    // Check if subdomain matches a known brand
    if (BRAND_CONFIGS[subdomain]) {
      return subdomain;
    }
  }
  
  // Fallback
  return process.env.NEXT_PUBLIC_DEFAULT_BRAND || 'act';
}

/**
 * Gets the full brand configuration for the current brand or a specific brand
 * @param specificBrandId Optional brand ID to retrieve. If not provided, detects from context.
 */
export function getBrandConfig(specificBrandId?: string): BrandConfig {
  const brandId = specificBrandId || detectBrandId();
  return BRAND_CONFIGS[brandId] || BRAND_CONFIGS.act;
}

/**
 * Gets all available brand configurations
 */
export function getAllBrands(): BrandConfig[] {
  return Object.values(BRAND_CONFIGS);
}

/**
 * Checks if a brand ID is valid
 */
export function isValidBrand(brandId: string): boolean {
  return brandId in BRAND_CONFIGS;
}

/**
 * Gets the site URL, preferring environment variables for SSR contexts
 * Works with Netlify deploy previews automatically
 */
export function getSiteUrl(): string {
  // Client-side: use window.location.origin (works for all deployments)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Server-side: prioritize configured site URL for consistency
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  // Netlify provides these automatically for deploy previews:
  // - DEPLOY_URL: The unique URL for this specific deploy
  // - URL: The main site URL
  // - DEPLOY_PRIME_URL: The deploy URL or branch URL
  const deployUrl = process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || process.env.URL;
  if (deployUrl) {
    return deployUrl;
  }
  
  // Final fallback for local development
  return 'http://localhost:3000';
}

/**
 * Gets brand-specific redirect URL for OAuth callbacks
 * For OAuth, we must use the actual browser origin to preserve the subdomain
 */
export function getBrandCallbackUrl(): string {
  // Client-side: always use the actual browser origin for OAuth
  // This ensures subdomain-based brands redirect correctly
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }
  
  // Server-side: this shouldn't be called, but fallback to site URL
  return `${getSiteUrl()}/auth/callback`;
}

/**
 * Server-side brand detection from hostname
 * Use this in API routes or server components
 */
export function detectBrandIdFromHostname(hostname: string): string {
  // Check for localhost or IP
  if (hostname === 'localhost' || hostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return 'act';
  }

  const parts = hostname.split('.');
  if (parts.length >= 2) {
    const subdomain = parts[0];
    if (BRAND_CONFIGS[subdomain]) {
      return subdomain;
    }
  }

  return 'act';
}
