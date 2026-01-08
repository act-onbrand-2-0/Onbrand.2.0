'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Sparkles, Zap, Shield } from 'lucide-react';

const navLinks = [
  { name: 'Features', href: '#features' },
  { name: 'About', href: '#about' },
  { name: 'Pricing', href: '#pricing' },
];

// Floating orb component
function FloatingOrb({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <div
      className={`absolute rounded-full opacity-60 animate-float ${className}`}
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

// Abstract wave illustration
function WaveIllustration() {
  return (
    <svg
      className="absolute bottom-0 left-0 right-0 w-full h-64 opacity-20"
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="50%" stopColor="#d946ef" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <path
        fill="url(#waveGradient)"
        d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
      />
    </svg>
  );
}

// Grid pattern overlay
function GridPattern() {
  return (
    <div className="absolute inset-0 opacity-[0.02]">
      <svg width="100%" height="100%">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}

// Decorative rings
function DecorativeRings() {
  return (
    <div className="absolute right-0 top-1/4 -translate-y-1/2 translate-x-1/2 opacity-20">
      <div className="relative">
        <div className="absolute h-[500px] w-[500px] rounded-full border border-violet-500/50 animate-spin-slow" />
        <div className="absolute h-[400px] w-[400px] rounded-full border border-fuchsia-500/50 animate-spin-slow-reverse left-[50px] top-[50px]" />
        <div className="absolute h-[300px] w-[300px] rounded-full border border-blue-500/50 animate-pulse left-[100px] top-[100px]" />
      </div>
    </div>
  );
}

// Abstract 3D-like shape
function Abstract3DShape() {
  return (
    <div className="absolute left-0 bottom-1/4 -translate-x-1/3 opacity-30">
      <svg width="400" height="400" viewBox="0 0 400 400" fill="none">
        <defs>
          <linearGradient id="shape1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="shape2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d946ef" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <circle cx="200" cy="200" r="150" stroke="url(#shape1)" strokeWidth="2" fill="none" className="animate-pulse" />
        <circle cx="200" cy="200" r="120" stroke="url(#shape2)" strokeWidth="1" fill="none" opacity="0.5" />
        <circle cx="200" cy="200" r="80" stroke="url(#shape1)" strokeWidth="1" fill="none" opacity="0.3" />
        <path
          d="M200 50 L350 200 L200 350 L50 200 Z"
          stroke="url(#shape2)"
          strokeWidth="1"
          fill="none"
          opacity="0.4"
          className="animate-spin-slow"
          style={{ transformOrigin: 'center' }}
        />
      </svg>
    </div>
  );
}

/**
 * Root page - Modern Landing Page
 */
export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Check auth status
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // If logged in, redirect to dashboard
        router.push('/dashboard');
      } else {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-pulse text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-zinc-950">
      {/* Grid pattern */}
      <GridPattern />

      {/* Background gradient effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-violet-600 blur-[128px]" />
        <div className="absolute right-1/4 top-1/3 h-96 w-96 rounded-full bg-blue-600 blur-[128px]" />
        <div className="absolute bottom-1/4 left-1/2 h-96 w-96 rounded-full bg-fuchsia-600 blur-[128px]" />
      </div>

      {/* Floating orbs */}
      <FloatingOrb className="h-3 w-3 bg-violet-400 left-[10%] top-[20%]" delay={0} />
      <FloatingOrb className="h-2 w-2 bg-fuchsia-400 left-[15%] top-[60%]" delay={1} />
      <FloatingOrb className="h-4 w-4 bg-blue-400 left-[85%] top-[25%]" delay={2} />
      <FloatingOrb className="h-2 w-2 bg-violet-400 left-[80%] top-[70%]" delay={0.5} />
      <FloatingOrb className="h-3 w-3 bg-fuchsia-400 left-[50%] top-[15%]" delay={1.5} />
      <FloatingOrb className="h-2 w-2 bg-blue-400 left-[25%] top-[80%]" delay={2.5} />

      {/* Decorative elements */}
      <DecorativeRings />
      <Abstract3DShape />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/50 to-zinc-950" />

      {/* Wave illustration at bottom */}
      <WaveIllustration />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <Link href="/" className="shrink-0 group">
            <span className="text-2xl font-bold text-white tracking-tight relative">
              <span className="relative z-10">onbrand</span>
              <span className="absolute inset-0 blur-lg bg-gradient-to-r from-violet-400 to-fuchsia-400 opacity-0 group-hover:opacity-50 transition-opacity" />
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:block">
            <ul className="flex items-center gap-8">
              {navLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-400 transition-colors hover:text-white"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" asChild className="text-zinc-400 hover:text-white hover:bg-zinc-800">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild className="bg-white text-zinc-950 hover:bg-zinc-200">
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="text-white hover:bg-zinc-800">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-zinc-950 border-zinc-800">
              <nav className="mt-8">
                <ul className="flex flex-col gap-4">
                  {navLinks.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-lg text-zinc-400 hover:text-white transition-colors"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                  <li className="pt-4 border-t border-zinc-800">
                    <Link href="/login" className="text-lg text-zinc-400 hover:text-white transition-colors">
                      Sign in
                    </Link>
                  </li>
                  <li>
                    <Button asChild className="w-full bg-white text-zinc-950 hover:bg-zinc-200">
                      <Link href="/signup">Get Started</Link>
                    </Button>
                  </li>
                </ul>
              </nav>
            </SheetContent>
          </Sheet>
        </header>

        {/* Hero Section */}
        <main className="mt-24 flex flex-col items-center text-center sm:mt-32 lg:mt-40">
          <div className="space-y-2">
            <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Your Brand.
            </h1>
            <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-blue-400 bg-clip-text text-transparent">
                Perfectly Consistent.
              </span>
            </h1>
          </div>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl">
            AI-powered brand management that ensures every piece of content stays on-brand. 
            From tone of voice to visual identity.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-8 bg-white text-zinc-950 hover:bg-zinc-200 text-base font-medium">
              <Link href="/signup">Start Free Trial</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 border-zinc-700 text-white hover:bg-zinc-800 text-base font-medium">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>

          {/* Feature highlights */}
          <div className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
            <div className="group relative flex flex-col items-center gap-4 rounded-2xl border border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm p-8 transition-all hover:border-violet-500/50 hover:bg-zinc-900/80">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 ring-1 ring-violet-500/20">
                <Sparkles className="h-7 w-7 text-violet-400" />
              </div>
              <h3 className="relative text-base font-semibold text-white">AI-Powered</h3>
              <p className="relative text-sm text-zinc-400 text-center">Smart content analysis that understands your brand</p>
            </div>
            <div className="group relative flex flex-col items-center gap-4 rounded-2xl border border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm p-8 transition-all hover:border-fuchsia-500/50 hover:bg-zinc-900/80">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-fuchsia-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-500/5 ring-1 ring-fuchsia-500/20">
                <Zap className="h-7 w-7 text-fuchsia-400" />
              </div>
              <h3 className="relative text-base font-semibold text-white">Instant Feedback</h3>
              <p className="relative text-sm text-zinc-400 text-center">Real-time brand compliance checks</p>
            </div>
            <div className="group relative flex flex-col items-center gap-4 rounded-2xl border border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm p-8 transition-all hover:border-blue-500/50 hover:bg-zinc-900/80">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 ring-1 ring-blue-500/20">
                <Shield className="h-7 w-7 text-blue-400" />
              </div>
              <h3 className="relative text-base font-semibold text-white">Brand Protection</h3>
              <p className="relative text-sm text-zinc-400 text-center">Ensure consistent messaging everywhere</p>
            </div>
          </div>
        </main>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-950 to-transparent" />
    </div>
  );
}
