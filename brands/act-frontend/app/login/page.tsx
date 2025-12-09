'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
// Removed Github import - using Microsoft OAuth instead
import Link from 'next/link';
import { detectBrandId, getBrandCallbackUrl } from '@/lib/brand';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [supabase, setSupabase] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Supabase is not configured. Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.');
      return;
    }
    
    try {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      setSupabase(client);
    } catch (err) {
      setError('Failed to initialize Supabase client. Please check your configuration.');
    }
  }, []);

  const handleMicrosoftSignIn = async () => {
    if (!supabase) return;
    
    try {
      setLoading(true);
      setError('');
      
      const brandId = detectBrandId();
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: getBrandCallbackUrl(),
          scopes: 'email openid profile',
          queryParams: {
            brand_id: brandId,
          },
        },
      });

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Microsoft');
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    try {
      setLoading(true);
      setError('');
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Hero Image */}
      <div className="relative hidden w-1/2 lg:block bg-wihte">
        <div className="absolute inset-0">
          <Image
            src="https://cdn.leonardo.ai/users/0bf3594c-4370-4dd3-bfe3-6ab88b8bee22/generations/1f0c7ae4-c1fb-6a30-b626-018449ba7e14/gemini-image-2_Transform_a_simple_flat_vector_logo_into_a_soft_3D_fluffy_object._Use_the_exact_-0.jpg"
            alt="ACT 2.0 - AI-Powered Platform"
            fill
            className="object-contain opacity-90"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex w-full items-center justify-center bg-white px-6 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Enter your ID to your account
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-6">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="Email address"
              />
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="Password"
              />
            </div>

            <div className="flex items-center justify-end">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
              >
                Forgot your password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-black px-4 py-3.5 text-sm font-semibold text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* OAuth Button */}
          <button
            type="button"
            onClick={handleMicrosoftSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 23 23">
              <path fill="#f35325" d="M1 1h10v10H1z"/>
              <path fill="#81bc06" d="M12 1h10v10H12z"/>
              <path fill="#05a6f0" d="M1 12h10v10H1z"/>
              <path fill="#ffba08" d="M12 12h10v10H12z"/>
            </svg>
            <span>Continue with Microsoft</span>
          </button>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link
              href="/signup"
              className="font-semibold text-gray-900 hover:text-black transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
