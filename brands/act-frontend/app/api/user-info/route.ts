import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// GET /api/user-info?userId=xxx
// Fetches basic user info (name, email) for displaying in collaborative chats
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Create service client to access auth.users
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
      const { data: userData, error } = await serviceSupabase.auth.admin.getUserById(userId);
      
      if (error || !userData?.user) {
        return NextResponse.json({ 
          name: 'Unknown User',
          email: 'unknown',
        });
      }

      const meta = userData.user.user_metadata || {};
      return NextResponse.json({
        name: meta.full_name || meta.name || userData.user.email?.split('@')[0] || 'User',
        email: userData.user.email || '',
        avatar: meta.avatar_url || null,
      });
    } catch (err) {
      console.error('Error fetching user info:', err);
      return NextResponse.json({ 
        name: 'User',
        email: '',
      });
    }
  } catch (error) {
    console.error('User info fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
