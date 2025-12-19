import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Initiate OAuth flow for MCP server authentication (e.g., Smithery)
 * 
 * This redirects the user to the OAuth provider to authorize access
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serverId, brandId, provider, serverUrl } = body;

    if (!serverId || !brandId || !provider) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Create state parameter with server info
    const state = Buffer.from(JSON.stringify({
      serverId,
      brandId,
      provider,
    })).toString('base64');

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/mcp/oauth/callback`;

    let authUrl: string;

    switch (provider) {
      case 'smithery':
        // Smithery OAuth URL
        // Note: You need to register your app with Smithery to get client credentials
        const smitheryClientId = process.env.SMITHERY_CLIENT_ID;
        
        if (!smitheryClientId) {
          return NextResponse.json(
            { error: 'Smithery OAuth not configured. Please set SMITHERY_CLIENT_ID.' },
            { status: 500 }
          );
        }

        // Extract the server path from URL if provided
        const serverPath = serverUrl
          ? new URL(serverUrl).pathname
          : '/@browserbasehq/mcp-browserbase';

        authUrl = `https://smithery.ai/oauth/authorize?` +
          `client_id=${encodeURIComponent(smitheryClientId)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=code` +
          `&state=${encodeURIComponent(state)}` +
          `&scope=mcp:read mcp:write` +
          `&server=${encodeURIComponent(serverPath)}`;
        break;

      default:
        return NextResponse.json(
          { error: `Unknown OAuth provider: ${provider}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('OAuth initiate error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
