import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// GET /api/shared-conversation?conversationId=xxx
// Fetches a shared conversation using service client (bypasses RLS)
// Only returns if user has an accepted share for this conversation
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

    // Create service client to bypass RLS
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // First verify user has an accepted share for this conversation
    const { data: share, error: shareError } = await serviceSupabase
      .from('conversation_shares')
      .select('id, status')
      .eq('conversation_id', conversationId)
      .eq('shared_with', user.id)
      .eq('status', 'accepted')
      .single();

    if (shareError || !share) {
      return NextResponse.json({ error: 'No accepted share found for this conversation' }, { status: 403 });
    }

    // Fetch the conversation using service client
    const { data: conversation, error: convError } = await serviceSupabase
      .from('conversations')
      .select('*, user_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Shared conversation fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
