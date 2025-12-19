import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * OAuth callback handler for Smithery MCP authentication
 * 
 * Flow:
 * 1. User clicks "Connect to Smithery" in the UI
 * 2. User is redirected to Smithery to log in and configure the MCP server
 * 3. Smithery redirects back here with an authorization code
 * 4. We exchange the code for tokens and store them
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Contains serverId and brandId
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle errors from OAuth provider
    if (error) {
      console.error('OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/settings?error=${encodeURIComponent(errorDescription || error)}`, req.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings?error=Missing+authorization+code', req.url)
      );
    }

    // Parse state to get server info
    let stateData: { serverId?: string; brandId?: string; provider?: string };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return NextResponse.redirect(
        new URL('/settings?error=Invalid+state+parameter', req.url)
      );
    }

    const { serverId, brandId, provider } = stateData;

    if (!serverId || !brandId) {
      return NextResponse.redirect(
        new URL('/settings?error=Missing+server+information', req.url)
      );
    }

    // Exchange code for tokens based on provider
    let tokens: { access_token: string; refresh_token?: string; expires_in?: number } | null = null;

    if (provider === 'smithery') {
      // Exchange with Smithery
      const tokenResponse = await fetch('https://smithery.ai/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/mcp/oauth/callback`,
          client_id: process.env.SMITHERY_CLIENT_ID,
          client_secret: process.env.SMITHERY_CLIENT_SECRET,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('Token exchange failed:', errorData);
        return NextResponse.redirect(
          new URL('/settings?error=Token+exchange+failed', req.url)
        );
      }

      tokens = await tokenResponse.json();
    }

    if (!tokens) {
      return NextResponse.redirect(
        new URL('/settings?error=Unknown+OAuth+provider', req.url)
      );
    }

    // Store tokens in database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    const { error: updateError } = await supabase
      .from('mcp_servers')
      .update({
        oauth_access_token: tokens.access_token,
        oauth_refresh_token: tokens.refresh_token || null,
        oauth_expires_at: expiresAt,
        auth_type: 'smithery',
      })
      .eq('id', serverId)
      .eq('brand_id', brandId);

    if (updateError) {
      console.error('Failed to store tokens:', updateError);
      return NextResponse.redirect(
        new URL('/settings?error=Failed+to+store+credentials', req.url)
      );
    }

    // Success! Redirect back to settings
    return NextResponse.redirect(
      new URL('/settings?success=MCP+server+connected', req.url)
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/settings?error=OAuth+callback+failed', req.url)
    );
  }
}
