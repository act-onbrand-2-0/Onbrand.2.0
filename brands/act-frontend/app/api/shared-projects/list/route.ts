import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// GET /api/shared-projects/list
// Fetches all projects shared with the current user (accepted shares)
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

    // Get all accepted project shares for the current user
    const { data: shares, error: sharesError } = await serviceSupabase
      .from('project_shares')
      .select('project_id')
      .eq('shared_with', user.id)
      .eq('status', 'accepted');

    if (sharesError) {
      console.error('Error fetching project shares:', sharesError);
      return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 });
    }

    if (!shares || shares.length === 0) {
      return NextResponse.json({ projects: [] });
    }

    // Get the project details
    const projectIds = shares.map(s => s.project_id);
    const { data: projects, error: projError } = await serviceSupabase
      .from('projects')
      .select('*')
      .in('id', projectIds);

    if (projError) {
      console.error('Error fetching projects:', projError);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    // Also fetch conversations in these shared projects
    const { data: conversations, error: convError } = await serviceSupabase
      .from('conversations')
      .select('*, user_id')
      .in('project_id', projectIds)
      .eq('archived', false)
      .order('last_message_at', { ascending: false });

    if (convError) {
      console.error('Error fetching conversations:', convError);
    }

    return NextResponse.json({ 
      projects: projects || [],
      conversations: conversations || []
    });
  } catch (error) {
    console.error('Shared projects list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
