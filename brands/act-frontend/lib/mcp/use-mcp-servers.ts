'use client';

import { useState, useCallback, useEffect } from 'react';
import type { MCPServerConfig, MCPServerInput } from './types';

interface UseMCPServersProps {
  brandId: string;
}

interface UseMCPServersReturn {
  servers: MCPServerConfig[];
  isLoading: boolean;
  error: string | null;
  fetchServers: () => Promise<void>;
  createServer: (input: MCPServerInput) => Promise<MCPServerConfig | null>;
  updateServer: (serverId: string, updates: Partial<MCPServerInput>) => Promise<MCPServerConfig | null>;
  deleteServer: (serverId: string) => Promise<boolean>;
  testConnection: (config: Partial<MCPServerConfig>) => Promise<{
    success: boolean;
    toolCount?: number;
    tools?: string[];
    error?: string;
    message: string;
  }>;
}

export function useMCPServers({ brandId }: UseMCPServersProps): UseMCPServersReturn {
  const [servers, setServers] = useState<MCPServerConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = useCallback(async () => {
    if (!brandId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/mcp/servers?brandId=${brandId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch MCP servers');
      }

      setServers(data.servers || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch MCP servers';
      setError(message);
      console.error('Failed to fetch MCP servers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [brandId]);

  const createServer = useCallback(async (input: MCPServerInput): Promise<MCPServerConfig | null> => {
    setError(null);

    try {
      const response = await fetch('/api/mcp/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, ...input }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create MCP server');
      }

      // Refresh the servers list
      await fetchServers();

      return data.server;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create MCP server';
      setError(message);
      console.error('Failed to create MCP server:', err);
      return null;
    }
  }, [brandId, fetchServers]);

  const updateServer = useCallback(async (
    serverId: string,
    updates: Partial<MCPServerInput>
  ): Promise<MCPServerConfig | null> => {
    setError(null);

    try {
      const response = await fetch('/api/mcp/servers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId, ...updates }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update MCP server');
      }

      // Update local state
      setServers(prev =>
        prev.map(s => (s.id === serverId ? data.server : s))
      );

      return data.server;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update MCP server';
      setError(message);
      console.error('Failed to update MCP server:', err);
      return null;
    }
  }, []);

  const deleteServer = useCallback(async (serverId: string): Promise<boolean> => {
    setError(null);

    try {
      const response = await fetch(`/api/mcp/servers?serverId=${serverId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete MCP server');
      }

      // Update local state
      setServers(prev => prev.filter(s => s.id !== serverId));

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete MCP server';
      setError(message);
      console.error('Failed to delete MCP server:', err);
      return false;
    }
  }, []);

  const testConnection = useCallback(async (config: Partial<MCPServerConfig>) => {
    try {
      const response = await fetch('/api/mcp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server: config }),
      });

      const data = await response.json();
      return data;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Connection test failed',
        message: 'Failed to test connection',
      };
    }
  }, []);

  // Fetch servers on mount and when brandId changes
  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  return {
    servers,
    isLoading,
    error,
    fetchServers,
    createServer,
    updateServer,
    deleteServer,
    testConnection,
  };
}
