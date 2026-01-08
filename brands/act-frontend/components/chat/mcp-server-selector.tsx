'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Server, 
  ChevronDown, 
  Loader2, 
  CheckCircle, 
  XCircle,
  Settings2,
  Search,
  Globe,
  Database,
  FileText,
  Code,
  Zap,
  Bot,
  Plug,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Icon mapping for known MCP servers
const SERVER_ICONS: Record<string, React.ElementType> = {
  'brave': Search,
  'search': Search,
  'web': Globe,
  'simplicate': Database,
  'simpl': Database,
  'database': Database,
  'db': Database,
  'file': FileText,
  'document': FileText,
  'code': Code,
  'github': Code,
  'api': Zap,
  'assistant': Bot,
  'default': Plug,
};

// Get icon for a server based on its name
function getServerIcon(serverName: string): React.ElementType {
  const nameLower = serverName.toLowerCase();
  for (const [key, icon] of Object.entries(SERVER_ICONS)) {
    if (nameLower.includes(key)) {
      return icon;
    }
  }
  return SERVER_ICONS.default;
}

export interface MCPServer {
  id: string;
  name: string;
  description?: string | null;
  enabled: boolean;
}

interface MCPServerSelectorProps {
  brandId: string;
  selectedServerIds: string[];
  onSelectionChange: (serverIds: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export function MCPServerSelector({
  brandId,
  selectedServerIds,
  onSelectionChange,
  disabled = false,
  className,
}: MCPServerSelectorProps) {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch MCP servers for the brand
  const fetchServers = useCallback(async () => {
    if (!brandId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/mcp/servers?brandId=${brandId}`);
      const data = await response.json();
      
      if (response.ok && data.servers) {
        // Show all servers so users can see what's available
        // The 'enabled' field indicates if the server is active at the brand level
        setServers(data.servers);
      }
    } catch (error) {
      console.error('Failed to fetch MCP servers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const handleToggleServer = (serverId: string) => {
    const isSelected = selectedServerIds.includes(serverId);
    if (isSelected) {
      onSelectionChange(selectedServerIds.filter(id => id !== serverId));
    } else {
      onSelectionChange([...selectedServerIds, serverId]);
    }
  };

  const handleSelectAll = () => {
    // Only select enabled servers
    onSelectionChange(servers.filter(s => s.enabled).map(s => s.id));
  };

  const handleSelectNone = () => {
    onSelectionChange([]);
  };

  // Don't render if no MCP servers are available
  if (!isLoading && servers.length === 0) {
    return null;
  }

  const activeCount = selectedServerIds.filter(id => 
    servers.some(s => s.id === id)
  ).length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled || isLoading}
          className={cn(
            "h-8 gap-1.5 px-2 text-xs font-normal",
            activeCount > 0 && "text-primary",
            className
          )}
        >
          {isLoading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Server className="size-3.5" />
          )}
          <span className="hidden sm:inline">
            {activeCount > 0 ? `${activeCount} Tool${activeCount > 1 ? 's' : ''}` : 'Tools'}
          </span>
          <ChevronDown className="size-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>MCP Servers</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleSelectAll}
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleSelectNone}
            >
              None
            </Button>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {servers.map((server) => {
          const isSelected = selectedServerIds.includes(server.id);
          const isDisabledAtBrand = !server.enabled;
          const ServerIcon = getServerIcon(server.name);
          
          const menuItem = (
            <DropdownMenuItem
              key={server.id}
              className={cn(
                "flex items-start gap-3 cursor-pointer",
                isDisabledAtBrand && "opacity-50"
              )}
              disabled={isDisabledAtBrand}
              onSelect={() => {
                if (!isDisabledAtBrand) {
                  handleToggleServer(server.id);
                }
              }}
            >
              <Checkbox
                checked={isSelected}
                disabled={isDisabledAtBrand}
                className="mt-0.5"
              />
              <ServerIcon className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm truncate">{server.name}</span>
                  {isDisabledAtBrand ? (
                    <span className="text-[10px] text-muted-foreground">(disabled)</span>
                  ) : isSelected ? (
                    <CheckCircle className="size-3 text-green-500 shrink-0" />
                  ) : null}
                </div>
              </div>
            </DropdownMenuItem>
          );

          // Wrap with tooltip if there's a description
          if (server.description) {
            return (
              <TooltipProvider key={server.id} delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {menuItem}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[200px]">
                    <p className="text-xs">{server.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
          
          return menuItem;
        })}
        
        {servers.length === 0 && !isLoading && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No MCP servers configured
          </div>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2 text-muted-foreground"
          onSelect={() => {
            // Navigate to settings - you could also open a modal
            window.open('/dashboard/settings?tab=mcp', '_blank');
          }}
        >
          <Settings2 className="size-3.5" />
          <span className="text-xs">Manage MCP Servers</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
