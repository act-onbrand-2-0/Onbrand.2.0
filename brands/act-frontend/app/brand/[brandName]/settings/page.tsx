'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Settings, Server, Bell, Shield, Palette, Users } from 'lucide-react';
import { MCPServerManager } from '@/components/mcp';
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
  { id: 'general', label: 'General', icon: <Settings className="size-4" />, description: 'Basic brand settings' },
  { id: 'mcp', label: 'MCP Servers', icon: <Server className="size-4" />, description: 'AI tool integrations' },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="size-4" />, description: 'Email and push notifications' },
  { id: 'security', label: 'Security', icon: <Shield className="size-4" />, description: 'Authentication and access' },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="size-4" />, description: 'Theme and branding' },
  { id: 'team', label: 'Team', icon: <Users className="size-4" />, description: 'Team members and roles' },
];

export default function BrandSettingsPage() {
  const params = useParams();
  const brandName = params.brandName as string;
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [brandId, setBrandId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fetch brand ID from brand name
  useEffect(() => {
    async function fetchBrandId() {
      const supabase = createClient();
      
      // Get brand by name/slug
      const { data: brand, error } = await supabase
        .from('brands')
        .select('id')
        .or(`name.ilike.${brandName},slug.eq.${brandName}`)
        .single();

      if (error) {
        console.error('Error fetching brand:', error);
        // Fallback: use brand name as ID for development
        setBrandId(brandName);
      } else if (brand) {
        setBrandId(brand.id);
      }

      // Check user role
      const { data: { user } } = await supabase.auth.getUser();
      if (user && brand) {
        const { data: membership } = await supabase
          .from('brand_members')
          .select('role')
          .eq('brand_id', brand.id)
          .eq('user_id', user.id)
          .single();
        
        if (membership) {
          setUserRole(membership.role);
        }
      }

      setIsLoading(false);
    }

    fetchBrandId();
  }, [brandName]);

  const isAdmin = userRole === 'owner' || userRole === 'admin';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your brand settings and integrations
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <nav className="w-full md:w-64 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                {tab.icon}
                <div>
                  <div className="font-medium">{tab.label}</div>
                  <div className={cn(
                    "text-xs",
                    activeTab === tab.id
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  )}>
                    {tab.description}
                  </div>
                </div>
              </button>
            ))}
          </nav>

          {/* Content Area */}
          <div className="flex-1 bg-card border rounded-lg p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">General Settings</h2>
                <p className="text-muted-foreground">
                  Configure basic settings for your brand.
                </p>
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
                </div>
              </div>
            )}

            {activeTab === 'mcp' && (
              <div>
                {!isAdmin ? (
                  <div className="text-center py-8">
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
                <h2 className="text-lg font-semibold">Notification Settings</h2>
                <p className="text-muted-foreground">
                  Configure how you receive notifications.
                </p>
                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span>Email notifications for new messages</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span>Email notifications for project updates</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="rounded" />
                    <span>Weekly digest emails</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Security Settings</h2>
                <p className="text-muted-foreground">
                  Manage authentication and access controls.
                </p>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Security settings coming soon.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Appearance Settings</h2>
                <p className="text-muted-foreground">
                  Customize the look and feel of your brand portal.
                </p>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Appearance customization coming soon.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'team' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Team Members</h2>
                <p className="text-muted-foreground">
                  Manage team members and their roles.
                </p>
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
  );
}
