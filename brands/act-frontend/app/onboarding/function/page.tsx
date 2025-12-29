'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const ROLES = [
  'Strategist',
  'Creative',
  'Account Manager',
  'Social Media Manager',
  'Communication Manager',
  'Other',
];

export default function FunctionOnboardingPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [jobFunction, setJobFunction] = useState('');
  const [brandId, setBrandId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      // Determine user's brand (first brand)
      const { data: userBrands, error: buErr } = await supabase
        .from('brand_users')
        .select('brand_id, job_function')
        .eq('user_id', session.user.id)
        .limit(1)
        .maybeSingle();
      if (buErr) {
        setError(buErr.message);
      }
      if (userBrands) {
        setBrandId(userBrands.brand_id);
        if (userBrands.job_function) {
          // Already set; go back to dashboard
          router.replace('/dashboard');
          return;
        }
      }
      setLoading(false);
    }
    init();
  }, [router, supabase]);

  const handleSave = async () => {
    if (!jobFunction || !brandId) {
      setError('Please select a role');
      return;
    }
    setError(null);
    try {
      const res = await fetch('/api/me/job-function', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobFunction, brandId }),
      });
      const data = await res.json();
      if (res.ok) {
        router.replace('/dashboard');
      } else {
        setError(data.error || 'Failed to save your role');
        console.error('Save job function error:', data);
      }
    } catch (err) {
      console.error('Network error:', err);
      setError('Network error. Please try again.');
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">One last thing</h1>
          <p className="text-muted-foreground">What is your role?</p>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Select your role</label>
          <select
            className="w-full rounded-md border bg-card p-2"
            value={jobFunction}
            onChange={(e) => setJobFunction(e.target.value)}
          >
            <option value="">Choose one</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={!jobFunction}
          className="w-full rounded-md bg-[#889def] text-white py-2 disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}


