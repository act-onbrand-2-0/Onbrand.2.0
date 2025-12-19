// MCP Server Configuration Types

export type MCPTransportType = 'http' | 'sse' | 'stdio';
export type MCPAuthType = 'none' | 'bearer' | 'api_key' | 'oauth' | 'smithery';

export interface MCPServerConfig {
  id: string;
  brand_id: string; // TEXT type in database (not UUID)
  name: string;
  description?: string | null;
  
  // Transport
  transport_type: MCPTransportType;
  url?: string | null;
  command?: string | null;
  args?: string[] | null;
  
  // Auth
  auth_type?: MCPAuthType | null;
  auth_header?: string | null;
  auth_token_encrypted?: string | null;
  
  // OAuth / Smithery
  oauth_client_id?: string | null;
  oauth_access_token?: string | null;
  oauth_refresh_token?: string | null;
  oauth_expires_at?: string | null;
  
  // Config
  enabled: boolean;
  priority: number;
  timeout_ms: number;
  
  // Tool filtering
  allowed_tools?: string[] | null;
  blocked_tools?: string[] | null;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface MCPServerInput {
  name: string;
  description?: string;
  transport_type: MCPTransportType;
  url?: string;
  command?: string;
  args?: string[];
  auth_type?: MCPAuthType;
  auth_header?: string;
  auth_token?: string; // Plain text, will be encrypted server-side
  enabled?: boolean;
  priority?: number;
  timeout_ms?: number;
  allowed_tools?: string[];
  blocked_tools?: string[];
}

export interface MCPToolResult {
  serverId: string;
  serverName: string;
  tools: Record<string, unknown>;
}

export interface MCPConnectionStatus {
  serverId: string;
  serverName: string;
  connected: boolean;
  error?: string;
  toolCount?: number;
}
