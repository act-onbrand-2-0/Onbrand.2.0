'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { detectBrandId, getBrandCallbackUrl } from '@/lib/brand';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles } from 'lucide-react';

// Wrap the main content in Suspense because useSearchParams requires it
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="animate-pulse text-zinc-400">Loading...</div>
    </div>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);

  useEffect(() => {
    setMounted(true);
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Supabase is not configured. Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.');
      return;
    }
    
    try {
      const client = createClient();
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
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Extract brand from email domain
      const emailDomain = email.split('@')[1];
      const brandSlug = emailDomain?.split('.')[0] || 'act';
      
      console.log('Login attempt:', { email, emailDomain, brandSlug });
      
      // First, check if the brand is configured in our app
      const brands = ['act', 'acme', 'nike', 'creativetechnologists'];
      const isConfiguredBrand = brands.includes(brandSlug);
      
      let targetBrand = 'act'; // Default fallback
      
      if (isConfiguredBrand) {
        targetBrand = brandSlug;
      } else {
        // If brand is not configured, check database
        const { data: brandData } = await supabase
          .from('brands')
          .select('id')
          .eq('id', brandSlug)
          .single();
        
        if (brandData) {
          targetBrand = brandData.id;
        }
      }
      
      // Redirect to the original destination or dashboard
      console.log(`Redirecting to: ${redirectTo}`);
      window.location.href = redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-zinc-950">
      {/* Background gradient effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-violet-600 blur-[128px]" />
        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-blue-600 blur-[128px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm md:max-w-4xl">
          {/* Logo */}
          <Link href="/" className="mb-8 flex items-center justify-center md:justify-start">
            <span className="text-2xl font-bold text-white tracking-tight">onbrand</span>
          </Link>

          <Card className="overflow-hidden border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
            <CardContent className="grid p-0 md:grid-cols-2">
              {/* Form Side */}
              <form onSubmit={handleEmailSignIn} className="p-6 md:p-8">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold text-white">Welcome back</h1>
                    <p className="text-sm text-zinc-400 text-balance">
                      Sign in to your account to continue
                    </p>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email" className="text-zinc-300">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500 focus:ring-violet-500"
                      />
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center">
                        <Label htmlFor="password" className="text-zinc-300">Password</Label>
                        <Link
                          href="/forgot-password"
                          className="ml-auto text-sm text-zinc-400 underline-offset-2 hover:text-white hover:underline"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500 focus:ring-violet-500"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-white text-zinc-950 hover:bg-zinc-200"
                    >
                      {loading ? 'Signing in...' : 'Sign in'}
                    </Button>
                  </div>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-zinc-700" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-zinc-900 px-2 text-zinc-500">Or continue with</span>
                    </div>
                  </div>

                  {/* OAuth Button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleMicrosoftSignIn}
                    disabled={loading}
                    className="w-full border-zinc-700 bg-zinc-800/50 text-white hover:bg-zinc-800 hover:text-white"
                  >
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 23 23">
                      <path fill="#f35325" d="M1 1h10v10H1z"/>
                      <path fill="#81bc06" d="M12 1h10v10H12z"/>
                      <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                      <path fill="#ffba08" d="M12 12h10v10H12z"/>
                    </svg>
                    Continue with Microsoft
                  </Button>

                  <p className="text-center text-sm text-zinc-400">
                    Don&apos;t have an account?{' '}
                    <Link href="/signup" className="text-white underline-offset-2 hover:underline">
                      Sign up
                    </Link>
                  </p>
                </div>
              </form>

              {/* Image/Illustration Side */}
              <div className="relative hidden md:block bg-zinc-800/50">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                  {/* Decorative illustration */}
                  <div className="relative">
                    <div className="absolute inset-0 blur-3xl opacity-50">
                      <div className="h-32 w-32 rounded-full bg-violet-500" />
                    </div>
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-2xl">
                      <Sparkles className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <h2 className="mt-8 text-2xl font-bold text-white text-center">
                    Your Brand, Perfected
                  </h2>
                  <p className="mt-3 text-sm text-zinc-400 text-center max-w-xs">
                    AI-powered brand management that keeps your content consistent across every channel.
                  </p>
                </div>
                {/* Subtle pattern */}
                <div className="absolute inset-0 opacity-5">
                  <svg width="100%" height="100%">
                    <defs>
                      <pattern id="loginGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#loginGrid)" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 px-6 text-center text-xs text-zinc-500">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="underline underline-offset-2 hover:text-zinc-300">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-zinc-300">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
