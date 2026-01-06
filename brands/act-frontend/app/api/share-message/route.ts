import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Tell Next.js this is a dynamic API route
export const dynamic = 'force-dynamic';

// Create Resend client on demand to avoid initialization during build
const createResendClient = () => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('Missing RESEND_API_KEY - emails will not be sent');
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
};

// Generate HTML email template for shared message
function generateShareEmailHtml(senderName: string, content: string): string {
  // Escape HTML to prevent XSS
  const escapeHtml = (text: string) => 
    text.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

  const escapedSender = escapeHtml(senderName);
  const escapedContent = escapeHtml(content).replace(/\n/g, '<br>');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shared Message</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📬 Message Shared With You</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin: 0 0 20px 0; color: #6b7280;">
      <strong>${escapedSender}</strong> shared the following message with you:
    </p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <p style="margin: 0; white-space: pre-wrap;">${escapedContent}</p>
    </div>
    
    <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 14px;">
      This message was shared via Onbrand AI.
    </p>
  </div>
  
  <div style="background: #1f2937; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
      © ${new Date().getFullYear()} Onbrand AI. All rights reserved.
    </p>
  </div>
</body>
</html>
  `.trim();
}

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

    const senderName = senderProfile?.full_name || user.email || 'A team member';

    // Create notifications for each recipient
    const notifications = recipients.map((recipient) => ({
      user_id: recipient.id,
      type: 'message_shared',
      title: 'Message shared with you',
      message: `${senderName} shared a message with you`,
      metadata: {
        content: content.substring(0, 500), // Limit content length
        sender_id: user.id,
        sender_name: senderName,
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

    // Send emails via Resend
    const resend = createResendClient();
    const emailResults: { email: string; success: boolean; error?: string }[] = [];

    if (resend) {
      const emailHtml = generateShareEmailHtml(senderName, content);
      
      // Send emails to all recipients with valid email addresses
      const emailPromises = recipients
        .filter((r) => r.email)
        .map(async (recipient) => {
          try {
            await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL || 'Onbrand AI <onboarding@resend.dev>',
              to: recipient.email,
              subject: `${senderName} shared a message with you`,
              html: emailHtml,
            });
            return { email: recipient.email, success: true };
          } catch (emailError) {
            console.error(`Failed to send email to ${recipient.email}:`, emailError);
            return { 
              email: recipient.email, 
              success: false, 
              error: emailError instanceof Error ? emailError.message : 'Unknown error' 
            };
          }
        });

      const results = await Promise.all(emailPromises);
      emailResults.push(...results);
      
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;
      
      if (failCount > 0) {
        console.warn(`Email send results: ${successCount} succeeded, ${failCount} failed`);
      }
    } else {
      console.warn('Resend not configured - skipping email notifications');
    }

    return NextResponse.json({
      success: true,
      message: `Message shared with ${recipients.length} team member${recipients.length !== 1 ? 's' : ''}`,
      emailsSent: emailResults.filter((r) => r.success).length,
      emailsFailed: emailResults.filter((r) => !r.success).length,
    });
  } catch (error) {
    console.error('Error sharing message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
