# Quick Setup: Apply Agent Jobs Migration

Since `supabase db push` isn't working, apply the migration manually:

## Option 1: Supabase Dashboard (Easiest)

1. Go to your Supabase project: https://supabase.com/dashboard/project/pyvobennsmzyvtaceopn
2. Click "SQL Editor" in the left sidebar
3. Click "+ New Query"
4. Copy and paste the entire contents of `supabase/migrations/20260109000000_create_agent_jobs_table.sql`
5. Click "Run" (or press Cmd/Ctrl + Enter)

## Option 2: psql Command Line

```bash
# If you have the connection string
psql "postgresql://postgres:[YOUR-PASSWORD]@db.pyvobennsmzyvtaceopn.supabase.co:5432/postgres" \
  -f supabase/migrations/20260109000000_create_agent_jobs_table.sql
```

## Verify It Worked

Run this query in SQL Editor to check:

```sql
SELECT * FROM agent_jobs LIMIT 1;
```

If you see "Success. No rows returned", the table exists and is ready! ✅

## Then Test Locally

After creating the table:
1. Restart your dev server: `pnpm dev`
2. Try generating a Corvee schema
3. It should now work without "Failed to create job" error

---

The agents will also work immediately on Netlify once you push the code (no migration needed there since it uses the same database).

