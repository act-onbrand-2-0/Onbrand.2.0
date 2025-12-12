'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

/**
 * Unauthorized page shown when a user tries to access a brand they don't have permissions for
 */
export default function UnauthorizedPage() {
  const [defaultBrand, setDefaultBrand] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadUserAndBrands() {
      setLoading(true);
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        // Get user session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUserEmail(session.user.email || null);
          
          // Get user's brands
          const { data: userBrands } = await supabase
            .from('brand_users')
            .select('brand_id')
            .eq('user_id', session.user.id);
          
          if (userBrands && userBrands.length > 0) {
            setDefaultBrand(userBrands[0].brand_id);
          } else {
            // If no brands assigned, extract from email domain
            if (session.user.email) {
              const emailDomain = session.user.email.split('@')[1];
              const brandSlug = emailDomain?.split('.')[0];
              if (brandSlug) {
                // Check if this brand exists
                const { data: brandData } = await supabase
                  .from('brands')
                  .select('id')
                  .eq('id', brandSlug)
                  .single();
                
                if (brandData) {
                  setDefaultBrand(brandSlug);
                } else {
                  setDefaultBrand('act'); // Default fallback
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error loading user data:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadUserAndBrands();
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
        
        <div className="bg-amber-50 text-amber-800 border border-amber-200 rounded-lg p-4 mb-6">
          <p>You don't have access to this brand.</p>
        </div>
        
        {loading ? (
          <p className="text-gray-500">Checking your access...</p>
        ) : (
          <>
            {defaultBrand ? (
              <div className="space-y-4">
                <p className="mb-4">
                  You have access to the following brand:
                </p>
                
                <Link
                  href={`/brand/${defaultBrand}`}
                  className="block w-full bg-black text-white rounded-lg px-4 py-3 text-center font-medium hover:bg-gray-800 transition-colors"
                >
                  Go to {defaultBrand} portal
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <p>You don't have access to any brands yet.</p>
                
                <Link
                  href="/login"
                  className="block w-full bg-black text-white rounded-lg px-4 py-3 text-center font-medium hover:bg-gray-800 transition-colors"
                >
                  Return to Login
                </Link>
              </div>
            )}
            
            {userEmail && (
              <p className="mt-4 text-sm text-gray-500">
                Logged in as: {userEmail}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
