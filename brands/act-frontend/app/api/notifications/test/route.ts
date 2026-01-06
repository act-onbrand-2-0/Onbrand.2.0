import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/notifications/test - Create a test notification for debugging
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create a test notification
    const { data: notification, error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'system',
        title: 'Test Notification',
        message: 'This is a test notification to verify the system is working.',
        metadata: { test: true, timestamp: new Date().toISOString() },
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating test notification:', insertError);
      return NextResponse.json({ 
        error: 'Failed to create notification', 
        details: insertError.message,
        code: insertError.code 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Test notification created!',
      notification 
    });
  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/notifications/test?list=true - List all notifications for current user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch notifications
    const { data: notifications, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (fetchError) {
      console.error('Error fetching notifications:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to fetch notifications', 
        details: fetchError.message,
        code: fetchError.code 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      count: notifications?.length || 0,
      notifications 
    });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
