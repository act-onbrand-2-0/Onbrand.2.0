'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BrandGuidelines, BrandCheckResult, CheckType } from '@/lib/ai/types';

interface UseBrandGuidelinesReturn {
  guidelines: BrandGuidelines | null;
  loading: boolean;
  error: string | null;
  hasGuidelines: boolean;
  status: 'none' | 'pending' | 'approved';
  refresh: () => Promise<void>;
  checkContent: (content: string, type: CheckType) => Promise<BrandCheckResult | null>;
}

/**
 * Hook for accessing brand guidelines and checking content
 */
export function useBrandGuidelines(brandId: string): UseBrandGuidelinesReturn {
  const [guidelines, setGuidelines] = useState<BrandGuidelines | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'none' | 'pending' | 'approved'>('none');

  const fetchGuidelines = useCallback(async () => {
    if (!brandId) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/brands/${brandId}/guidelines`);
      const data = await response.json();

      if (data.success && data.guidelines) {
        setGuidelines(data.guidelines);
        setStatus('approved');
      } else if (data.hasGuidelines) {
        setStatus('pending');
        setGuidelines(null);
      } else {
        setStatus('none');
        setGuidelines(null);
      }
    } catch (err) {
      setError('Failed to load brand guidelines');
      setStatus('none');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchGuidelines();
  }, [fetchGuidelines]);

  const checkContent = useCallback(async (
    content: string, 
    type: CheckType
  ): Promise<BrandCheckResult | null> => {
    if (!brandId) {
      setError('Brand ID is required');
      return null;
    }

    try {
      const response = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          content,
          checkType: type,
          action: 'check',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Check failed');
      }

      const result = await response.json();
      return result as BrandCheckResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Brand check failed');
      return null;
    }
  }, [brandId]);

  return {
    guidelines,
    loading,
    error,
    hasGuidelines: status !== 'none',
    status,
    refresh: fetchGuidelines,
    checkContent,
  };
}
