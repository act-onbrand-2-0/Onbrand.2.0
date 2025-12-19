import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';
import type { MCPServerConfig, MCPConnectionStatus } from './types';

type MCPClient = Awaited<ReturnType<typeof createMCPClient>>;

interface MCPClientInstance {
  client: MCPClient;
  config: MCPServerConfig;
  connectedAt: Date;
}

/**
 * MCP Client Manager
 * Manages connections to multiple MCP servers and aggregates their tools
 */
export class MCPClientManager {
  private clients: Map<string, MCPClientInstance> = new Map();
  private connectionTimeout: number = 30000; // Default 30s timeout

  constructor(timeout?: number) {
    if (timeout) {
      this.connectionTimeout = timeout;
    }
  }

  /**
   * Connect to an MCP server based on its configuration
   */
  async connect(config: MCPServerConfig): Promise<MCPConnectionStatus> {
    if (!config.enabled) {
      return {
        serverId: config.id,
        serverName: config.name,
        connected: false,
        error: 'Server is disabled',
      };
    }

    try {
      // Build transport configuration based on type
      let transport: Parameters<typeof createMCPClient>[0]['transport'];

      switch (config.transport_type) {
        case 'http':
          if (!config.url) throw new Error('URL is required for HTTP transport');
          transport = {
            type: 'http' as const,
            url: config.url,
            headers: this.buildAuthHeaders(config),
          };
          break;

        case 'sse':
          if (!config.url) throw new Error('URL is required for SSE transport');
          transport = {
            type: 'sse' as const,
            url: config.url,
            headers: this.buildAuthHeaders(config),
          };
          break;

        case 'stdio':
          // Note: stdio transport requires different handling and is not recommended for production
          // For now, we'll skip stdio in the web environment
          throw new Error('Stdio transport is not supported in browser/serverless environments');

        default:
          throw new Error(`Unknown transport type: ${config.transport_type}`);
      }

      // Create the MCP client
      const client = await createMCPClient({
        transport,
      });

      // Store the client instance
      this.clients.set(config.id, {
        client,
        config,
        connectedAt: new Date(),
      });

      // Get tool count for status
      const tools = await client.tools();
      const toolCount = Object.keys(tools).length;

      return {
        serverId: config.id,
        serverName: config.name,
        connected: true,
        toolCount,
      };
    } catch (error) {
      console.error(`Failed to connect to MCP server ${config.name}:`, error);
      return {
        serverId: config.id,
        serverName: config.name,
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Connect to multiple MCP servers
   */
  async connectAll(configs: MCPServerConfig[]): Promise<MCPConnectionStatus[]> {
    // Sort by priority (higher first)
    const sortedConfigs = [...configs].sort((a, b) => b.priority - a.priority);
    
    // Connect to all servers in parallel
    const results = await Promise.all(
      sortedConfigs.map(config => this.connect(config))
    );

    return results;
  }

  /**
   * Get all tools from all connected MCP servers
   */
  async getAllTools(): Promise<Record<string, unknown>> {
    const allTools: Record<string, unknown> = {};

    // Collect tools from all connected clients
    // Earlier (higher priority) clients' tools take precedence
    for (const [serverId, instance] of this.clients) {
      try {
        const serverTools = await instance.client.tools();
        
        // Filter tools based on allowed/blocked lists
        const filteredTools = this.filterTools(serverTools, instance.config);
        
        // Merge tools (don't override existing tools from higher priority servers)
        for (const [toolName, tool] of Object.entries(filteredTools)) {
          if (!(toolName in allTools)) {
            allTools[toolName] = tool;
          }
        }
      } catch (error) {
        console.error(`Failed to get tools from server ${instance.config.name}:`, error);
      }
    }

    return allTools;
  }

  /**
   * Get tools from a specific server
   */
  async getServerTools(serverId: string): Promise<Record<string, unknown> | null> {
    const instance = this.clients.get(serverId);
    if (!instance) return null;

    try {
      const tools = await instance.client.tools();
      return this.filterTools(tools, instance.config);
    } catch (error) {
      console.error(`Failed to get tools from server ${instance.config.name}:`, error);
      return null;
    }
  }

  /**
   * Disconnect from a specific server
   */
  async disconnect(serverId: string): Promise<void> {
    const instance = this.clients.get(serverId);
    if (instance) {
      try {
        await instance.client.close();
      } catch (error) {
        console.error(`Error closing MCP client ${instance.config.name}:`, error);
      }
      this.clients.delete(serverId);
    }
  }

  /**
   * Disconnect from all servers and cleanup
   */
  async disconnectAll(): Promise<void> {
    const closePromises = Array.from(this.clients.values()).map(async instance => {
      try {
        await instance.client.close();
      } catch (error) {
        console.error(`Error closing MCP client ${instance.config.name}:`, error);
      }
    });

    await Promise.all(closePromises);
    this.clients.clear();
  }

  /**
   * Get connection status for all servers
   */
  getConnectionStatuses(): MCPConnectionStatus[] {
    return Array.from(this.clients.values()).map(instance => ({
      serverId: instance.config.id,
      serverName: instance.config.name,
      connected: true,
    }));
  }

  /**
   * Check if a specific server is connected
   */
  isConnected(serverId: string): boolean {
    return this.clients.has(serverId);
  }

  /**
   * Get the number of connected servers
   */
  get connectedCount(): number {
    return this.clients.size;
  }

  // Private helper methods

  private buildAuthHeaders(config: MCPServerConfig): Record<string, string> {
    const headers: Record<string, string> = {};

    console.log('Building auth headers:', {
      auth_type: config.auth_type,
      has_token: !!config.auth_token_encrypted,
      auth_header: config.auth_header,
    });

    // Check if we have auth configured
    const hasAuth = config.auth_type && config.auth_type !== 'none';
    const hasToken = config.auth_token_encrypted && config.auth_token_encrypted.trim() !== '';

    if (hasAuth && hasToken) {
      const token = config.auth_token_encrypted!.trim();
      const headerName = config.auth_header || 'Authorization';

      switch (config.auth_type) {
        case 'bearer':
          headers[headerName] = `Bearer ${token}`;
          console.log(`Added Bearer auth header: ${headerName}`);
          break;
        case 'api_key':
          headers[headerName] = token;
          console.log(`Added API key header: ${headerName}`);
          break;
        case 'smithery':
        case 'oauth':
          // Use OAuth access token if available
          if (config.oauth_access_token) {
            headers['Authorization'] = `Bearer ${config.oauth_access_token}`;
            console.log('Added Smithery/OAuth auth header');
          } else if (hasToken) {
            // Fallback to regular token
            headers[headerName] = `Bearer ${token}`;
            console.log('Added fallback Bearer auth header');
          }
          break;
      }
    } else if (config.auth_type === 'smithery' || config.auth_type === 'oauth') {
      // For OAuth, check for access token even if auth_token_encrypted is empty
      if (config.oauth_access_token) {
        headers['Authorization'] = `Bearer ${config.oauth_access_token}`;
        console.log('Added Smithery/OAuth auth header from oauth_access_token');
      } else {
        console.log('OAuth configured but no access token available');
      }
    } else {
      console.log('No auth configured or missing token');
    }

    return headers;
  }

  private filterTools(
    tools: Record<string, unknown>,
    config: MCPServerConfig
  ): Record<string, unknown> {
    let filteredTools = { ...tools };

    // If allowed_tools is set, only include those
    if (config.allowed_tools && config.allowed_tools.length > 0) {
      filteredTools = Object.fromEntries(
        Object.entries(filteredTools).filter(([name]) =>
          config.allowed_tools!.includes(name)
        )
      );
    }

    // Remove blocked tools
    if (config.blocked_tools && config.blocked_tools.length > 0) {
      filteredTools = Object.fromEntries(
        Object.entries(filteredTools).filter(([name]) =>
          !config.blocked_tools!.includes(name)
        )
      );
    }

    return filteredTools;
  }
}

// Factory function for creating a manager instance
export function createMCPManager(timeout?: number): MCPClientManager {
  return new MCPClientManager(timeout);
}
