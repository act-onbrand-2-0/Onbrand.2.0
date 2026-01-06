import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// GET /api/shared-conversation/list
// Fetches all conversations shared with the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create service client to bypass RLS
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all accepted shares for the current user
    const { data: shares, error: sharesError } = await serviceSupabase
      .from('conversation_shares')
      .select('conversation_id')
      .eq('shared_with', user.id)
      .eq('status', 'accepted');

    if (sharesError) {
      console.error('Error fetching shares:', sharesError);
      return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 });
    }

    if (!shares || shares.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // Get the conversation details for all shared conversations
    const conversationIds = shares.map(s => s.conversation_id);
    const { data: conversations, error: convError } = await serviceSupabase
      .from('conversations')
      .select('*, user_id')
      .in('id', conversationIds)
      .eq('archived', false)
      .order('last_message_at', { ascending: false });

    if (convError) {
      console.error('Error fetching conversations:', convError);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    return NextResponse.json({ conversations: conversations || [] });
  } catch (error) {
    console.error('Shared conversations list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
