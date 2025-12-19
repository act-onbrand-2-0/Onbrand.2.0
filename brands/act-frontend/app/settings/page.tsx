'use client';

import { useEffect, useState } from 'react';
import { Settings, Server, Bell, Shield, Palette, Users } from 'lucide-react';
import { MCPServerManager } from '@/components/mcp';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import { SidebarProvider } from '@/components/ui/sidebar';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type SettingsTab = 'general' | 'mcp' | 'notifications' | 'security' | 'appearance' | 'team';

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const tabs: TabConfig[] = [
  { id: 'general', label: 'General', icon: <Settings className="size-4" />, description: 'Basic settings' },
  { id: 'mcp', label: 'MCP Servers', icon: <Server className="size-4" />, description: 'AI tool integrations' },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="size-4" />, description: 'Email and push' },
  { id: 'security', label: 'Security', icon: <Shield className="size-4" />, description: 'Authentication' },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="size-4" />, description: 'Theme' },
  { id: 'team', label: 'Team', icon: <Users className="size-4" />, description: 'Members' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>('');
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    async function loadUserData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          window.location.href = '/login';
          return;
        }

        const currentUser = session.user;
        setUser(currentUser);
        setUserName(currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User');

        // Get user's brand
        const { data: brandUserData } = await supabase
          .from('brand_users')
          .select('brand_id, role')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (brandUserData) {
          setBrandId(brandUserData.brand_id);
          setBrandName(brandUserData.brand_id);
          setUserRole(brandUserData.role);
        } else {
          // Fallback: derive from email domain
          if (currentUser.email) {
            const domain = currentUser.email.split('@')[1]?.split('.')[0] || 'act';
            setBrandId(domain);
            setBrandName(domain);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserData();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  const isAdmin = userRole === 'owner' || userRole === 'admin';

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider className="bg-sidebar">
      <DashboardSidebar 
        user={{
          name: userName,
          email: user?.email || '',
          avatar: user?.user_metadata?.avatar_url,
        }}
        brand={{
          id: brandId || 'act',
          name: brandName || 'ACT',
          memberCount: 4,
        }}
        onSignOut={handleSignOut}
      />
      <div className="h-svh overflow-hidden lg:p-2 w-full">
        <div className="lg:border lg:rounded-md overflow-hidden flex flex-col h-full w-full bg-background">
          <DashboardHeader title="Settings" />
          
          <div className="flex-1 overflow-auto p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-bold mb-2">Settings</h1>
                <p className="text-muted-foreground">
                  Manage your account and brand settings
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar Navigation */}
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

                {/* Content Area */}
                <div className="flex-1 bg-card border rounded-lg p-6 min-h-[400px]">
                  {activeTab === 'general' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-lg font-semibold mb-1">General Settings</h2>
                        <p className="text-sm text-muted-foreground">
                          Basic account and brand configuration
                        </p>
                      </div>
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
                      </div>
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
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-lg font-semibold mb-1">Team Members</h2>
                        <p className="text-sm text-muted-foreground">
                          Manage team members and roles
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">
                          Team management coming soon.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
