import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// Helper to get user details
async function getUserDetails(serviceSupabase: any, userId: string) {
  try {
    const { data: userData, error } = await serviceSupabase.auth.admin.getUserById(userId);
    if (error || !userData.user) {
      return { id: userId, email: 'Unknown', name: 'Unknown User' };
    }
    const meta = userData.user.user_metadata || {};
    return {
      id: userId,
      email: userData.user.email || 'Unknown',
      name: meta.full_name || meta.name || userData.user.email?.split('@')[0] || 'Unknown User',
    };
  } catch {
    return { id: userId, email: 'Unknown', name: 'Unknown User' };
  }
}

// GET /api/conversation-invite-links?conversationId=xxx - Get invite links for a conversation
// GET /api/conversation-invite-links?token=xxx - Get invite link details by token (for joining)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('conversationId');
    const token = searchParams.get('token');

    // If token is provided, get invite details (for joining)
    if (token) {
      const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: invite, error } = await serviceSupabase
        .from('conversation_invite_links')
        .select('*, conversation:conversations(id, title, brand_id)')
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (error || !invite) {
        return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 404 });
      }

      // Check if expired
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        return NextResponse.json({ error: 'This invite link has expired' }, { status: 410 });
      }

      // Check if max uses reached
      if (invite.max_uses && invite.use_count >= invite.max_uses) {
        return NextResponse.json({ error: 'This invite link has reached its maximum uses' }, { status: 410 });
      }

      // Get creator details
      const creator = await getUserDetails(serviceSupabase, invite.created_by);

      return NextResponse.json({
        invite: {
          id: invite.id,
          conversationId: invite.conversation_id,
          conversationTitle: invite.conversation?.title || 'Untitled Chat',
          permission: invite.permission,
          createdBy: creator,
          expiresAt: invite.expires_at,
          maxUses: invite.max_uses,
          useCount: invite.use_count,
        },
      });
    }

    // Otherwise, require auth and get invite links for a conversation
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId or token is required' }, { status: 400 });
    }

    // Verify user owns the conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation || conversation.user_id !== user.id) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }

    // Get invite links
    const { data: links, error: linksError } = await supabase
      .from('conversation_invite_links')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false });

    if (linksError) {
      console.error('Error fetching invite links:', linksError);
      return NextResponse.json({ error: 'Failed to fetch invite links' }, { status: 500 });
    }

    return NextResponse.json({
      links: (links || []).map((link: any) => ({
        id: link.id,
        token: link.token,
        permission: link.permission,
        maxUses: link.max_uses,
        useCount: link.use_count,
        expiresAt: link.expires_at,
        isActive: link.is_active,
        createdAt: link.created_at,
        url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/chat/join/${link.token}`,
      })),
    });
  } catch (error) {
    console.error('Invite links fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/conversation-invite-links - Create a new invite link
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, permission = 'write', maxUses, expiresInHours } = body;

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    // Verify user owns the conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, user_id, title')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation || conversation.user_id !== user.id) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }

    // Calculate expiry
    let expiresAt = null;
    if (expiresInHours && expiresInHours > 0) {
      expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
    }

    // Create invite link
    const { data: link, error: insertError } = await supabase
      .from('conversation_invite_links')
      .insert({
        conversation_id: conversationId,
        created_by: user.id,
        permission,
        max_uses: maxUses || null,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating invite link:', insertError);
      return NextResponse.json({ error: 'Failed to create invite link' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    
    return NextResponse.json({
      success: true,
      link: {
        id: link.id,
        token: link.token,
        permission: link.permission,
        maxUses: link.max_uses,
        expiresAt: link.expires_at,
        url: `${baseUrl}/chat/join/${link.token}`,
      },
    });
  } catch (error) {
    console.error('Invite link creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/conversation-invite-links - Join via invite link or deactivate a link
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { token, action, linkId } = body;

    // Deactivate a link (owner action)
    if (action === 'deactivate' && linkId) {
      const { error: updateError } = await supabase
        .from('conversation_invite_links')
        .update({ is_active: false })
        .eq('id', linkId);

      if (updateError) {
        console.error('Error deactivating link:', updateError);
        return NextResponse.json({ error: 'Failed to deactivate link' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // Join via invite token
    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get invite link
    const { data: invite, error: inviteError } = await serviceSupabase
      .from('conversation_invite_links')
      .select('*, conversation:conversations(id, title, brand_id, user_id)')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 404 });
    }

    // Check if expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invite link has expired' }, { status: 410 });
    }

    // Check if max uses reached
    if (invite.max_uses && invite.use_count >= invite.max_uses) {
      return NextResponse.json({ error: 'This invite link has reached its maximum uses' }, { status: 410 });
    }

    // Check if user is the owner (can't join own conversation)
    if (invite.conversation?.user_id === user.id) {
      return NextResponse.json({ 
        success: true, 
        conversationId: invite.conversation_id,
        message: 'You own this conversation',
      });
    }

    // Check if user already has access
    const { data: existingShare } = await serviceSupabase
      .from('conversation_shares')
      .select('id, status')
      .eq('conversation_id', invite.conversation_id)
      .eq('shared_with', user.id)
      .single();

    if (existingShare) {
      if (existingShare.status === 'accepted') {
        return NextResponse.json({ 
          success: true, 
          conversationId: invite.conversation_id,
          message: 'Already have access',
        });
      }
      // Update existing pending share to accepted
      await serviceSupabase
        .from('conversation_shares')
        .update({ 
          status: 'accepted', 
          accepted_at: new Date().toISOString(),
          permission: invite.permission,
        })
        .eq('id', existingShare.id);
    } else {
      // Create new share
      await serviceSupabase
        .from('conversation_shares')
        .insert({
          conversation_id: invite.conversation_id,
          shared_by: invite.created_by,
          shared_with: user.id,
          brand_id: invite.conversation?.brand_id,
          permission: invite.permission,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        });
    }

    // Increment use count
    await serviceSupabase
      .from('conversation_invite_links')
      .update({ use_count: invite.use_count + 1 })
      .eq('id', invite.id);

    // Add "joined the chat" system message
    try {
      const userDetails = await getUserDetails(serviceSupabase, user.id);
      const userName = userDetails.name || user.email?.split('@')[0] || 'Someone';
      
      await serviceSupabase
        .from('messages')
        .insert({
          conversation_id: invite.conversation_id,
          role: 'system',
          content: `${userName} joined via invite link`,
          tokens_used: 0,
          model: 'system',
          metadata: { 
            type: 'user_joined',
            user_id: user.id,
            user_name: userName,
            user_email: user.email,
            via: 'invite_link',
          },
        });
    } catch (err) {
      console.error('Error inserting join message:', err);
    }

    return NextResponse.json({ 
      success: true, 
      conversationId: invite.conversation_id,
      conversationTitle: invite.conversation?.title,
    });
  } catch (error) {
    console.error('Invite link join error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/conversation-invite-links?linkId=xxx - Delete an invite link
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const linkId = searchParams.get('linkId');

    if (!linkId) {
      return NextResponse.json({ error: 'linkId is required' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('conversation_invite_links')
      .delete()
      .eq('id', linkId);

    if (deleteError) {
      console.error('Error deleting invite link:', deleteError);
      return NextResponse.json({ error: 'Failed to delete invite link' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Invite link deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
