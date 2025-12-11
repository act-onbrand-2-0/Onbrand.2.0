// @ts-nocheck
/**
 * Company Admin management utilities
 */

import { createClient } from '@supabase/supabase-js';

export interface CompanyAdmin {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

/**
 * Set a user as Company Admin for ACT brand
 * Only existing Company Admins or service role can call this
 */
export async function setCompanyAdmin(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('set_company_admin', {
      p_user_id: userId,
    });

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to set company admin'),
    };
  }
}

/**
 * Remove Company Admin role (demote to owner)
 */
export async function removeCompanyAdmin(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('remove_company_admin', {
      p_user_id: userId,
    });

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to remove company admin'),
    };
  }
}

/**
 * List all Company Admins
 */
export async function listCompanyAdmins(
  supabase: ReturnType<typeof createClient>
): Promise<{ admins: CompanyAdmin[]; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('list_company_admins');

    if (error) {
      return { admins: [], error };
    }

    return { admins: data || [], error: null };
  } catch (error) {
    return {
      admins: [],
      error: error instanceof Error ? error : new Error('Failed to list company admins'),
    };
  }
}

/**
 * Check if a user is a Company Admin
 */
export async function isCompanyAdmin(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ isAdmin: boolean; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('is_company_admin', {
      p_user_id: userId,
    });

    if (error) {
      return { isAdmin: false, error };
    }

    return { isAdmin: data || false, error: null };
  } catch (error) {
    return {
      isAdmin: false,
      error: error instanceof Error ? error : new Error('Failed to check admin status'),
    };
  }
}

/**
 * Check if current user is Company Admin
 */
export async function checkIsCompanyAdmin(
  supabase: ReturnType<typeof createClient>
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    const { isAdmin } = await isCompanyAdmin(supabase, user.id);
    return isAdmin;
  } catch {
    return false;
  }
}
