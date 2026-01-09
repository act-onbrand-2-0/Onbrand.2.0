import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const runtime = 'nodejs';
// Note: Netlify free tier has 10s timeout, Pro has 26s timeout
// If AI processing takes longer, consider implementing async job queue

/**
 * Budget Planning API
 *
 * POST /api/agents/budget
 * Body: FormData with 'file' field containing PDF briefing
 *
 * This endpoint proxies requests to the n8n Budget Planning workflow.
 * The n8n workflow:
 * 1. Extracts text from the PDF briefing
 * 2. Fetches employee data (hourly rates, availability)
 * 3. Uses Claude AI to generate a project budget
 * 4. Returns budget data (JSON or text)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse FormData from request
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    // Validate file exists
    if (!file) {
      return NextResponse.json(
        {
          error: 'No file provided',
          details: 'Please upload a PDF briefing file',
          code: 'MISSING_FILE',
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        {
          error: 'Invalid file type',
          details: 'Only PDF files are accepted',
          code: 'INVALID_FILE_TYPE',
        },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: 'File too large',
          details: 'Maximum file size is 10MB',
          code: 'FILE_TOO_LARGE',
        },
        { status: 400 }
      );
    }

    // Get the n8n webhook URL from environment
    const webhookUrl = process.env.N8N_BUDGET_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error('N8N_BUDGET_WEBHOOK_URL is not configured');
      return NextResponse.json(
        {
          error: 'Budget webhook not configured',
          details: 'Please set N8N_BUDGET_WEBHOOK_URL in environment variables',
          code: 'CONFIG_ERROR',
        },
        { status: 500 }
      );
    }

    // Create new FormData to forward to n8n
    const forwardFormData = new FormData();
    forwardFormData.append('file', file, file.name);

    // Call the n8n webhook with timeout
    // Netlify: Free tier = 10s, Pro = 26s max. Keep under limit to avoid 504.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 seconds (under Netlify Pro limit)

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          ...(process.env.N8N_API_KEY && {
            'X-N8N-API-KEY': process.env.N8N_API_KEY,
          }),
        },
        body: forwardFormData,
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

      // Handle response - could be JSON or text
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await response.json();
        // Handle different response formats from n8n
        const budget = data.text || data.budget || data.result || JSON.stringify(data, null, 2);
        
        return NextResponse.json({
          success: true,
          budget,
          fileName: file.name,
          generatedAt: new Date().toISOString(),
        });
      }

      // Text response (markdown or plain text)
      const budget = await response.text();
      
      // If we get HTML back, something is wrong
      if (budget.trim().startsWith('<')) {
        throw new Error('n8n webhook returned HTML instead of expected data. Please verify the webhook URL and n8n workflow configuration.');
      }
      return NextResponse.json({
        success: true,
        budget,
        fileName: file.name,
        generatedAt: new Date().toISOString(),
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('Request timed out after 20 seconds. The n8n workflow is taking too long. Consider: 1) Optimizing the n8n workflow, 2) Upgrading to Netlify Pro for 26s timeout, or 3) Implementing async job processing.');
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('Budget API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate budget',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: 'GENERATION_ERROR',
      },
      { status: 500 }
    );
  }
}
