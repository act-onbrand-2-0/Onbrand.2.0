import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, userIds } = await request.json();

    if (!content || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: content and userIds' },
        { status: 400 }
      );
    }

    // Get sender's profile
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    // Get recipient profiles
    const { data: recipients } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    if (!recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: 'No valid recipients found' },
        { status: 404 }
      );
    }

    // Create notifications for each recipient
    const notifications = recipients.map((recipient) => ({
      user_id: recipient.id,
      type: 'message_shared',
      title: 'Message shared with you',
      message: `${senderProfile?.full_name || user.email} shared a message with you`,
      metadata: {
        content: content.substring(0, 500), // Limit content length
        sender_id: user.id,
        sender_name: senderProfile?.full_name || user.email,
      },
    }));

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notificationError) {
      console.error('Error creating notifications:', notificationError);
      return NextResponse.json(
        { error: 'Failed to create notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Message shared with ${recipients.length} team member${recipients.length !== 1 ? 's' : ''}`,
    });
  } catch (error) {
    console.error('Error sharing message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
