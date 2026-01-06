// @ts-nocheck - Prevent Resend init errors during build
import { Resend } from 'resend';
import { NextResponse, type NextRequest } from 'next/server';

// Tell Next.js this is a dynamic API route
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const runtime = 'nodejs';

// Create Resend client on demand to avoid initialization during build
const createResendClient = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Missing Resend API Key');
  }
  return new Resend(process.env.RESEND_API_KEY);
};

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html } = await req.json();

    // Create client on demand
    const resend = createResendClient();
    
    const data = await resend.emails.send({
      from: 'Onbrand AI <onboarding@resend.dev>', // Update with your verified domain
      to,
      subject,
      html,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
