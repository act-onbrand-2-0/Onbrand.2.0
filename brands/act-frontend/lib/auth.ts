import { createClient } from '@supabase/supabase-js';

export type UserBrand = {
  id: string;
  brand_id: string;
  role: 'owner' | 'admin' | 'editor' | 'reviewer' | 'user';
};

/**
 * Get Supabase client
 */
export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Get user brands from database
 */
export async function getUserBrands(userId: string): Promise<UserBrand[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('brand_users')
    .select('id, brand_id, role')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user brands:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if user has access to a specific brand
 */
export async function hasAccessToBrand(userId: string, brandId: string): Promise<boolean> {
  if (!userId || !brandId) return false;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('brand_users')
    .select('id')
    .eq('user_id', userId)
    .eq('brand_id', brandId)
    .single();

  if (error) {
    console.error('Error checking brand access:', error);
    return false;
  }

  return !!data;
}

/**
 * Get brand ID from email domain
 */
export function getBrandIdFromEmail(email: string): string | null {
  if (!email || !email.includes('@')) return null;
  
  // Extract domain from email
  const emailDomain = email.split('@')[1];
  if (!emailDomain) return null;
  
  // Create brand slug from domain (remove .com, .nl, etc.)
  const brandSlug = emailDomain.split('.')[0];
  
  return brandSlug;
}

/**
 * Get default brand for user from email
 * This helps determine which brand to show when a user logs in
 */
export async function getDefaultBrandForUser(userId: string, email: string): Promise<string> {
  // Try to get user's assigned brands
  const userBrands = await getUserBrands(userId);
  
  // If user has brands, return the first one
  if (userBrands.length > 0) {
    return userBrands[0].brand_id;
  }
  
  // If no brands, extract from email
  const emailBrandId = getBrandIdFromEmail(email);
  
  // If we can extract from email, return that
  if (emailBrandId) {
    return emailBrandId;
  }
  
  // Last resort: return default brand
  return 'act';
}
