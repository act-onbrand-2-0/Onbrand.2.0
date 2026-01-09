'use client';

import { useEffect, useState } from 'react';
import { Settings, Server, Bell, Shield, Palette, Users, MessageSquare } from 'lucide-react';
import { MCPServerManager } from '@/components/mcp';
import { ConversationStartersEditor } from '@/components/settings/conversation-starters-editor';
import { TeamManager } from '@/components/settings/team-manager';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type SettingsTab = 'general' | 'conversation-starters' | 'mcp' | 'notifications' | 'security' | 'appearance' | 'team';

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const tabs: TabConfig[] = [
  { id: 'general', label: 'General', icon: <Settings className="size-4" />, description: 'Basic settings' },
  { id: 'conversation-starters', label: 'Chat Starters', icon: <MessageSquare className="size-4" />, description: 'Role prompts' },
  { id: 'mcp', label: 'MCP Servers', icon: <Server className="size-4" />, description: 'AI tool integrations' },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="size-4" />, description: 'Email and push' },
  { id: 'security', label: 'Security', icon: <Shield className="size-4" />, description: 'Authentication' },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="size-4" />, description: 'Theme' },
  { id: 'team', label: 'Team', icon: <Users className="size-4" />, description: 'Members' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [userId, setUserId] = useState<string | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [jobFunction, setJobFunction] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingJobFunction, setIsSavingJobFunction] = useState(false);
  const [jobFunctionError, setJobFunctionError] = useState<string | null>(null);
  const [jobFunctionSuccess, setJobFunctionSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    
    async function loadUserData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) return;
        
        setUserId(session.user.id);

        const { data: brandUserData } = await supabase
          .from('brand_users')
          .select('brand_id, role, job_function')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (brandUserData) {
          setBrandId(brandUserData.brand_id);
          setBrandName(brandUserData.brand_id);
          setUserRole(brandUserData.role);
          setJobFunction(brandUserData.job_function);
        } else if (session.user.email) {
          const domain = session.user.email.split('@')[1]?.split('.')[0] || 'act';
          setBrandId(domain);
          setBrandName(domain);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserData();
  }, []);

  async function handleJobFunctionChange(newJobFunction: string) {
    if (!brandId) return;
    
    setIsSavingJobFunction(true);
    setJobFunctionError(null);
    setJobFunctionSuccess(false);
    
    try {
      const res = await fetch('/api/me/job-function', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobFunction: newJobFunction, brandId }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setJobFunction(newJobFunction);
        setJobFunctionSuccess(true);
        setTimeout(() => setJobFunctionSuccess(false), 3000);
      } else {
        setJobFunctionError(data.error || 'Failed to update job function');
      }
    } catch (err) {
      console.error('Error updating job function:', err);
      setJobFunctionError('Network error. Please try again.');
    } finally {
      setIsSavingJobFunction(false);
    }
  }

  const isAdmin = userRole === 'owner' || userRole === 'admin';

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-auto p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and brand settings
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <nav className="w-full md:w-56 space-y-1 shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sm",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                {tab.icon}
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="flex-1 bg-card border rounded-lg p-6 min-h-[400px]">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">General Settings</h2>
                  <p className="text-sm text-muted-foreground">
                    Basic account and brand configuration
                  </p>
                </div>
                
                {jobFunctionSuccess && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-sm text-green-800 dark:text-green-200">
                    Job function updated successfully!
                  </div>
                )}
                
                {jobFunctionError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-800 dark:text-red-200">
                    {jobFunctionError}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Brand Name</label>
                    <input
                      type="text"
                      defaultValue={brandName}
                      className="mt-1 w-full px-3 py-2 border rounded-md bg-background"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Brand ID</label>
                    <input
                      type="text"
                      defaultValue={brandId || ''}
                      className="mt-1 w-full px-3 py-2 border rounded-md bg-muted text-muted-foreground"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Your Role</label>
                    <input
                      type="text"
                      defaultValue={userRole || 'user'}
                      className="mt-1 w-full px-3 py-2 border rounded-md bg-muted text-muted-foreground capitalize"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">
                      Job Function
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Your job function determines personalized AI suggestions in the chatbot
                    </p>
                    <select
                      value={jobFunction || ''}
                      onChange={(e) => handleJobFunctionChange(e.target.value)}
                      disabled={isSavingJobFunction}
                      className="w-full px-3 py-2 border rounded-md bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select your role...</option>
                      <option value="Strategist">Strategist</option>
                      <option value="Creative">Creative</option>
                      <option value="Account Manager">Account Manager</option>
                      <option value="Social Media Manager">Social Media Manager</option>
                      <option value="Communication Manager">Communication Manager</option>
                      <option value="Other">Other</option>
                    </select>
                    {isSavingJobFunction && (
                      <p className="text-xs text-muted-foreground mt-1">Saving...</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'conversation-starters' && (
              <div>
                {!isAdmin ? (
                  <div className="text-center py-12">
                    <Shield className="size-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">Admin Access Required</h3>
                    <p className="text-sm text-muted-foreground">
                      Only brand admins can customize conversation starters.
                    </p>
                  </div>
                ) : !jobFunction ? (
                  <div className="text-center py-12">
                    <MessageSquare className="size-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">Select a Job Function First</h3>
                    <p className="text-sm text-muted-foreground">
                      Go to General settings and select your job function to customize conversation starters.
                    </p>
                  </div>
                ) : brandId && userId ? (
                  <ConversationStartersEditor brandId={brandId} userId={userId} jobFunction={jobFunction} />
                ) : (
                  <p className="text-muted-foreground">Unable to load conversation starters.</p>
                )}
              </div>
            )}

            {activeTab === 'mcp' && (
              <div>
                {!isAdmin ? (
                  <div className="text-center py-12">
                    <Shield className="size-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">Admin Access Required</h3>
                    <p className="text-sm text-muted-foreground">
                      Only brand admins can manage MCP server integrations.
                    </p>
                  </div>
                ) : brandId ? (
                  <MCPServerManager brandId={brandId} />
                ) : (
                  <p className="text-muted-foreground">Unable to load MCP settings.</p>
                )}
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Notifications</h2>
                  <p className="text-sm text-muted-foreground">
                    Configure how you receive notifications
                  </p>
                </div>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Email notifications for new messages</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Email notifications for project updates</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Weekly digest emails</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Security</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage authentication and access controls
                  </p>
                </div>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Security settings coming soon.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Appearance</h2>
                  <p className="text-sm text-muted-foreground">
                    Customize the look and feel
                  </p>
                </div>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Appearance customization coming soon.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'team' && (
              <div>
                {!isAdmin ? (
                  <div className="text-center py-12">
                    <Shield className="size-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">Admin Access Required</h3>
                    <p className="text-sm text-muted-foreground">
                      Only brand owners and admins can manage team members.
                    </p>
                  </div>
                ) : brandId && userRole ? (
                  <TeamManager brandId={brandId} userRole={userRole} />
                ) : (
                  <p className="text-muted-foreground">Unable to load team settings.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
