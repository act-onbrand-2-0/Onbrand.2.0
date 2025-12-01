/**
 * Quota management utilities for brand token limits
 */

import { createClient } from '@supabase/supabase-js';

export type QuotaType = 'prompt_tokens' | 'image_generation' | 'workflow_executions';

export interface BrandQuota {
  id: string;
  brand_id: string;
  prompt_tokens_limit: number;
  prompt_tokens_used: number;
  prompt_tokens_reset_at: string;
  image_generation_limit: number;
  image_generation_used: number;
  storage_limit_mb: number;
  workflow_executions_limit: number;
  workflow_executions_used: number;
  last_topped_up_at?: string;
  last_topped_up_by?: string;
  created_at: string;
  updated_at: string;
}

export interface QuotaTransaction {
  id: string;
  brand_id: string;
  transaction_type: 'topup' | 'usage' | 'reset' | 'deduction';
  quota_type: QuotaType;
  amount: number;
  previous_value: number;
  new_value: number;
  performed_by?: string;
  description?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

/**
 * Get brand quota information
 */
export async function getBrandQuota(
  supabase: ReturnType<typeof createClient>,
  brandId: string
): Promise<{ quota: BrandQuota | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('brand_quotas')
      .select('*')
      .eq('brand_id', brandId)
      .single();

    if (error) {
      return { quota: null, error };
    }

    return { quota: data, error: null };
  } catch (error) {
    return { 
      quota: null, 
      error: error instanceof Error ? error : new Error('Failed to get quota') 
    };
  }
}

/**
 * Check if brand has enough quota
 */
export async function checkQuota(
  supabase: ReturnType<typeof createClient>,
  brandId: string,
  quotaType: QuotaType,
  amount: number
): Promise<{ hasQuota: boolean; remaining: number; error: Error | null }> {
  try {
    const { quota, error } = await getBrandQuota(supabase, brandId);

    if (error || !quota) {
      return { hasQuota: false, remaining: 0, error: error || new Error('No quota found') };
    }

    let used: number;
    let limit: number;

    switch (quotaType) {
      case 'prompt_tokens':
        used = quota.prompt_tokens_used;
        limit = quota.prompt_tokens_limit;
        break;
      case 'image_generation':
        used = quota.image_generation_used;
        limit = quota.image_generation_limit;
        break;
      case 'workflow_executions':
        used = quota.workflow_executions_used;
        limit = quota.workflow_executions_limit;
        break;
    }

    const remaining = limit - used;
    const hasQuota = remaining >= amount;

    return { hasQuota, remaining, error: null };
  } catch (error) {
    return { 
      hasQuota: false, 
      remaining: 0, 
      error: error instanceof Error ? error : new Error('Failed to check quota') 
    };
  }
}

/**
 * Use quota (via database function)
 */
export async function useQuota(
  supabase: ReturnType<typeof createClient>,
  brandId: string,
  quotaType: QuotaType,
  amount: number
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('check_and_use_quota', {
      p_brand_id: brandId,
      p_quota_type: quotaType,
      p_amount: amount,
    });

    if (error) {
      return { success: false, error };
    }

    if (!data) {
      return { success: false, error: new Error('Quota exceeded') };
    }

    return { success: true, error: null };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Failed to use quota') 
    };
  }
}

/**
 * Top up quota (Company Admin only)
 */
export async function topupQuota(
  supabase: ReturnType<typeof createClient>,
  brandId: string,
  quotaType: QuotaType,
  amount: number,
  description?: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('topup_quota', {
      p_brand_id: brandId,
      p_quota_type: quotaType,
      p_amount: amount,
      p_description: description,
    });

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Failed to topup quota') 
    };
  }
}

/**
 * Get quota usage history
 */
export async function getQuotaTransactions(
  supabase: ReturnType<typeof createClient>,
  brandId: string,
  options?: {
    quotaType?: QuotaType;
    transactionType?: 'topup' | 'usage' | 'reset' | 'deduction';
    limit?: number;
  }
): Promise<{ transactions: QuotaTransaction[]; error: Error | null }> {
  try {
    let query = supabase
      .from('quota_transactions')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    if (options?.quotaType) {
      query = query.eq('quota_type', options.quotaType);
    }

    if (options?.transactionType) {
      query = query.eq('transaction_type', options.transactionType);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      return { transactions: [], error };
    }

    return { transactions: data || [], error: null };
  } catch (error) {
    return { 
      transactions: [], 
      error: error instanceof Error ? error : new Error('Failed to get transactions') 
    };
  }
}

/**
 * Calculate quota usage percentage
 */
export function getQuotaUsagePercent(used: number, limit: number): number {
  if (limit === 0) return 0;
  return Math.round((used / limit) * 100);
}

/**
 * Check if quota is running low (< 20%)
 */
export function isQuotaRunningLow(used: number, limit: number): boolean {
  const remaining = limit - used;
  const threshold = limit * 0.2; // 20%
  return remaining < threshold;
}

/**
 * Check if quota is exhausted
 */
export function isQuotaExhausted(used: number, limit: number): boolean {
  return used >= limit;
}

/**
 * Format quota numbers for display
 */
export function formatQuota(value: number, type: QuotaType): string {
  switch (type) {
    case 'prompt_tokens':
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      }
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toString();
    case 'image_generation':
    case 'workflow_executions':
      return value.toLocaleString();
    default:
      return value.toString();
  }
}

/**
 * Get quota status summary
 */
export async function getQuotaStatus(
  supabase: ReturnType<typeof createClient>,
  brandId: string
): Promise<{
  status: {
    prompt_tokens: { used: number; limit: number; percent: number; isLow: boolean };
    image_generation: { used: number; limit: number; percent: number; isLow: boolean };
    workflow_executions: { used: number; limit: number; percent: number; isLow: boolean };
  } | null;
  error: Error | null;
}> {
  try {
    const { quota, error } = await getBrandQuota(supabase, brandId);

    if (error || !quota) {
      return { status: null, error: error || new Error('No quota found') };
    }

    return {
      status: {
        prompt_tokens: {
          used: quota.prompt_tokens_used,
          limit: quota.prompt_tokens_limit,
          percent: getQuotaUsagePercent(quota.prompt_tokens_used, quota.prompt_tokens_limit),
          isLow: isQuotaRunningLow(quota.prompt_tokens_used, quota.prompt_tokens_limit),
        },
        image_generation: {
          used: quota.image_generation_used,
          limit: quota.image_generation_limit,
          percent: getQuotaUsagePercent(quota.image_generation_used, quota.image_generation_limit),
          isLow: isQuotaRunningLow(quota.image_generation_used, quota.image_generation_limit),
        },
        workflow_executions: {
          used: quota.workflow_executions_used,
          limit: quota.workflow_executions_limit,
          percent: getQuotaUsagePercent(quota.workflow_executions_used, quota.workflow_executions_limit),
          isLow: isQuotaRunningLow(quota.workflow_executions_used, quota.workflow_executions_limit),
        },
      },
      error: null,
    };
  } catch (error) {
    return {
      status: null,
      error: error instanceof Error ? error : new Error('Failed to get quota status'),
    };
  }
}
