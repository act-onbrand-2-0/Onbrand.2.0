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

// GET /api/conversation-shares?conversationId=xxx - Get shares for a conversation
// GET /api/conversation-shares?pending=true - Get pending invitations for current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create service client for user lookups
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('conversationId');
    const pending = searchParams.get('pending');

    if (pending === 'true') {
      // Get pending invitations for current user
      const { data: invitations, error } = await supabase
        .from('conversation_shares')
        .select('*, conversation:conversations(id, title)')
        .eq('shared_with', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching invitations:', error);
        return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
      }

      // Get user details for sharers
      const formattedInvitations = await Promise.all(
        (invitations || []).map(async (inv: any) => {
          const sharer = await getUserDetails(serviceSupabase, inv.shared_by);
          return {
            id: inv.id,
            conversationId: inv.conversation_id,
            conversationTitle: inv.conversation?.title || 'Untitled',
            sharedBy: sharer,
            message: inv.message,
            createdAt: inv.created_at,
          };
        })
      );

      return NextResponse.json({ invitations: formattedInvitations });
    }

    if (conversationId) {
      const myShares = searchParams.get('myShares');
      
      if (myShares === 'true') {
        // Get shares where current user is the recipient (for auto-accepting)
        const { data: shares, error } = await supabase
          .from('conversation_shares')
          .select('*')
          .eq('conversation_id', conversationId)
          .eq('shared_with', user.id);

        if (error) {
          console.error('Error fetching my shares:', error);
          return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 });
        }

        return NextResponse.json({ 
          shares: (shares || []).map((share: any) => ({
            id: share.id,
            status: share.status,
            conversationId: share.conversation_id,
          }))
        });
      }
      
      // Get shares for a specific conversation (only if user owns it)
      const { data: shares, error } = await supabase
        .from('conversation_shares')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('shared_by', user.id);

      if (error) {
        console.error('Error fetching shares:', error);
        return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 });
      }

      // Get user details for recipients
      const formattedShares = await Promise.all(
        (shares || []).map(async (share: any) => {
          const recipient = await getUserDetails(serviceSupabase, share.shared_with);
          return {
            id: share.id,
            userId: share.shared_with,
            name: recipient.name,
            email: recipient.email,
            status: share.status,
            createdAt: share.created_at,
            acceptedAt: share.accepted_at,
          };
        })
      );

      return NextResponse.json({ shares: formattedShares });
    }

    return NextResponse.json({ error: 'Missing conversationId or pending parameter' }, { status: 400 });
  } catch (error) {
    console.error('Conversation shares fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/conversation-shares - Share conversation with selected users or by email
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create service client for user lookups by email
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { conversationId, userIds, email, message } = body;

    // Support both userIds array and single email
    let targetUserIds: string[] = userIds || [];

    // If email is provided, look up the user by email
    if (email && typeof email === 'string') {
      const { data: usersData, error: listError } = await serviceSupabase.auth.admin.listUsers();
      
      if (listError) {
        console.error('Error looking up user by email:', listError);
        return NextResponse.json({ error: 'Failed to look up user' }, { status: 500 });
      }

      const foundUser = usersData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (!foundUser) {
        return NextResponse.json({ 
          error: 'User not found', 
          details: 'No user with that email address exists in the system' 
        }, { status: 404 });
      }

      if (foundUser.id === user.id) {
        return NextResponse.json({ 
          error: 'Cannot share with yourself' 
        }, { status: 400 });
      }

      targetUserIds = [foundUser.id];
    }

    if (!conversationId || targetUserIds.length === 0) {
      return NextResponse.json({ error: 'conversationId and either userIds array or email are required' }, { status: 400 });
    }

    // Verify user owns the conversation and get brand_id
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, user_id, brand_id, title')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conversation.user_id !== user.id) {
      return NextResponse.json({ error: 'You do not own this conversation' }, { status: 403 });
    }

    // Create share records for each user
    const shares = targetUserIds.map((userId: string) => ({
      conversation_id: conversationId,
      shared_by: user.id,
      shared_with: userId,
      brand_id: conversation.brand_id,
      message: message || null,
      status: 'pending',
    }));

    const { data: createdShares, error: insertError } = await supabase
      .from('conversation_shares')
      .upsert(shares, { onConflict: 'conversation_id,shared_with' })
      .select();

    if (insertError) {
      console.error('Error creating shares:', insertError);
      return NextResponse.json({ error: 'Failed to share conversation' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      sharesCreated: createdShares?.length || 0,
      conversationTitle: conversation.title
    });
  } catch (error) {
    console.error('Conversation share creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/conversation-shares - Accept or decline an invitation
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { shareId, action } = body;

    if (!shareId || !action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'shareId and action (accept/decline) are required' }, { status: 400 });
    }

    const updateData: any = {
      status: action === 'accept' ? 'accepted' : 'declined',
    };

    if (action === 'accept') {
      updateData.accepted_at = new Date().toISOString();
    } else {
      updateData.declined_at = new Date().toISOString();
    }

    const { data: updatedShare, error: updateError } = await supabase
      .from('conversation_shares')
      .update(updateData)
      .eq('id', shareId)
      .eq('shared_with', user.id) // Ensure user can only update their own invitations
      .select()
      .single();

    if (updateError) {
      console.error('Error updating share:', updateError);
      return NextResponse.json({ error: 'Failed to update invitation' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      status: updatedShare.status,
      conversationId: updatedShare.conversation_id
    });
  } catch (error) {
    console.error('Conversation share update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/conversation-shares?shareId=xxx - Remove a share
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const shareId = searchParams.get('shareId');

    if (!shareId) {
      return NextResponse.json({ error: 'shareId is required' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('conversation_shares')
      .delete()
      .eq('id', shareId)
      .eq('shared_by', user.id); // Ensure user can only delete their own shares

    if (deleteError) {
      console.error('Error deleting share:', deleteError);
      return NextResponse.json({ error: 'Failed to remove share' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Conversation share deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

