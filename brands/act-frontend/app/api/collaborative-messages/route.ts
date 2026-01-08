import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// GET /api/collaborative-messages?conversationId=xxx
// Fetches messages with user details for collaborative chats
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    // Create service client to bypass RLS and fetch user details
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // First verify user has access to this conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .single();

    // Check direct ownership
    const isOwner = conversation?.user_id === user.id;

    // Check if user has an accepted share for this conversation
    const { data: share } = await serviceSupabase
      .from('conversation_shares')
      .select('id, permission')
      .eq('conversation_id', conversationId)
      .eq('shared_with', user.id)
      .eq('status', 'accepted')
      .single();

    const hasAccess = isOwner || !!share;
    
    // Check if this conversation has ANY write shares (for collaborative mode)
    // This makes it collaborative for both owner and shared users
    const { data: writeShares } = await serviceSupabase
      .from('conversation_shares')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('permission', 'write')
      .eq('status', 'accepted')
      .limit(1);
    
    const isCollaborative = (writeShares && writeShares.length > 0) || share?.permission === 'write';

    if (!hasAccess) {
      return NextResponse.json({ error: 'No access to this conversation' }, { status: 403 });
    }

    // Fetch messages with user_id
    const { data: messages, error: msgError } = await serviceSupabase
      .from('messages')
      .select('id, conversation_id, role, content, tokens_used, model, metadata, created_at, user_id')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('Error fetching messages:', msgError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Get unique user IDs from messages
    const userIds = [...new Set((messages || [])
      .filter(m => m.user_id)
      .map(m => m.user_id)
    )];

    // Fetch user details for all unique users
    const userDetailsMap: Record<string, { name: string; email: string }> = {};
    
    if (userIds.length > 0) {
      for (const uid of userIds) {
        try {
          const { data: userData } = await serviceSupabase.auth.admin.getUserById(uid);
          if (userData?.user) {
            const meta = userData.user.user_metadata || {};
            userDetailsMap[uid] = {
              name: meta.full_name || meta.name || userData.user.email?.split('@')[0] || 'Unknown User',
              email: userData.user.email || 'Unknown',
            };
          }
        } catch (err) {
          console.error('Error fetching user details:', err);
          userDetailsMap[uid] = { name: 'Unknown User', email: 'Unknown' };
        }
      }
    }

    // Enrich messages with sender info
    const enrichedMessages = (messages || []).map(msg => ({
      ...msg,
      sender_name: msg.role === 'user' && msg.user_id 
        ? userDetailsMap[msg.user_id]?.name || 'User'
        : msg.role === 'assistant' 
          ? 'Assistant' 
          : msg.role,
      sender_email: msg.role === 'user' && msg.user_id 
        ? userDetailsMap[msg.user_id]?.email || null
        : null,
      is_current_user: msg.user_id === user.id,
    }));

    return NextResponse.json({ 
      messages: enrichedMessages,
      isCollaborative,
      isOwner,
    });
  } catch (error) {
    console.error('Collaborative messages fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
