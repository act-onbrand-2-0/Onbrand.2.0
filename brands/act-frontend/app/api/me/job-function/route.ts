import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  console.log('[job-function API] Request received');
  try {
    console.log('[job-function API] Creating Supabase client...');
    const supabase = await createClient();
    
    console.log('[job-function API] Getting user...');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('[job-function API] No user found - unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('[job-function API] User authenticated:', user.id);
    
    const body = await req.json();
    console.log('[job-function API] Request body:', body);
    
    const { jobFunction, brandId } = body;
    
    if (!jobFunction || !brandId) {
      console.log('[job-function API] Missing parameters:', { jobFunction, brandId });
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }
    
    console.log('[job-function API] Creating service client to bypass RLS...');
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    console.log('[job-function API] Updating database...');
    console.log('[job-function API] Query params:', {
      user_id: user.id,
      brand_id: brandId,
      job_function: jobFunction
    });
    
    // Use service role client to bypass RLS
    const { data: updateData, error } = await serviceSupabase
      .from('brand_users')
      .update({ job_function: jobFunction })
      .eq('user_id', user.id)
      .eq('brand_id', brandId)
      .select();
    
    console.log('[job-function API] Update data:', updateData);
    console.log('[job-function API] Update error:', error);
    
    if (error) {
      console.error('[job-function API] Database update error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    if (!updateData || updateData.length === 0) {
      console.log('[job-function API] Update succeeded but no rows affected!');
      return NextResponse.json({ error: 'No rows were updated' }, { status: 400 });
    }
    
    console.log('[job-function API] Success! Updated row:', updateData[0]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[job-function API] Unexpected error:', e);
    return NextResponse.json({ error: (e as Error).message || 'Unexpected error' }, { status: 500 });
  }
}


