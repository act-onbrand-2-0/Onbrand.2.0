import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const runtime = 'nodejs';

/**
 * Corvee Schema Generator API
 *
 * POST /api/agents/corvee
 * Body: { weekStart: "2026-01-06" } (YYYY-MM-DD format, Monday of the week)
 *
 * This endpoint proxies requests to the n8n Corvee Schema Generator workflow.
 * The n8n workflow:
 * 1. Fetches employees, leave, and agenda from Simplicate Supabase
 * 2. Uses Claude AI to generate the weekly duty schedule
 * 3. Returns a markdown-formatted schema
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await request.json();
    const { weekStart } = body;

    // Validate weekStart format (YYYY-MM-DD)
    if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return NextResponse.json(
        {
          error: 'Invalid weekStart format',
          details: 'Expected YYYY-MM-DD format (e.g., 2026-01-06)',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    // Validate that weekStart is a Monday
    const date = new Date(weekStart);
    if (date.getDay() !== 1) {
      return NextResponse.json(
        {
          error: 'weekStart must be a Monday',
          details: 'The corvee schema is generated for a full work week starting Monday',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    // Get the n8n webhook URL from environment
    const webhookUrl = process.env.N8N_CORVEE_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error('N8N_CORVEE_WEBHOOK_URL is not configured');
      return NextResponse.json(
        {
          error: 'Corvee webhook not configured',
          details: 'Please set N8N_CORVEE_WEBHOOK_URL in environment variables',
          code: 'CONFIG_ERROR',
        },
        { status: 500 }
      );
    }

    // Call the n8n webhook with timeout (120 seconds for AI processing)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.N8N_API_KEY && {
            'X-N8N-API-KEY': process.env.N8N_API_KEY,
          }),
        },
        body: JSON.stringify({ weekStart }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('n8n webhook error:', response.status, errorText);
        
        // If we get HTML back, it's likely an error page
        if (errorText.trim().startsWith('<')) {
          throw new Error(`n8n webhook returned error: ${response.status} ${response.statusText}. The webhook URL may be incorrect or the n8n workflow is not accessible.`);
        }
        
        throw new Error(`n8n webhook failed: ${response.statusText}`);
      }

      // Check content type
      const contentType = response.headers.get('content-type') || '';
      
      // Try to parse as JSON first (n8n might return { success, text })
      if (contentType.includes('application/json')) {
        const data = await response.json();
        // Handle different response formats
        const schema = data.text || data.schema || data.result || JSON.stringify(data, null, 2);
        
        return NextResponse.json({
          success: true,
          schema,
          weekStart,
          generatedAt: new Date().toISOString(),
        });
      }

      // Otherwise treat as text
      const schema = await response.text();
      
      // If we get HTML back, something is wrong
      if (schema.trim().startsWith('<')) {
        throw new Error('n8n webhook returned HTML instead of expected data. Please verify the webhook URL and n8n workflow configuration.');
      }

      return NextResponse.json({
        success: true,
        schema,
        weekStart,
        generatedAt: new Date().toISOString(),
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('Request timed out after 120 seconds. The AI processing may be taking too long. Please try again or contact support.');
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('Corvee API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate corvee schema',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: 'GENERATION_ERROR',
      },
      { status: 500 }
    );
  }
}
