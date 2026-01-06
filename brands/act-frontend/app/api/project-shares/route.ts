import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// GET /api/project-shares - Get shares for a project or shares received by user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const myShares = searchParams.get('myShares') === 'true';

    // Create service client to bypass RLS for lookups
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (myShares) {
      // Get all shares where current user is the recipient
      const { data: shares, error } = await serviceSupabase
        .from('project_shares')
        .select('*, projects(*)')
        .eq('shared_with', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching my project shares:', error);
        return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 });
      }

      return NextResponse.json({ shares: shares || [] });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId or myShares=true is required' }, { status: 400 });
    }

    // Get shares for a specific project
    const { data: shares, error } = await supabase
      .from('project_shares')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching project shares:', error);
      return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 });
    }

    return NextResponse.json({ shares: shares || [] });
  } catch (error) {
    console.error('Project shares fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/project-shares - Share a project with users
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { projectId, userIds, email, message } = body;

    let targetUserIds: string[] = userIds || [];

    // If email is provided, look up the user
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
        return NextResponse.json({ error: 'Cannot share with yourself' }, { status: 400 });
      }

      targetUserIds = [foundUser.id];
    }

    if (!projectId || targetUserIds.length === 0) {
      return NextResponse.json({ error: 'projectId and either userIds or email are required' }, { status: 400 });
    }

    // Verify user owns the project
    const { data: project, error: projError } = await supabase
      .from('projects')
      .select('id, user_id, brand_id, name')
      .eq('id', projectId)
      .single();

    if (projError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.user_id !== user.id) {
      return NextResponse.json({ error: 'You do not own this project' }, { status: 403 });
    }

    // Check for existing shares
    const { data: existingShares } = await serviceSupabase
      .from('project_shares')
      .select('shared_with')
      .eq('project_id', projectId)
      .in('shared_with', targetUserIds);

    const existingUserIds = new Set(existingShares?.map(s => s.shared_with) || []);
    const newUserIds = targetUserIds.filter(id => !existingUserIds.has(id));

    if (newUserIds.length === 0) {
      return NextResponse.json({ 
        success: true, 
        sharesCreated: 0,
        message: 'Project already shared with all specified users'
      });
    }

    // Create share records using service client to bypass RLS
    const shares = newUserIds.map((userId: string) => ({
      project_id: projectId,
      shared_by: user.id,
      shared_with: userId,
      brand_id: project.brand_id,
      message: message || null,
      status: 'pending',
    }));

    const { data: createdShares, error: insertError } = await serviceSupabase
      .from('project_shares')
      .insert(shares)
      .select();

    if (insertError) {
      console.error('Error creating project shares:', insertError);
      console.error('Insert error details:', JSON.stringify(insertError));
      return NextResponse.json({ error: 'Failed to share project', details: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      sharesCreated: createdShares?.length || 0,
      projectName: project.name
    });
  } catch (error) {
    console.error('Project share creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/project-shares - Accept or decline a share
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

    const { data: share, error: updateError } = await supabase
      .from('project_shares')
      .update({ 
        status: action === 'accept' ? 'accepted' : 'declined',
        updated_at: new Date().toISOString()
      })
      .eq('id', shareId)
      .eq('shared_with', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating project share:', updateError);
      return NextResponse.json({ error: 'Failed to update share' }, { status: 500 });
    }

    return NextResponse.json({ success: true, share });
  } catch (error) {
    console.error('Project share update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/project-shares - Remove a share
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
      .from('project_shares')
      .delete()
      .eq('id', shareId);

    if (deleteError) {
      console.error('Error deleting project share:', deleteError);
      return NextResponse.json({ error: 'Failed to delete share' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Project share deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
