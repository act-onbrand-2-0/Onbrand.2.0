import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';

/**
 * Get the base URL for share links
 * Priority: NEXT_PUBLIC_SITE_URL > Netlify URLs > request host > fallback
 */
function getBaseUrl(request: NextRequest): string {
  // Check configured site URL first
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  // Netlify environment variables
  const netlifyUrl = process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || process.env.URL;
  if (netlifyUrl) {
    return netlifyUrl;
  }
  
  // Fall back to request host header
  const host = request.headers.get('host');
  if (host && !host.includes('localhost')) {
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    return `${protocol}://${host}`;
  }
  
  // Final fallback for local dev
  return 'http://localhost:3000';
}

// POST /api/share - Create a new share token
// Body: { resourceType: 'conversation' | 'project', resourceId: string, expiresInDays?: number, password?: string, maxViews?: number }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { resourceType, resourceId, expiresInDays, password, maxViews } = body;

    // Validate input
    if (!resourceType || !resourceId) {
      return NextResponse.json({ error: 'resourceType and resourceId are required' }, { status: 400 });
    }
    if (!['conversation', 'project'].includes(resourceType)) {
      return NextResponse.json({ error: 'resourceType must be conversation or project' }, { status: 400 });
    }

    // Verify user owns the resource and get brand_id
    let brandId: string | null = null;
    
    if (resourceType === 'conversation') {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('brand_id, user_id')
        .eq('id', resourceId)
        .single();
      
      if (error || !conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      if (conversation.user_id !== user.id) {
        return NextResponse.json({ error: 'You do not own this conversation' }, { status: 403 });
      }
      brandId = conversation.brand_id;
    } else if (resourceType === 'project') {
      const { data: project, error } = await supabase
        .from('projects')
        .select('brand_id, user_id')
        .eq('id', resourceId)
        .single();
      
      if (error || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      if (project.user_id !== user.id) {
        return NextResponse.json({ error: 'You do not own this project' }, { status: 403 });
      }
      brandId = project.brand_id;
    }

    if (!brandId) {
      return NextResponse.json({ error: 'Unable to determine brand' }, { status: 500 });
    }

    // Calculate expiry date if provided
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Hash password if provided
    const passwordHash = password 
      ? await bcrypt.hash(password, 10)
      : null;

    // Create share token
    const { data: token, error: insertError } = await supabase
      .from('share_tokens')
      .insert({
        resource_type: resourceType,
        resource_id: resourceId,
        created_by: user.id,
        brand_id: brandId,
        expires_at: expiresAt,
        password_hash: passwordHash,
        max_views: maxViews || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating share token:', insertError);
      return NextResponse.json({ error: 'Failed to create share token' }, { status: 500 });
    }

    const baseUrl = getBaseUrl(request);
    
    return NextResponse.json({
      id: token.id,
      token: token.token,
      shareUrl: `${baseUrl}/s/${token.token}`,
      expiresAt: token.expires_at,
      maxViews: token.max_views,
      requiresPassword: !!passwordHash,
    });
  } catch (error) {
    console.error('Share token creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/share?token=xxx&password=xxx - Validate token and return resource data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const password = searchParams.get('password');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Validate token using the database function
    const { data: validation, error: validationError } = await supabase
      .rpc('validate_share_token', { token_input: token });

    if (validationError) {
      console.error('Token validation error:', validationError);
      return NextResponse.json({ error: 'Failed to validate token' }, { status: 500 });
    }

    if (!validation || validation.length === 0) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    const tokenData = validation[0];
    
    if (!tokenData.is_valid) {
      return NextResponse.json({ error: 'Token is expired or invalid' }, { status: 403 });
    }

    // Check password if required
    if (tokenData.requires_password) {
      if (!password) {
        return NextResponse.json({ 
          error: 'Password required',
          requiresPassword: true 
        }, { status: 401 });
      }

      // Get the password hash
      const { data: tokenRecord } = await supabase
        .from('share_tokens')
        .select('password_hash')
        .eq('token', token)
        .single();

      if (!tokenRecord || !tokenRecord.password_hash) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
      }

      const passwordValid = await bcrypt.compare(password, tokenRecord.password_hash);
      if (!passwordValid) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }
    }

    // Increment view count
    await supabase.rpc('increment_share_token_view', { token_input: token });

    // Fetch the resource data
    let resourceData = null;
    
    if (tokenData.resource_type === 'conversation') {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select(`
          *,
          messages:messages(
            id,
            content,
            role,
            created_at,
            tokens_used,
            model,
            metadata
          )
        `)
        .eq('id', tokenData.resource_id)
        .order('created_at', { foreignTable: 'messages', ascending: true })
        .single();

      if (error || !conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      resourceData = conversation;
    } else if (tokenData.resource_type === 'project') {
      const { data: project, error } = await supabase
        .from('projects')
        .select(`
          *,
          conversations:conversations(
            id,
            title,
            created_at,
            messages:messages(
              id,
              content,
              role,
              created_at,
              tokens_used,
              model,
              metadata
            )
          )
        `)
        .eq('id', tokenData.resource_id)
        .order('created_at', { foreignTable: 'conversations', ascending: false })
        .order('created_at', { foreignTable: 'conversations.messages', ascending: true })
        .single();

      if (error || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      resourceData = project;
    }

    return NextResponse.json({
      resourceType: tokenData.resource_type,
      resourceData,
      brandId: tokenData.brand_id,
    });
  } catch (error) {
    console.error('Share token validation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/share?tokenId=xxx - Revoke a share token
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const tokenId = searchParams.get('tokenId');

    if (!tokenId) {
      return NextResponse.json({ error: 'tokenId is required' }, { status: 400 });
    }

    // Delete the token (RLS ensures user owns it)
    const { error: deleteError } = await supabase
      .from('share_tokens')
      .delete()
      .eq('id', tokenId)
      .eq('created_by', user.id);

    if (deleteError) {
      console.error('Error deleting share token:', deleteError);
      return NextResponse.json({ error: 'Failed to delete share token' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Share token deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

