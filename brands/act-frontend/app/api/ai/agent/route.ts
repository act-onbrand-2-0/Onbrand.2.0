import { checkBrandCompliance, generateOnBrandContent } from '@/lib/ai/agent';
import { getBrandGuidelines, logBrandCheck } from '@/lib/ai/guidelines-db';
import type { CheckType } from '@/lib/ai/types';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/agent/check
 * 
 * Check content for brand compliance
 * 
 * Request body:
 * {
 *   brandId: string;
 *   content: string;
 *   checkType: 'copy' | 'image' | 'color' | 'logo' | 'full';
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { brandId, content, checkType, action = 'check' } = await request.json();

    if (!brandId || typeof brandId !== 'string') {
      return NextResponse.json(
        { error: 'brandId is required' },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      );
    }

    // Fetch brand guidelines
    const guidelines = await getBrandGuidelines(brandId);
    
    if (!guidelines) {
      return NextResponse.json(
        { error: 'No approved brand guidelines found. Please set up guidelines first.' },
        { status: 404 }
      );
    }

    if (action === 'check') {
      // Brand compliance check
      const validCheckTypes: CheckType[] = ['copy', 'image', 'color', 'logo', 'full'];
      const type: CheckType = validCheckTypes.includes(checkType) ? checkType : 'copy';

      const result = await checkBrandCompliance(content, type, guidelines);
      
      // Log the check for analytics
      await logBrandCheck(
        brandId,
        undefined, // TODO: Get user ID from auth
        type,
        content,
        result,
        {
          modelUsed: 'claude-sonnet-4-20250514',
          responseTimeMs: Date.now() - startTime,
        }
      );

      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    if (action === 'generate') {
      // Content generation
      const { contentType = 'headline', options } = await request.json();
      
      const result = await generateOnBrandContent(
        content, // In this case, content is the prompt
        contentType,
        guidelines,
        options
      );

      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "check" or "generate".' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Agent error:', error);
    return NextResponse.json(
      { error: 'Failed to execute agent', details: String(error) },
      { status: 500 }
    );
  }
}
