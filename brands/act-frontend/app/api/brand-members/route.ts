import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// GET /api/brand-members - Get all members of the current user's brand
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('=== BRAND MEMBERS DEBUG ===');
    console.log('Current user ID:', user.id);
    console.log('Current user email:', user.email);

    // Use service role client to bypass RLS for brand_users queries
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user's brand (using service role to bypass RLS)
    const { data: brandUser, error: brandUserError } = await serviceSupabase
      .from('brand_users')
      .select('brand_id')
      .eq('user_id', user.id)
      .single();

    console.log('Brand user query result:', { brandUser, brandUserError });

    if (brandUserError || !brandUser) {
      console.error('Brand user error:', brandUserError);
      return NextResponse.json({ error: 'User not associated with a brand' }, { status: 404 });
    }

    console.log('User brand_id:', brandUser.brand_id);

    // Get ALL members of the same brand (using service role to bypass RLS)
    const { data: allBrandMembers, error: allMembersError } = await serviceSupabase
      .from('brand_users')
      .select('user_id, role, job_function')
      .eq('brand_id', brandUser.brand_id);

    console.log('ALL members in brand:', allBrandMembers);
    console.log('ALL members count:', allBrandMembers?.length || 0);

    // Filter out current user
    const brandMembers = (allBrandMembers || []).filter(
      (member: any) => member.user_id !== user.id
    );

    console.log('Brand members (excluding current user):', brandMembers);
    console.log('Filtered members count:', brandMembers.length);

    // If no other members, return empty array
    if (brandMembers.length === 0) {
      console.log('No other brand members found for brand:', brandUser.brand_id);
      console.log('=== END DEBUG ===');
      return NextResponse.json({ members: [], brandId: brandUser.brand_id });
    }

    console.log(`Found ${brandMembers.length} other brand members for brand: ${brandUser.brand_id}`);
    console.log('Fetching user details from auth.users...');

    // Get user details for each member
    const members = await Promise.all(
      brandMembers.map(async (member: any) => {
        try {
          const { data: userData, error: userError } = await serviceSupabase.auth.admin.getUserById(member.user_id);
          
          if (userError || !userData.user) {
            return {
              id: member.user_id,
              email: 'Unknown',
              name: 'Unknown User',
              avatar: null,
              role: member.role,
            };
          }

          const userMeta = userData.user.user_metadata || {};
          return {
            id: member.user_id,
            email: userData.user.email || 'Unknown',
            name: userMeta.full_name || userMeta.name || userData.user.email?.split('@')[0] || 'Unknown User',
            avatar: userMeta.avatar_url || null,
            role: member.role,
            job_function: member.job_function || null,
          };
        } catch (err) {
          console.error('Error fetching user:', err);
          return {
            id: member.user_id,
            email: 'Unknown',
            name: 'Unknown User',
            avatar: null,
            role: member.role,
            job_function: member.job_function || null,
          };
        }
      })
    );

    return NextResponse.json({ members, brandId: brandUser.brand_id });
  } catch (error) {
    console.error('Brand members fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

