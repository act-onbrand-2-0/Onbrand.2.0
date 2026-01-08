import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createMCPManager } from '@/lib/mcp';
import type { MCPServerConfig } from '@/lib/mcp/types';

export const dynamic = 'force-dynamic';

// Create Supabase client
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

// GET /api/mcp/tools - Get tools for specific MCP servers
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get('brandId');
    const serverIds = searchParams.get('serverIds')?.split(',').filter(Boolean);

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      );
    }

    if (!serverIds || serverIds.length === 0) {
      return NextResponse.json(
        { error: 'Server IDs are required' },
        { status: 400 }
      );
    }

    // Fetch the MCP server configurations
    const supabase = getSupabaseClient();
    const { data: servers, error } = await supabase
      .from('mcp_servers')
      .select('*')
      .eq('brand_id', brandId)
      .eq('enabled', true)
      .in('id', serverIds);

    if (error) {
      console.error('Failed to fetch MCP servers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch MCP servers' },
        { status: 500 }
      );
    }

    if (!servers || servers.length === 0) {
      return NextResponse.json({ tools: [] });
    }

    // Connect to servers and get their tools
    const manager = await createMCPManager(10000); // 10s timeout
    const allTools: Array<{
      serverId: string;
      serverName: string;
      toolName: string;
      description?: string;
    }> = [];

    try {
      for (const server of servers as MCPServerConfig[]) {
        const status = await manager.connect(server);
        
        if (status.connected) {
          const tools = await manager.getServerTools(server.id);
          
          if (tools) {
            // Extract tool information - tools from @ai-sdk/mcp have description in the tool definition
            for (const [toolName, toolDef] of Object.entries(tools)) {
              // The tool definition structure from AI SDK MCP
              const tool = toolDef as { 
                description?: string;
                parameters?: { description?: string };
              };
              
              // Try to get description from various possible locations
              const description = tool?.description || 
                (typeof tool === 'object' && 'description' in tool ? String(tool.description) : undefined);
              
              console.log(`Tool: ${toolName}, Description: ${description || 'none'}`);
              
              allTools.push({
                serverId: server.id,
                serverName: server.name,
                toolName,
                description,
              });
            }
          }
        }
      }
    } finally {
      await manager.disconnectAll().catch(() => {});
    }

    return NextResponse.json({ tools: allTools });
  } catch (error) {
    console.error('MCP tools error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
