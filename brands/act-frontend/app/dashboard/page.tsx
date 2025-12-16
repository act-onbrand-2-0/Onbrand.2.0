'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { User, Building2, Shield, LogOut, MessageSquare, Settings, X } from 'lucide-react';
import Link from 'next/link';
import { BrandGuidelinesUpload } from '@/components/brand/BrandGuidelinesUpload';
import { BrandGuidelinesSettings } from '@/components/brand/BrandGuidelinesSettings';
import { getBrandGuidelines } from '@/lib/ai/guidelines-db';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface BrandUser {
  brand_id: string;
  role: string;
  created_at: string;
}

interface Quota {
  prompt_tokens_limit: number;
  prompt_tokens_used: number;
  image_generation_limit: number;
  image_generation_used: number;
  workflow_executions_limit: number;
  workflow_executions_used: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [brandUser, setBrandUser] = useState<BrandUser | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBrandSettings, setShowBrandSettings] = useState(false);
  const [guidelines, setGuidelines] = useState<any>(null);
  const [settingsView, setSettingsView] = useState<'upload' | 'settings'>('settings');

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    try {
      // Get current session (more reliable than getUser for OAuth)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        window.location.href = '/login';
        return;
      }

      const user = session.user;
      setUser(user);
      
      // Get brand from email if available
      let brandId = 'act'; // Default
      
      if (user.email) {
        const emailParts = user.email.split('@');
        if (emailParts.length > 1) {
          const domain = emailParts[1];
          const domainParts = domain.split('.');
          if (domainParts.length > 0) {
            // Extract organization name from email domain (e.g., user@creativetechnologists.nl -> creativetechnologists)
            brandId = domainParts[0];
            console.log('Extracted brand ID from email:', brandId);
          }
        }
      }

      // Get brand user info with error handling
      const { data: brandUserData, error: brandUserError } = await supabase
        .from('brand_users')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle instead of single to handle 0 or 1 results

      if (brandUserError) {
        console.error('Error fetching brand user:', brandUserError);
        // If brand_users query fails, user might not be assigned yet
        // Show a message or retry
        return;
      }

      if (brandUserData) {
        setBrandUser(brandUserData);
        brandId = brandUserData.brand_id; // Use the brand ID from the database if available

        // Get quota info
        const { data: quotaData, error: quotaError } = await supabase
          .from('brand_quotas')
          .select('*')
          .eq('brand_id', brandUserData.brand_id)
          .maybeSingle();

        if (quotaError) {
          console.error('Error fetching quota:', quotaError);
        }

        if (quotaData) {
          setQuota(quotaData);
        }
      } else {
        console.warn('No brand assignment found for user. Using brand ID from email domain:', brandId);
      }

      // Load approved guidelines if brand exists
      if (brandId) {
        const guidelinesData = await getBrandGuidelines(brandId);
        if (guidelinesData) {
          setGuidelines(guidelinesData);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  async function handleGuidelinesUpdate(updatedGuidelines: any) {
    setGuidelines(updatedGuidelines);
    
    // Save to database
    try {
      const response = await fetch(`/api/brands/${brandUser?.brand_id}/guidelines/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guidelines: updatedGuidelines }),
      });

      if (!response.ok) {
        console.error('Failed to save guidelines');
      }
    } catch (error) {
      console.error('Error saving guidelines:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-black mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const roleColors: Record<string, string> = {
    company_admin: 'bg-purple-100 text-purple-800 border-purple-200',
    owner: 'bg-blue-100 text-blue-800 border-blue-200',
    creator: 'bg-green-100 text-green-800 border-green-200',
    reviewer: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    user: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const roleName: Record<string, string> = {
    company_admin: 'Company Admin',
    owner: 'Owner',
    creator: 'Creator',
    reviewer: 'Reviewer',
    user: 'User',
  };

  const getQuotaPercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100);
  };

  const getQuotaColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">ACT 2.0</h1>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Welcome back!</h2>
          <p className="mt-2 text-gray-600">Here's your account overview</p>
        </div>

        {/* User Info Cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
          {/* User Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-gray-100 p-2">
                <User className="h-5 w-5 text-gray-700" />
              </div>
              <h3 className="font-semibold text-gray-900">User Info</h3>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium text-gray-900">{user?.email}</p>
            </div>
          </div>

          {/* Brand Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-blue-100 p-2">
                <Building2 className="h-5 w-5 text-blue-700" />
              </div>
              <h3 className="font-semibold text-gray-900">Brand</h3>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Organization</p>
              <p className="font-medium text-gray-900 uppercase">{brandUser?.brand_id || 'N/A'}</p>
            </div>
          </div>

          {/* Role Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-purple-100 p-2">
                <Shield className="h-5 w-5 text-purple-700" />
              </div>
              <h3 className="font-semibold text-gray-900">Access Level</h3>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Role</p>
              {brandUser?.role && (
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium border ${roleColors[brandUser.role] || roleColors.user}`}>
                  {roleName[brandUser.role] || brandUser.role}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quota Usage */}
        {quota && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Quota Usage</h3>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Prompt Tokens */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Prompt Tokens</span>
                  <span className="text-sm text-gray-600">
                    {quota.prompt_tokens_used.toLocaleString()} / {quota.prompt_tokens_limit.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${getQuotaColor(getQuotaPercentage(quota.prompt_tokens_used, quota.prompt_tokens_limit))}`}
                    style={{ width: `${getQuotaPercentage(quota.prompt_tokens_used, quota.prompt_tokens_limit)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {(100 - getQuotaPercentage(quota.prompt_tokens_used, quota.prompt_tokens_limit)).toFixed(1)}% remaining
                </p>
              </div>

              {/* Image Generation */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Image Generation</span>
                  <span className="text-sm text-gray-600">
                    {quota.image_generation_used.toLocaleString()} / {quota.image_generation_limit.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${getQuotaColor(getQuotaPercentage(quota.image_generation_used, quota.image_generation_limit))}`}
                    style={{ width: `${getQuotaPercentage(quota.image_generation_used, quota.image_generation_limit)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {(100 - getQuotaPercentage(quota.image_generation_used, quota.image_generation_limit)).toFixed(1)}% remaining
                </p>
              </div>

              {/* Workflow Executions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Workflows</span>
                  <span className="text-sm text-gray-600">
                    {quota.workflow_executions_used.toLocaleString()} / {quota.workflow_executions_limit.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${getQuotaColor(getQuotaPercentage(quota.workflow_executions_used, quota.workflow_executions_limit))}`}
                    style={{ width: `${getQuotaPercentage(quota.workflow_executions_used, quota.workflow_executions_limit)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {(100 - getQuotaPercentage(quota.workflow_executions_used, quota.workflow_executions_limit)).toFixed(1)}% remaining
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Brand Guidelines Status */}
        {guidelines && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-500 p-2">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Brand Guidelines Active</h3>
                  <p className="text-sm text-gray-600">Last updated: {new Date(guidelines.updated_at).toLocaleDateString()}</p>
                </div>
              </div>
              <button
                onClick={() => setShowBrandSettings(true)}
                className="text-sm text-green-700 hover:text-green-800 font-medium"
              >
                View Details →
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Voice</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {guidelines.voice?.personality?.length || 0} traits
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Colors</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {guidelines.visual_guidelines?.colors?.primary ? '✓ Defined' : 'Not set'}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Typography</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {guidelines.visual_guidelines?.typography?.headings?.family || 'Not set'}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Messaging</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {guidelines.messaging?.pillars?.length || 0} pillars
                </p>
              </div>
            </div>
          </div>
        )}

        {!guidelines && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-3 mb-2">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">No Brand Guidelines</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Upload your brand guidelines to enable AI-powered brand compliance checking.
            </p>
            <button
              onClick={() => setShowBrandSettings(true)}
              className="text-sm bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors font-medium"
            >
              Upload Guidelines
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-black hover:bg-gray-50 transition-colors">
              <MessageSquare className="h-8 w-8 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Start Chat</span>
            </button>
            <button className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-black hover:bg-gray-50 transition-colors">
              <svg className="h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-gray-900">Generate Image</span>
            </button>
            <button className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-black hover:bg-gray-50 transition-colors">
              <svg className="h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-medium text-gray-900">Upload Document</span>
            </button>
            <button 
              onClick={() => setShowBrandSettings(true)}
              className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-black hover:bg-gray-50 transition-colors"
            >
              <Settings className="h-8 w-8 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Brand Settings</span>
            </button>
          </div>
        </div>
      </main>

      {/* Brand Settings Modal */}
      {showBrandSettings && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setShowBrandSettings(false)}
          />
          
          {/* Modal Container */}
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">Brand Configuration</h2>
                    <p className="text-blue-100 text-sm mt-1">Manage your brand guidelines</p>
                  </div>
                  <button
                    onClick={() => setShowBrandSettings(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="h-6 w-6 text-white" />
                  </button>
                </div>
                
                {/* Tabs */}
                {guidelines && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSettingsView('settings')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        settingsView === 'settings'
                          ? 'bg-white text-blue-700'
                          : 'bg-blue-500/30 text-white hover:bg-blue-500/50'
                      }`}
                    >
                      View Settings
                    </button>
                    <button
                      onClick={() => setSettingsView('upload')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        settingsView === 'upload'
                          ? 'bg-white text-blue-700'
                          : 'bg-blue-500/30 text-white hover:bg-blue-500/50'
                      }`}
                    >
                      Upload New
                    </button>
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="p-6 max-h-[70vh] overflow-y-auto bg-gray-50">
                {settingsView === 'settings' && guidelines ? (
                  <BrandGuidelinesSettings
                    guidelines={guidelines}
                    brandId={brandUser?.brand_id || 'act'}
                    onUpdate={handleGuidelinesUpdate}
                  />
                ) : (
                  <BrandGuidelinesUpload
                    brandId={brandUser?.brand_id || 'act'}
                    brandName={brandUser?.brand_id?.toUpperCase() || 'ACT'}
                    existingGuidelines={guidelines ? {
                      ...guidelines,
                      // Temporarily exclude new fields that aren't rendered yet
                      contentGuidelines: undefined,
                      socialMediaGuidelines: undefined,
                      logoAssets: undefined,
                    } : undefined}
                    onGuidelinesApproved={() => {
                      setShowBrandSettings(false);
                      loadUserData(); // Reload to fetch new guidelines
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
