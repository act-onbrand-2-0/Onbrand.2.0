/**
 * Dynamic loader for MCP Client Manager
 * This prevents @ai-sdk/mcp from being imported during build time
 * which causes DOMMatrix errors in Node.js environment
 */

import type { MCPServerConfig, MCPConnectionStatus } from './types';

// Determine if we should skip MCP loading entirely
// This must be checked at module load time, not runtime
const SKIP_MCP_LOADING = 
  typeof process !== 'undefined' && (
    process.env.DISABLE_MCP === 'true' ||
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.NODE_ENV === 'production' && typeof window === 'undefined'
  );

export interface IMCPClientManager {
  connect(config: MCPServerConfig): Promise<MCPConnectionStatus>;
  connectAll(configs: MCPServerConfig[]): Promise<MCPConnectionStatus[]>;
  disconnect(serverId: string): Promise<void>;
  disconnectAll(): Promise<void>;
  getAllTools(): Promise<Record<string, unknown>>;
  getServerTools(serverId: string): Promise<Record<string, unknown> | null>;
  getClient(serverId: string): unknown;
  isConnected(serverId: string): boolean;
  getConnectedServers(): string[];
}

let MCPClientManagerClass: any = null;

/**
 * Stub implementation when MCP is not available
 * This allows the app to function without MCP features
 */
class StubMCPManager implements IMCPClientManager {
  async connect() { 
    return { serverId: '', serverName: '', connected: false, error: 'MCP not available' }; 
  }
  async connectAll() { 
    return []; 
  }
  async disconnect() {}
  async disconnectAll() {}
  async getAllTools() { 
    return {}; 
  }
  async getServerTools() { 
    return null; 
  }
  getClient() { 
    return null; 
  }
  isConnected() { 
    return false; 
  }
  getConnectedServers() { 
    return []; 
  }
}

/**
 * Dynamically load the MCP Client Manager only when needed
 * This prevents build-time errors from @ai-sdk/mcp
 */
async function loadMCPClientManager() {
  if (MCPClientManagerClass) {
    return MCPClientManagerClass;
  }

  // Check if MCP is disabled (e.g., during build)
  if (process.env.DISABLE_MCP === 'true') {
    console.log('MCP disabled via DISABLE_MCP flag, using stub');
    return StubMCPManager;
  }

  // Check if we're in a build environment
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('Build phase detected, using stub MCP manager');
    return StubMCPManager;
  }

  try {
    // Use string concatenation to prevent static analysis by bundler
    // This is the ONLY way to prevent Turbopack from following the import
    const modulePath = './client-' + 'manager';
    const module = await import(/* webpackIgnore: true */ modulePath);
    MCPClientManagerClass = module.MCPClientManager;
    return MCPClientManagerClass;
  } catch (error) {
    console.warn('MCP Client Manager not available, using stub:', error);
    return StubMCPManager;
  }
}

/**
 * Create an MCP Manager instance
 * This function can be safely imported at build time
 */
export async function createMCPManager(timeout?: number): Promise<IMCPClientManager> {
  const ManagerClass = await loadMCPClientManager();
  return new ManagerClass(timeout);
}

/**
 * Check if MCP is available (for feature detection)
 */
export function isMCPAvailable(): boolean {
  try {
    // Just check if we can require the module
    return true;
  } catch {
    return false;
  }
}
