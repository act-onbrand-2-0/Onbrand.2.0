import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createMCPManager, type MCPServerConfig, type MCPServerInput } from '@/lib/mcp';

export const dynamic = 'force-dynamic';

// Create Supabase client with service role for admin operations
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

// GET /api/mcp/servers - List MCP servers for a brand
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('mcp_servers')
      .select('id, brand_id, name, description, transport_type, url, auth_type, auth_header, auth_token_encrypted, enabled, priority, timeout_ms, allowed_tools, blocked_tools, created_at, updated_at')
      .eq('brand_id', brandId)
      .order('priority', { ascending: false });

    if (error) {
      console.error('Failed to fetch MCP servers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch MCP servers' },
        { status: 500 }
      );
    }

    // Log what we're returning
    if (data && data.length > 0) {
      console.log('Returning servers with auth:', data.map(s => ({
        name: s.name,
        auth_type: s.auth_type,
        has_token: !!s.auth_token_encrypted,
      })));
    }
    return NextResponse.json({ servers: data || [] });
  } catch (error) {
    console.error('MCP servers GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/mcp/servers - Create a new MCP server
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('POST /api/mcp/servers - Raw body received:', JSON.stringify(body, null, 2));
    const { brandId, userId, ...serverInput } = body as { brandId: string; userId: string } & MCPServerInput;

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      );
    }

    if (!serverInput.name) {
      return NextResponse.json(
        { error: 'Server name is required' },
        { status: 400 }
      );
    }

    if (!serverInput.transport_type) {
      return NextResponse.json(
        { error: 'Transport type is required' },
        { status: 400 }
      );
    }

    // Validate transport requirements
    if ((serverInput.transport_type === 'http' || serverInput.transport_type === 'sse') && !serverInput.url) {
      return NextResponse.json(
        { error: 'URL is required for HTTP/SSE transport' },
        { status: 400 }
      );
    }

    if (serverInput.transport_type === 'stdio' && !serverInput.command) {
      return NextResponse.json(
        { error: 'Command is required for stdio transport' },
        { status: 400 }
      );
    }

    console.log('Creating MCP server with:', {
      name: serverInput.name,
      transport_type: serverInput.transport_type,
      auth_type: serverInput.auth_type,
      has_auth_token: !!serverInput.auth_token,
      auth_token_length: serverInput.auth_token?.length || 0,
    });

    const supabase = getSupabaseClient();

    // Create the server record
    const { data, error } = await supabase
      .from('mcp_servers')
      .insert({
        brand_id: brandId,
        name: serverInput.name,
        description: serverInput.description,
        transport_type: serverInput.transport_type,
        url: serverInput.url,
        command: serverInput.command,
        args: serverInput.args,
        auth_type: serverInput.auth_type || 'none',
        auth_header: serverInput.auth_header,
        // In production, encrypt the token before storing
        auth_token_encrypted: serverInput.auth_token,
        enabled: serverInput.enabled ?? true,
        priority: serverInput.priority ?? 0,
        timeout_ms: serverInput.timeout_ms ?? 30000,
        allowed_tools: serverInput.allowed_tools,
        blocked_tools: serverInput.blocked_tools,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create MCP server:', error);
      return NextResponse.json(
        { error: 'Failed to create MCP server', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ server: data }, { status: 201 });
  } catch (error) {
    console.error('MCP servers POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/mcp/servers - Update an MCP server
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { serverId, ...updates } = body;

    if (!serverId) {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Build update object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.url !== undefined) updateData.url = updates.url;
    if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.timeout_ms !== undefined) updateData.timeout_ms = updates.timeout_ms;
    if (updates.allowed_tools !== undefined) updateData.allowed_tools = updates.allowed_tools;
    if (updates.blocked_tools !== undefined) updateData.blocked_tools = updates.blocked_tools;
    if (updates.auth_type !== undefined) updateData.auth_type = updates.auth_type;
    if (updates.auth_header !== undefined) updateData.auth_header = updates.auth_header;
    if (updates.auth_token !== undefined) updateData.auth_token_encrypted = updates.auth_token;

    const { data, error } = await supabase
      .from('mcp_servers')
      .update(updateData)
      .eq('id', serverId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update MCP server:', error);
      return NextResponse.json(
        { error: 'Failed to update MCP server' },
        { status: 500 }
      );
    }

    return NextResponse.json({ server: data });
  } catch (error) {
    console.error('MCP servers PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/mcp/servers - Delete an MCP server
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const serverId = searchParams.get('serverId');

    if (!serverId) {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('mcp_servers')
      .delete()
      .eq('id', serverId);

    if (error) {
      console.error('Failed to delete MCP server:', error);
      return NextResponse.json(
        { error: 'Failed to delete MCP server' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('MCP servers DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
