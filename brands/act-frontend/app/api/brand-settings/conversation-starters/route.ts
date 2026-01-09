import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Default conversation starters per role
export const DEFAULT_ROLE_SUGGESTIONS: Record<string, Array<{ title: string; label: string }>> = {
  'Strategist': [
    { title: 'Analyze my target audience demographics and suggest content pillars that would resonate with them', label: 'Audience Analysis' },
    { title: 'Help me develop a content strategy for launching [product/campaign] across multiple channels', label: 'Content Strategy' },
    { title: "Review my competitor's messaging and identify gaps we could exploit in our positioning", label: 'Competitor Analysis' },
    { title: 'Create a quarterly content roadmap aligned with our business objectives', label: 'Content Roadmap' },
  ],
  'Creative': [
    { title: 'Generate 10 headline variations for [product/campaign] that capture [specific emotion/benefit]', label: 'Headlines' },
    { title: 'Brainstorm creative concepts for a social media campaign about [topic/product]', label: 'Campaign Ideas' },
    { title: 'Help me write compelling ad copy that highlights [key features] for [target audience]', label: 'Ad Copy' },
    { title: 'Suggest visual directions and mood boards for [brand/campaign theme]', label: 'Visual Direction' },
  ],
  'Account Manager': [
    { title: 'Draft a client presentation outline that explains our recommended strategy for [campaign]', label: 'Presentation' },
    { title: 'Create a project timeline and milestone breakdown for [campaign type]', label: 'Timeline' },
    { title: 'Help me write a status update email addressing [client concern] while managing expectations', label: 'Status Update' },
    { title: 'Generate talking points for a kickoff meeting with a new client in [industry]', label: 'Kickoff Meeting' },
  ],
  'Social Media Manager': [
    { title: "Create a week's worth of post ideas for [platform] that align with [brand voice/campaign]", label: 'Post Ideas' },
    { title: 'Suggest engagement strategies to boost interaction on our recent [content type] posts', label: 'Engagement' },
    { title: 'Help me write responses to common customer comments/questions about [product/topic]', label: 'Responses' },
    { title: 'Generate caption variations for [type of content] that encourage shares and saves', label: 'Captions' },
  ],
  'Communication Manager': [
    { title: 'Draft a press release announcing [company news/product launch]', label: 'Press Release' },
    { title: 'Create talking points for leadership to address [issue/announcement] internally and externally', label: 'Talking Points' },
    { title: 'Help me write crisis communication guidelines for [potential scenario]', label: 'Crisis Comms' },
    { title: 'Develop key messages for our brand that can be adapted across all communication channels', label: 'Key Messages' },
  ],
  'Other': [
    { title: "Help me understand my brand's voice and tone guidelines", label: 'Brand Voice' },
    { title: 'Generate content ideas based on current trends in [industry]', label: 'Content Ideas' },
    { title: 'Create a brief template for my next campaign', label: 'Brief Template' },
    { title: 'Analyze this content and suggest improvements for [specific goal]', label: 'Content Analysis' },
  ],
};

// Create Supabase client with service role for admin operations
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

// Helper to check if user is admin
async function isUserAdmin(supabase: ReturnType<typeof getSupabaseClient>, userId: string, brandId: string): Promise<boolean> {
  const { data } = await supabase
    .from('brand_users')
    .select('role')
    .eq('user_id', userId)
    .eq('brand_id', brandId)
    .single();
  
  return data?.role === 'owner' || data?.role === 'admin';
}

// GET /api/brand-settings/conversation-starters - Get conversation starters for a brand
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    
    // Get brand settings
    const { data: brand, error } = await supabase
      .from('brands')
      .select('settings')
      .eq('id', brandId)
      .single();

    if (error) {
      console.error('Failed to fetch brand settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch brand settings' },
        { status: 500 }
      );
    }

    // Return custom starters if set, otherwise return defaults
    const customStarters = brand?.settings?.conversation_starters;
    
    return NextResponse.json({
      conversation_starters: customStarters || DEFAULT_ROLE_SUGGESTIONS,
      is_custom: !!customStarters,
      available_roles: Object.keys(DEFAULT_ROLE_SUGGESTIONS),
    });
  } catch (error) {
    console.error('Conversation starters GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/brand-settings/conversation-starters - Update conversation starters for a brand
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandId, userId, conversation_starters } = body;

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Check if user is admin
    const isAdmin = await isUserAdmin(supabase, userId, brandId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can update conversation starters' },
        { status: 403 }
      );
    }

    // Get current settings
    const { data: brand, error: fetchError } = await supabase
      .from('brands')
      .select('settings')
      .eq('id', brandId)
      .single();

    if (fetchError) {
      console.error('Failed to fetch brand:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch brand settings' },
        { status: 500 }
      );
    }

    // Merge new conversation starters with existing settings
    const currentSettings = brand?.settings || {};
    const newSettings = {
      ...currentSettings,
      conversation_starters,
    };

    // Update brand settings
    const { error: updateError } = await supabase
      .from('brands')
      .update({ settings: newSettings })
      .eq('id', brandId);

    if (updateError) {
      console.error('Failed to update brand settings:', updateError);
      return NextResponse.json(
        { error: 'Failed to update conversation starters' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation_starters,
    });
  } catch (error) {
    console.error('Conversation starters POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/brand-settings/conversation-starters - Reset to defaults
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get('brandId');
    const userId = searchParams.get('userId');

    if (!brandId || !userId) {
      return NextResponse.json(
        { error: 'Brand ID and User ID are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Check if user is admin
    const isAdmin = await isUserAdmin(supabase, userId, brandId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can reset conversation starters' },
        { status: 403 }
      );
    }

    // Get current settings
    const { data: brand, error: fetchError } = await supabase
      .from('brands')
      .select('settings')
      .eq('id', brandId)
      .single();

    if (fetchError) {
      console.error('Failed to fetch brand:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch brand settings' },
        { status: 500 }
      );
    }

    // Remove conversation_starters from settings
    const currentSettings = brand?.settings || {};
    const { conversation_starters: _, ...newSettings } = currentSettings;

    // Update brand settings
    const { error: updateError } = await supabase
      .from('brands')
      .update({ settings: newSettings })
      .eq('id', brandId);

    if (updateError) {
      console.error('Failed to reset conversation starters:', updateError);
      return NextResponse.json(
        { error: 'Failed to reset conversation starters' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation_starters: DEFAULT_ROLE_SUGGESTIONS,
    });
  } catch (error) {
    console.error('Conversation starters DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
