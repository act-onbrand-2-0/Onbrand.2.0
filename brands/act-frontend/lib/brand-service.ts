/**
 * Brand Service - Dynamic brand loading from Supabase
 * 
 * Replaces hardcoded brand configs with database-driven brand resolution.
 * Supports subdomain-based multi-tenancy (e.g., ACT.onbrandai.app, ODIDDO.onbrandai.app)
 */

import { createClient } from '@supabase/supabase-js';

export interface Brand {
  id: string;
  name: string;
  display_name: string;
  subdomain: string;
  custom_domain: string | null;
  is_active: boolean;
  settings: BrandSettings;
  created_at: string;
  updated_at: string;
}

export interface BrandSettings {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  logo_url?: string;
  favicon_url?: string;
  [key: string]: unknown;
}

// In-memory cache for brand lookups (reduces DB queries)
const brandCache = new Map<string, { brand: Brand | null; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

/**
 * Create a Supabase client for server-side brand lookups
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Get brand by subdomain (e.g., "act" from act.onbrandai.app)
 */
export async function getBrandBySubdomain(subdomain: string): Promise<Brand | null> {
  const cacheKey = `subdomain:${subdomain.toLowerCase()}`;
  const cached = brandCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.brand;
  }
  
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('subdomain', subdomain.toLowerCase())
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      brandCache.set(cacheKey, { brand: null, timestamp: Date.now() });
      return null;
    }
    
    const brand = data as Brand;
    brandCache.set(cacheKey, { brand, timestamp: Date.now() });
    return brand;
  } catch (e) {
    console.error('Error fetching brand by subdomain:', e);
    return null;
  }
}

/**
 * Get brand by custom domain (e.g., "mybrand.com")
 */
export async function getBrandByCustomDomain(domain: string): Promise<Brand | null> {
  const cacheKey = `domain:${domain.toLowerCase()}`;
  const cached = brandCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.brand;
  }
  
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('custom_domain', domain.toLowerCase())
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      brandCache.set(cacheKey, { brand: null, timestamp: Date.now() });
      return null;
    }
    
    const brand = data as Brand;
    brandCache.set(cacheKey, { brand, timestamp: Date.now() });
    return brand;
  } catch (e) {
    console.error('Error fetching brand by custom domain:', e);
    return null;
  }
}

/**
 * Get brand by ID
 */
export async function getBrandById(brandId: string): Promise<Brand | null> {
  const cacheKey = `id:${brandId}`;
  const cached = brandCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.brand;
  }
  
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single();
    
    if (error || !data) {
      brandCache.set(cacheKey, { brand: null, timestamp: Date.now() });
      return null;
    }
    
    const brand = data as Brand;
    brandCache.set(cacheKey, { brand, timestamp: Date.now() });
    return brand;
  } catch (e) {
    console.error('Error fetching brand by ID:', e);
    return null;
  }
}

/**
 * Resolve brand from hostname
 * Handles: subdomain.onbrandai.app, custom domains, localhost
 */
export async function resolveBrandFromHostname(hostname: string): Promise<Brand | null> {
  // Remove port if present
  const host = hostname.split(':')[0].toLowerCase();
  
  // Check for localhost/development - return default brand
  if (host === 'localhost' || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const defaultBrandId = process.env.NEXT_PUBLIC_DEFAULT_BRAND || 'act';
    return getBrandById(defaultBrandId);
  }
  
  // Check for main domain (no subdomain)
  if (host === 'onbrandai.app' || host === 'www.onbrandai.app') {
    return null; // No specific brand - show landing page
  }
  
  // Check for subdomain pattern (*.onbrandai.app)
  const subdomainMatch = host.match(/^([^.]+)\.onbrandai\.app$/);
  if (subdomainMatch) {
    const subdomain = subdomainMatch[1];
    if (subdomain !== 'www') {
      return getBrandBySubdomain(subdomain);
    }
    return null;
  }
  
  // Check for custom domain
  return getBrandByCustomDomain(host);
}

/**
 * Check if a subdomain is valid/available
 */
export async function isSubdomainValid(subdomain: string): Promise<boolean> {
  const brand = await getBrandBySubdomain(subdomain);
  return brand !== null;
}

/**
 * Get all active brands (admin function)
 */
export async function getAllActiveBrands(): Promise<Brand[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error fetching all brands:', error);
      return [];
    }
    
    return (data || []) as Brand[];
  } catch (e) {
    console.error('Error fetching all brands:', e);
    return [];
  }
}

/**
 * Clear brand cache (useful after brand updates)
 */
export function clearBrandCache(): void {
  brandCache.clear();
}

/**
 * Clear specific brand from cache
 */
export function invalidateBrandCache(brandId: string): void {
  for (const [key, value] of brandCache.entries()) {
    if (value.brand?.id === brandId) {
      brandCache.delete(key);
    }
  }
}
