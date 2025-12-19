import { type NextRequest, NextResponse } from 'next/server';
import { createMCPManager, type MCPServerConfig } from '@/lib/mcp';

export const dynamic = 'force-dynamic';

// POST /api/mcp/test - Test an MCP server connection
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { server } = body as { server: Partial<MCPServerConfig> };

    if (!server) {
      return NextResponse.json(
        { error: 'Server configuration is required' },
        { status: 400 }
      );
    }

    if (!server.transport_type) {
      return NextResponse.json(
        { error: 'Transport type is required' },
        { status: 400 }
      );
    }

    if ((server.transport_type === 'http' || server.transport_type === 'sse') && !server.url) {
      return NextResponse.json(
        { error: 'URL is required for HTTP/SSE transport' },
        { status: 400 }
      );
    }

    console.log('Test connection received:', {
      transport_type: server.transport_type,
      url: server.url,
      auth_type: server.auth_type,
      has_token: !!server.auth_token_encrypted,
      token_length: server.auth_token_encrypted?.length || 0,
    });

    // Create a temporary config for testing
    const testConfig: MCPServerConfig = {
      id: 'test-connection',
      brand_id: 'test',
      name: server.name || 'Test Server',
      description: server.description || null,
      transport_type: server.transport_type,
      url: server.url || null,
      command: server.command || null,
      args: server.args || null,
      auth_type: server.auth_type || null,
      auth_header: server.auth_header || null,
      auth_token_encrypted: server.auth_token_encrypted || null,
      enabled: true,
      priority: 0,
      timeout_ms: server.timeout_ms || 10000, // 10s timeout for testing
      allowed_tools: null,
      blocked_tools: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: null,
    };

    console.log('Test config auth:', {
      auth_type: testConfig.auth_type,
      auth_token_encrypted: testConfig.auth_token_encrypted ? '***' : null,
    });

    const manager = createMCPManager(testConfig.timeout_ms);
    
    try {
      const status = await manager.connect(testConfig);
      
      if (status.connected) {
        // Get the tools from the connected server
        const tools = await manager.getServerTools('test-connection');
        const toolNames = tools ? Object.keys(tools) : [];
        
        await manager.disconnectAll();
        
        return NextResponse.json({
          success: true,
          connected: true,
          toolCount: status.toolCount,
          tools: toolNames,
          message: `Successfully connected! Found ${status.toolCount} tools.`,
        });
      } else {
        return NextResponse.json({
          success: false,
          connected: false,
          error: status.error,
          message: `Connection failed: ${status.error}`,
        });
      }
    } finally {
      await manager.disconnectAll().catch(() => {});
    }
  } catch (error) {
    console.error('MCP test error:', error);
    return NextResponse.json({
      success: false,
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}
