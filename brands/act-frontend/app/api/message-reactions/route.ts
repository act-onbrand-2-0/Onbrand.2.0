import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/message-reactions?messageId=xxx
// Fetches reactions for a message
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
    }

    const { data: reactions, error } = await supabase
      .from('message_reactions')
      .select('id, emoji, user_id, created_at')
      .eq('message_id', messageId);

    if (error) {
      console.error('Error fetching reactions:', error);
      return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 });
    }

    // Group reactions by emoji with count and user info
    const reactionGroups: Record<string, { count: number; userIds: string[]; userReacted: boolean }> = {};
    
    for (const reaction of reactions || []) {
      if (!reactionGroups[reaction.emoji]) {
        reactionGroups[reaction.emoji] = { count: 0, userIds: [], userReacted: false };
      }
      reactionGroups[reaction.emoji].count++;
      reactionGroups[reaction.emoji].userIds.push(reaction.user_id);
      if (reaction.user_id === user.id) {
        reactionGroups[reaction.emoji].userReacted = true;
      }
    }

    return NextResponse.json({ reactions: reactionGroups });
  } catch (error) {
    console.error('Message reactions fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/message-reactions
// Add a reaction to a message
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messageId, emoji } = body;

    if (!messageId || !emoji) {
      return NextResponse.json({ error: 'messageId and emoji are required' }, { status: 400 });
    }

    // Validate emoji (simple check - allow common emojis)
    if (emoji.length > 10) {
      return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      })
      .select()
      .single();

    if (error) {
      // If duplicate, that's okay - user already reacted
      if (error.code === '23505') {
        return NextResponse.json({ message: 'Already reacted' }, { status: 200 });
      }
      console.error('Error adding reaction:', error);
      return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 });
    }

    return NextResponse.json({ reaction: data });
  } catch (error) {
    console.error('Message reaction add error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/message-reactions
// Remove a reaction from a message
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messageId, emoji } = body;

    if (!messageId || !emoji) {
      return NextResponse.json({ error: 'messageId and emoji are required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji);

    if (error) {
      console.error('Error removing reaction:', error);
      return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Message reaction remove error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
