import { createClient, SupabaseClient } from '@supabase/supabase-js';

let simplicateClient: SupabaseClient | null = null;

/**
 * Create Supabase client for Simplicate database
 * Used for reading employee, leave, and timesheet data
 * This is a separate Supabase project from the main OnBrand app
 */
export function createSimplicateClient(): SupabaseClient {
  if (simplicateClient) return simplicateClient;

  const url = process.env.SIMPLICATE_SUPABASE_URL;
  const key = process.env.SIMPLICATE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Simplicate Supabase credentials not configured. ' +
        'Please set SIMPLICATE_SUPABASE_URL and SIMPLICATE_SUPABASE_ANON_KEY in .env.local'
    );
  }

  simplicateClient = createClient(url, key);
  return simplicateClient;
}

// Type definitions for Simplicate tables
export interface SimplicateEmployee {
  id: string;
  name: string;
  initials: string;
  job_title: string;
  team: string;
  hourly_rate: number;
  is_active: boolean;
}

export interface SimplicateLeave {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  type: string;
}

export interface SimplicateTimesheetRow {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  title: string;
  is_important_meeting: boolean;
  importance_reason: string;
}
