'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { BrandGuidelinesUpload } from '@/components/brand/BrandGuidelinesUpload';
import { Settings, FileText, CheckCircle, AlertTriangle, RefreshCw, Lock } from 'lucide-react';

interface BrandGuidelines {
  id: string;
  status: string;
  voice?: Record<string, unknown>;
  copyGuidelines?: Record<string, unknown>;
  visualGuidelines?: Record<string, unknown>;
  messaging?: Record<string, unknown>;
  extractedAt?: string;
  approvedAt?: string;
}

interface PageProps {
  params: Promise<{ brandName: string }>;
}

// Create Supabase client for auth check
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function BrandConfigurationPage({ params }: PageProps) {
  const { brandName } = use(params);
  const brandId = brandName; // brandName is the ID in this route
  const router = useRouter();
  
  const [guidelines, setGuidelines] = useState<BrandGuidelines | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Brand display name
  const displayName = brandId.charAt(0).toUpperCase() + brandId.slice(1);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[Configuration] Session check:', session?.user?.email || 'No session');
      setIsAuthenticated(!!session);
      
      if (!session) {
        // Redirect to login
        router.push(`/login?returnTo=/brand/${brandId}/configuration`);
      }
    };
    
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Configuration] Auth state changed:', event, session?.user?.email);
      setIsAuthenticated(!!session);
    });
    
    return () => subscription.unsubscribe();
  }, [brandId, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchGuidelines();
    }
  }, [brandId, isAuthenticated]);

  const fetchGuidelines = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/brands/${brandId}/guidelines`);
      const data = await response.json();

      if (data.success && data.guidelines) {
        setGuidelines(data.guidelines);
        setShowUpload(false);
      } else if (data.hasGuidelines && data.status === 'pending_review') {
        setShowUpload(true);
      } else {
        setGuidelines(null);
        setShowUpload(true);
      }
    } catch (err) {
      setError('Failed to load brand guidelines');
      setShowUpload(true);
    } finally {
      setLoading(false);
    }
  };

  const handleGuidelinesApproved = () => {
    fetchGuidelines();
  };

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Lock className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-pulse" />
          <p className="text-gray-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-8 w-8 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-900">
            {displayName} Brand Configuration
          </h1>
        </div>
        <p className="text-gray-500">
          Manage your brand guidelines, voice, visual identity, and messaging.
        </p>
      </div>

      {/* Status Card */}
      {guidelines && !showUpload && (
        <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Brand Guidelines Active</p>
                <p className="text-sm text-green-600">
                  Last updated: {guidelines.approvedAt 
                    ? new Date(guidelines.approvedAt).toLocaleDateString()
                    : 'Unknown'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-green-700 hover:bg-green-100 rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Update Guidelines
            </button>
          </div>
        </div>
      )}

      {/* No Guidelines Warning */}
      {!guidelines && !showUpload && (
        <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">No Brand Guidelines Set</p>
              <p className="text-sm text-yellow-600">
                Upload your brand guidelines PDF to enable AI-powered brand checking.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Section */}
      {showUpload && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Upload Brand Guidelines
            </h2>
            {guidelines && (
              <button
                onClick={() => setShowUpload(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            )}
          </div>
          <BrandGuidelinesUpload
            brandId={brandId}
            brandName={displayName}
            onGuidelinesApproved={handleGuidelinesApproved}
          />
        </div>
      )}

      {/* Current Guidelines Display */}
      {guidelines && !showUpload && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Current Brand Guidelines</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GuidelineCard
              title="Voice & Personality"
              icon="🎭"
              data={guidelines.voice}
              emptyText="No voice guidelines defined"
            />
            <GuidelineCard
              title="Copy Guidelines"
              icon="✍️"
              data={guidelines.copyGuidelines}
              emptyText="No copy guidelines defined"
            />
            <GuidelineCard
              title="Visual Guidelines"
              icon="🎨"
              data={guidelines.visualGuidelines}
              emptyText="No visual guidelines defined"
            />
            <GuidelineCard
              title="Messaging"
              icon="💬"
              data={guidelines.messaging}
              emptyText="No messaging guidelines defined"
            />
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

function GuidelineCard({ 
  title, 
  icon, 
  data, 
  emptyText 
}: { 
  title: string; 
  icon: string; 
  data?: Record<string, unknown>; 
  emptyText: string;
}) {
  const hasData = data && Object.keys(data).length > 0;
  
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      {hasData ? (
        <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-48">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : (
        <p className="text-sm text-gray-500 italic">{emptyText}</p>
      )}
    </div>
  );
}
