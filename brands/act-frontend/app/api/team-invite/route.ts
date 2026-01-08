import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Create Resend client on demand
const createResendClient = () => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('Missing RESEND_API_KEY - email notifications disabled');
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
};

// POST /api/team-invite - Invite a user to join your team/brand
export async function POST(request: NextRequest) {
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
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Get current user's brand
    const { data: brandUser, error: brandError } = await serviceSupabase
      .from('brand_users')
      .select('brand_id, role')
      .eq('user_id', user.id)
      .single();

    if (brandError || !brandUser) {
      return NextResponse.json({ error: 'You are not part of any team' }, { status: 400 });
    }

    // Check if user has admin role to invite
    if (!['admin', 'owner'].includes(brandUser.role)) {
      return NextResponse.json({ error: 'Only admins can invite team members' }, { status: 403 });
    }

    // Look up the invited user by email
    const { data: usersData, error: listError } = await serviceSupabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error looking up user:', listError);
      return NextResponse.json({ error: 'Failed to process invitation' }, { status: 500 });
    }

    const invitedUser = usersData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!invitedUser) {
      // User doesn't exist - send invite email to sign up
      const resend = createResendClient();
      if (resend) {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://chatbot.onbrandai.app';
        const inviterName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Someone';
        
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Onbrand AI <notifications@onbrandai.app>',
          to: email,
          subject: `${inviterName} invited you to join their team on Onbrand AI`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1a1a1a; margin-bottom: 16px;">You're invited to join a team!</h2>
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                <strong>${inviterName}</strong> has invited you to join their team on Onbrand AI.
              </p>
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                Sign up to collaborate with your team on AI-powered conversations.
              </p>
              <a href="${baseUrl}/signup?invite=true&brand=${brandUser.brand_id}" style="display: inline-block; background: #0066ff; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 16px;">
                Join Team
              </a>
              <p style="color: #888; font-size: 12px; margin-top: 24px;">
                If you didn't expect this invitation, you can ignore this email.
              </p>
            </div>
          `,
        });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Invitation email sent. They will need to sign up first.',
        needsSignup: true
      });
    }

    // User exists - check if already in the brand
    const { data: existingMember } = await serviceSupabase
      .from('brand_users')
      .select('id')
      .eq('user_id', invitedUser.id)
      .eq('brand_id', brandUser.brand_id)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a team member' }, { status: 400 });
    }

    // Add user to brand
    const { error: insertError } = await serviceSupabase
      .from('brand_users')
      .insert({
        user_id: invitedUser.id,
        brand_id: brandUser.brand_id,
        role: 'member',
      });

    if (insertError) {
      console.error('Error adding user to brand:', insertError);
      return NextResponse.json({ error: 'Failed to add user to team' }, { status: 500 });
    }

    // Send notification email
    const resend = createResendClient();
    if (resend) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://chatbot.onbrandai.app';
      const inviterName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Someone';
      
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Onbrand AI <notifications@onbrandai.app>',
        to: email,
        subject: `You've been added to a team on Onbrand AI`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a1a; margin-bottom: 16px;">Welcome to the team!</h2>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">
              <strong>${inviterName}</strong> has added you to their team on Onbrand AI.
            </p>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">
              You can now collaborate on shared conversations and access team resources.
            </p>
            <a href="${baseUrl}/dashboard" style="display: inline-block; background: #0066ff; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 16px;">
              Open Dashboard
            </a>
          </div>
        `,
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User added to team successfully'
    });
  } catch (error) {
    console.error('Team invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
