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
  Server, 
  ChevronDown, 
  Loader2, 
  CheckCircle, 
  XCircle,
  Settings2
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
        // Only show enabled servers at the brand level
        const enabledServers = data.servers.filter((s: MCPServer) => s.enabled);
        setServers(enabledServers);
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
    onSelectionChange(servers.map(s => s.id));
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
          return (
            <DropdownMenuItem
              key={server.id}
              className="flex items-start gap-3 cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
                handleToggleServer(server.id);
              }}
            >
              <Checkbox
                checked={isSelected}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm truncate">{server.name}</span>
                  {isSelected ? (
                    <CheckCircle className="size-3 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="size-3 text-muted-foreground/50 shrink-0" />
                  )}
                </div>
                {server.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {server.description}
                  </p>
                )}
              </div>
            </DropdownMenuItem>
          );
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
