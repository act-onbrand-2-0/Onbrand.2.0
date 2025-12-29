'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

/**
 * Root page - New Fullscreen Toggle Homepage
 */
export default function Home() {
  const router = useRouter();
  const [isOn, setIsOn] = useState(false);
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

  const handleToggle = () => {
    const newState = !isOn;
    setIsOn(newState);
    
    if (newState) {
      // Scroll to the homepage section
      setTimeout(() => {
        document.getElementById('homepage')?.scrollIntoView({ 
          behavior: 'smooth' 
        });
      }, 300);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: '#24326b' }}>
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=League+Spartan:wght@400;500;600;700;800;900&display=swap');
      `}</style>
      
      <div className="h-screen overflow-y-auto snap-y snap-mandatory">
        {/* Toggle Section */}
        <div 
          className="h-screen flex items-center justify-center cursor-pointer transition-colors duration-500 snap-start"
          style={{ backgroundColor: isOn ? '#889def' : '#24326b' }}
          onClick={handleToggle}
        >
          <div className="relative w-[80vw] h-[60vh] max-w-[1200px] max-h-[600px]">
            {/* Toggle Track */}
            <div 
              className="w-full h-full rounded-full border-8 relative transition-all duration-500"
              style={{ 
                borderColor: isOn ? '#24326b' : '#889def',
                backgroundColor: isOn ? '#24326b40' : '#889def40'
              }}
            >
              {/* Toggle Circle */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 rounded-full transition-all duration-500 shadow-2xl"
                style={{
                  width: 'min(50vh, 40vw)',
                  height: 'min(50vh, 40vw)',
                  backgroundColor: isOn ? '#889def' : '#24326b',
                  left: isOn ? 'calc(100% - min(50vh, 40vw) - 2rem)' : '2rem'
                }}
              >
                {/* Inner glow effect */}
                <div 
                  className="absolute inset-8 rounded-full"
                  style={{
                    backgroundColor: isOn ? '#ffffff20' : '#00000020'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Homepage Section */}
        <div 
          id="homepage"
          className="h-screen flex items-center justify-center snap-start"
          style={{ backgroundColor: '#889def' }}
        >
          <div className="text-center px-4">
            <h1 
              className="text-6xl sm:text-8xl lg:text-9xl mb-6 font-bold"
              style={{ color: '#24326b', fontFamily: 'League Spartan, sans-serif' }}
            >
              onbrand
            </h1>
            <p 
              className="text-xl sm:text-2xl lg:text-3xl mb-12 max-w-4xl mx-auto"
              style={{ color: '#24326b', fontFamily: 'League Spartan, sans-serif' }}
            >
              AI-powered brand management platform for perfect brand consistency
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link href="/signup">
                <button 
                  className="px-10 py-4 rounded-full transition-all hover:scale-105 text-lg font-medium"
                  style={{ 
                    backgroundColor: '#24326b', 
                    color: '#889def',
                    fontFamily: 'League Spartan, sans-serif'
                  }}
                >
                  Get Demo
                </button>
              </Link>
              <Link href="/signup">
                <button 
                  className="px-10 py-4 rounded-full border-4 transition-all hover:scale-105 text-lg font-medium"
                  style={{ 
                    backgroundColor: 'transparent',
                    borderColor: '#24326b',
                    color: '#24326b',
                    fontFamily: 'League Spartan, sans-serif'
                  }}
                >
                  Get Started
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
