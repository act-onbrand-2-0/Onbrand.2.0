import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const createResendClient = () => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('Missing RESEND_API_KEY - email notifications disabled');
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
};

const roleDisplayNames: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  reviewer: 'Reviewer',
  user: 'Member',
};

// PATCH /api/brand-members/role - Update a team member's role
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { memberId, newRole } = body;

    if (!memberId || !newRole) {
      return NextResponse.json({ error: 'Member ID and new role are required' }, { status: 400 });
    }

    const validRoles = ['owner', 'admin', 'editor', 'reviewer', 'user'];
    if (!validRoles.includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Get current user's brand and role
    const { data: currentBrandUser, error: brandError } = await serviceSupabase
      .from('brand_users')
      .select('brand_id, role')
      .eq('user_id', user.id)
      .single();

    if (brandError || !currentBrandUser) {
      return NextResponse.json({ error: 'You are not part of any team' }, { status: 400 });
    }

    // Only owners can change roles
    if (currentBrandUser.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can change member roles' }, { status: 403 });
    }

    // Get the target member's current data
    const { data: targetMember, error: targetError } = await serviceSupabase
      .from('brand_users')
      .select('brand_id, role')
      .eq('user_id', memberId)
      .single();

    if (targetError || !targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Ensure target member is in the same brand
    if (targetMember.brand_id !== currentBrandUser.brand_id) {
      return NextResponse.json({ error: 'Member not in your team' }, { status: 403 });
    }

    // Prevent demoting yourself if you're the only owner
    if (memberId === user.id && targetMember.role === 'owner' && newRole !== 'owner') {
      const { data: owners } = await serviceSupabase
        .from('brand_users')
        .select('user_id')
        .eq('brand_id', currentBrandUser.brand_id)
        .eq('role', 'owner');

      if (owners && owners.length <= 1) {
        return NextResponse.json({ error: 'Cannot demote the only owner' }, { status: 400 });
      }
    }

    // Update the role
    const { error: updateError } = await serviceSupabase
      .from('brand_users')
      .update({ role: newRole })
      .eq('user_id', memberId)
      .eq('brand_id', currentBrandUser.brand_id);

    if (updateError) {
      console.error('Error updating role:', updateError);
      return NextResponse.json({ error: `Failed to update role: ${updateError.message}` }, { status: 500 });
    }

    // Get target user details for notification
    const { data: targetUserData } = await serviceSupabase.auth.admin.getUserById(memberId);
    const targetEmail = targetUserData?.user?.email;
    const targetName = targetUserData?.user?.user_metadata?.full_name || 
                       targetUserData?.user?.user_metadata?.name || 
                       targetEmail?.split('@')[0] || 'User';

    // Get current user name for the notification
    const changerName = user.user_metadata?.full_name || 
                        user.user_metadata?.name || 
                        user.email?.split('@')[0] || 'Someone';

    const oldRoleDisplay = roleDisplayNames[targetMember.role] || targetMember.role;
    const newRoleDisplay = roleDisplayNames[newRole] || newRole;

    // Create in-app notification
    await serviceSupabase
      .from('notifications')
      .insert({
        user_id: memberId,
        brand_id: currentBrandUser.brand_id,
        type: 'role_change',
        title: 'Your role has been updated',
        message: `${changerName} changed your role from ${oldRoleDisplay} to ${newRoleDisplay}.`,
        metadata: {
          old_role: targetMember.role,
          new_role: newRole,
          changed_by: user.id,
          changed_by_name: changerName,
        },
      });

    // Send email notification
    if (targetEmail) {
      const resend = createResendClient();
      if (resend) {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://chatbot.onbrandai.app';
        
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Onbrand AI <notifications@onbrandai.app>',
          to: targetEmail,
          subject: `Your role has been updated to ${newRoleDisplay}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1a1a1a; margin-bottom: 16px;">Your role has been updated</h2>
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                Hi ${targetName},
              </p>
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                <strong>${changerName}</strong> has changed your role from <strong>${oldRoleDisplay}</strong> to <strong>${newRoleDisplay}</strong>.
              </p>
              <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #666; font-size: 14px;">
                  ${newRole === 'owner' ? '🎉 As an Owner, you now have full control over your team and all settings.' :
                    newRole === 'admin' ? '⚡ As an Admin, you can now manage team members and configure settings.' :
                    '👤 As a Member, you can collaborate with your team on conversations.'}
                </p>
              </div>
              <a href="${baseUrl}/dashboard" style="display: inline-block; background: #0066ff; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 16px;">
                Go to Dashboard
              </a>
            </div>
          `,
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Role updated successfully' });
  } catch (error) {
    console.error('Role update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/brand-members/role - Remove a member from the team
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    // Get current user's brand and role
    const { data: currentBrandUser, error: brandError } = await serviceSupabase
      .from('brand_users')
      .select('brand_id, role')
      .eq('user_id', user.id)
      .single();

    if (brandError || !currentBrandUser) {
      return NextResponse.json({ error: 'You are not part of any team' }, { status: 400 });
    }

    // Only owners and admins can remove members
    if (!['owner', 'admin'].includes(currentBrandUser.role)) {
      return NextResponse.json({ error: 'Only owners and admins can remove members' }, { status: 403 });
    }

    // Get the target member
    const { data: targetMember, error: targetError } = await serviceSupabase
      .from('brand_users')
      .select('brand_id, role')
      .eq('user_id', memberId)
      .single();

    if (targetError || !targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Ensure target member is in the same brand
    if (targetMember.brand_id !== currentBrandUser.brand_id) {
      return NextResponse.json({ error: 'Member not in your team' }, { status: 403 });
    }

    // Admins cannot remove owners
    if (currentBrandUser.role === 'admin' && targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Admins cannot remove owners' }, { status: 403 });
    }

    // Cannot remove yourself
    if (memberId === user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself from the team' }, { status: 400 });
    }

    // Remove the member
    const { error: deleteError } = await serviceSupabase
      .from('brand_users')
      .delete()
      .eq('user_id', memberId)
      .eq('brand_id', currentBrandUser.brand_id);

    if (deleteError) {
      console.error('Error removing member:', deleteError);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    console.error('Member removal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
