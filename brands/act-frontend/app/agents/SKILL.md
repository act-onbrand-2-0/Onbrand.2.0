# ACT Agency - OnBrand AI Agents Module

This document describes the architecture and setup of the AI Agents module for ACT Agency's **OnBrand** application, focusing on the **Corvee Schema Generator** and **AI Account Workflow** agents.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OnBrand - AI Agents Architecture                      │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌────────────────────────┐
                         │       FRONTEND         │
                         │  Next.js 16 + React 18 │
                         │     (App Router)       │
                         └───────────┬────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
         ┌─────────────────┐  ┌───────────┐  ┌──────────────────┐
         │  SUPABASE       │  │   n8n     │  │  Direct API      │
         │  (via SDK)      │  │  Webhooks │  │  (fetch/axios)   │
         └────────┬────────┘  └─────┬─────┘  └────────┬─────────┘
                  │                 │                  │
                  ▼                 ▼                  ▼
         ┌─────────────────────────────────────────────────────┐
         │                   BACKEND SERVICES                   │
         ├─────────────────┬──────────────┬───────────────────┤
         │    SUPABASE     │  n8n FLOWS   │    SIMPLICATE     │
         │  • Database     │  • Corvee    │    HR/Planning    │
         │  • Edge Funcs   │  • Budget    │                   │
         │  • Auth         │  • AI Agent  │                   │
         └────────┬────────┴──────┬───────┴─────────┬─────────┘
                  │               │                 │
                  └───────────────┼─────────────────┘
                                  ▼
                         ┌──────────────┐
                         │  ANTHROPIC   │
                         │  Claude API  │
                         └──────────────┘
```

---

## 2. Frontend Stack (OnBrand App)

The OnBrand application is built with a modern React + Next.js stack:

### Core Framework

| Package | Version | Purpose |
|---------|---------|---------|
| **React** | 18.3.1 | Core UI library |
| **Next.js** | 16.0.10 | React framework with SSR, App Router |
| **TypeScript** | - | Type-safe development (`.tsx` files) |

### UI Components & Styling

| Package | Purpose |
|---------|---------|
| **Radix UI** | Headless, accessible UI primitives |
| **Tailwind CSS** | v4 - Utility-first CSS framework |
| **clsx + tailwind-merge** | Conditional className handling |
| **Lucide React** | Icon library |
| **Next Themes** | Dark mode support |

### Data & State

| Package | Purpose |
|---------|---------|
| **Zustand** | Lightweight state management |
| **@supabase/supabase-js** | Supabase client SDK |
| **AI SDK React** | AI chat interface components |

### Visualization & Content

| Package | Purpose |
|---------|---------|
| **Recharts** | React charting library |
| **React Markdown** | Render markdown content |
| **Motion** | Animation library |

### Next.js App Router Structure

```
app/
├── layout.tsx              # Root layout (providers, themes)
├── page.tsx                # Home page
├── (dashboard)/
│   ├── corvee/
│   │   └── page.tsx        # Corvee Schema page
│   └── budget/
│       └── page.tsx        # Budget Planning page
├── api/                    # API routes (if needed)
└── components/
    ├── ui/                 # Radix-based UI components
    ├── corvee/             # Corvee-specific components
    └── budget/             # Budget-specific components
```

### Key Frontend Patterns

```tsx
// Example: Calling Corvee Schema from Next.js App Router

'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import ReactMarkdown from 'react-markdown';

export default function CorveePage() {
  const [schema, setSchema] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const generateSchema = async (weekStart: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/corvee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart }),
      });
      const data = await response.text();
      setSchema(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <ReactMarkdown>{schema}</ReactMarkdown>
    </div>
  );
}
```

---

## 3. Component Details

### 3.1 n8n Workflows

n8n is the workflow automation platform that orchestrates the AI agents. Each workflow is exposed as a webhook endpoint.

| Workflow | Webhook Path | Purpose |
|----------|--------------|---------|
| **Corvee Schema Generator** | `POST /corvee-schema` | Generates weekly office duty schedules |
| **AI Account Workflow** | `POST /budget-planning` | Creates project budgets from PDF briefs |

**Location:** `workflows/` directory
- `Corvee Schema Generator.json`
- `AI Account Workflow (Database Only - Clean).json`

### 2.2 Supabase (Database + Edge Functions)

**Project ID:** `fykqrmrpucdsfvzbkxic`
**Project URL:** `https://fykqrmrpucdsfvzbkxic.supabase.co`

#### Database Tables (Simplicate Integration)

| Table | Purpose | Rows |
|-------|---------|------|
| `simplicate_employees` | Employee data (name, job title, team, hourly rate) | ~90 |
| `simplicate_leave` | Leave/vacation schedules | ~212 |
| `simplicate_absences` | Sick leave and absences | ~100 |
| `simplicate_timesheetrows` | Calendar/agenda activities with meeting classification | ~1122 |
| `simplicate_hours` | Booked project hours | ~247 |
| `simplicate_projects` | Project information | ~100 |
| `simplicate_services` | Service catalog with pricing | ~72 |
| `simplicate_sync_log` | Sync operation tracking | ~13 |

#### Key Columns in `simplicate_timesheetrows`

```sql
-- Meeting classification columns (pre-calculated during sync)
is_important_meeting  BOOLEAN  -- TRUE = meeting with others (blocks corvee)
                               -- FALSE = solo work (doesn't block)
importance_reason     TEXT     -- Explanation for classification
```

#### Edge Functions

| Function | Purpose |
|----------|---------|
| `sync-simplicate-timesheets` | Syncs Simplicate calendar data → Supabase with meeting classification |

**Location:** `supabase/functions/sync-simplicate-timesheets/index.ts`

### 2.3 Simplicate API

Simplicate is the HR/planning system used by ACT Agency.

**Base URL:** `https://act.simplicate.com/api/v2`
**Auth:** Basic Authentication (`API_KEY:SECRET` base64 encoded)

#### Key Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `/hours/hours` | Calendar/agenda activities (timesheetrows) |
| `/hrm/employee` | Employee data |
| `/hrm/leave` | Leave/vacation data |
| `/hrm/absence` | Absence data (sick leave) |

### 2.4 Anthropic Claude API

The AI language model powering the agents.

| Workflow | Model |
|----------|-------|
| Corvee Schema Generator | `claude-3-5-sonnet-20240620` |
| AI Account Workflow | `claude-sonnet-4-5-20250929` |

---

## 3. Workflow Details

### 3.1 Corvee Schema Generator

**Purpose:** Generate weekly office duty (corvee) schedules considering:
- Employee availability (leave, part-time days)
- Calendar conflicts (meetings blocking corvee time slots)
- Recurring meeting constraints (e.g., MT meetings on Monday)

**Flow:**

```
[Webhook Trigger] → [Fetch Employees] → [Fetch Leave] → [Fetch Agenda]
        ↓                                                      ↓
        └──────────────────────────────────────────────────────┘
                                    ↓
                        [Combine Data (JavaScript)]
                                    ↓
                         [Claude AI Agent]
                                    ↓
                        [Validate & Respond]
```

**Data Processing (Combine Node):**
1. Parses `weekStart` parameter from webhook
2. Fetches verlof from BOTH `simplicate_leave` AND `simplicate_timesheetrows`
3. Uses pre-calculated `is_important_meeting` for blocking conflicts
4. Builds availability matrix per employee per time slot
5. Outputs structured `corveeData` object for AI

**Corvee Time Slots:**

| Slot | Time | Days |
|------|------|------|
| Vaatwasser uitruimen | 09:15-09:30 | Ma, Di, Do |
| Tafel dekken | 11:45-12:15 | Ma, Di, Do |
| Tafel afruimen | 12:45-13:15 | Ma, Di, Do |
| Vaatwasser einde dag | 16:45-17:00 | Ma, Di, Do |
| Boodschappen | 09:00-11:00 | Maandag only |
| Glas/karton | 16:00-16:15 | Donderdag only |

### 3.2 AI Account Workflow

**Purpose:** Generate concept-phase project budgets from PDF briefs.

**Flow:**

```
[Webhook + PDF] ─┬─→ [Extract PDF Text] ─────────────────┐
                 │                                       ↓
                 └─→ [Fetch Employees] → [Fetch Leave] → [Merge Data]
                                                              ↓
                                                     [Claude AI Agent]
                                                              ↓
                                                    [Validate & Respond]
```

**Key Features:**
- Uses employee `hourly_rate` from database for budget calculations
- Checks availability to avoid scheduling during leave periods
- Maintains team consistency (same person for same role throughout project)
- Includes client feedback moments in planning

---

## 4. Meeting Classification Logic

The `sync-simplicate-timesheets` Edge Function classifies each calendar item:

### Non-Important (Solo Work) - Does NOT Block Corvee

| Pattern | Example |
|---------|---------|
| Lunch/pauze/break | "Lunch", "Pauze" |
| Employee initials prefix | "GW: Research task" |
| Internal activity types | Studio, Account, Social, Copy |
| Solo work keywords | Focus, admin, werkdag, uitwerken, voorbereiding |

### Important (Meeting with Others) - BLOCKS Corvee

| Pattern | Example |
|---------|---------|
| Meeting keywords | Meeting, vergadering, overleg, call, weekly |
| Client/company names | Schiphol, KLM, NS, ING |
| Personal appointments | Huisarts, tandarts, afspraak |
| External calendar items | Items synced from Outlook/Google |

---

## 5. API Keys & Credentials Required

### 5.1 Next.js Frontend Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase (public - exposed to browser)
NEXT_PUBLIC_SUPABASE_URL=https://fykqrmrpucdsfvzbkxic.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# n8n Webhook URLs (server-side only)
N8N_CORVEE_WEBHOOK_URL=https://[n8n-host]/webhook/corvee-schema
N8N_BUDGET_WEBHOOK_URL=https://[n8n-host]/webhook/budget-planning

# Supabase Service Role (server-side only, for admin operations)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5.2 Supabase

| Key | Purpose | Where Used |
|-----|---------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project API URL | Frontend (browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public API key | Frontend (browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin API key | API routes, n8n (server-only) |

**Current Values:**
```
SUPABASE_URL: https://fykqrmrpucdsfvzbkxic.supabase.co
SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5a3FybXJwdWNkc2Z2emJreGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MDczODgsImV4cCI6MjA3NzQ4MzM4OH0.qaPg36j-8b7MiBuULxdZx8GVfMzDAbnKxVa3aqG1Qtc
SUPABASE_SERVICE_ROLE_KEY: [stored in n8n credentials / .env.local]
```

### 5.3 Simplicate API

| Key | Purpose | Where Stored |
|-----|---------|--------------|
| `SIMPLICATE_API_KEY` | API authentication | Supabase Edge Function secrets |
| `SIMPLICATE_SECRET` | API authentication | Supabase Edge Function secrets |

**Authentication:** Basic Auth header
```
Authorization: Basic base64(API_KEY:SECRET)
```

### 5.4 Anthropic Claude API

| Key | Purpose | Where Stored |
|-----|---------|--------------|
| `ANTHROPIC_API_KEY` | Claude model access | n8n credentials (id: `lqZxK7Qp7b1jdU5v`) |

### 5.5 All Environment Variables Summary

```env
# ═══════════════════════════════════════════════════════════
# .env.local - Next.js Frontend
# ═══════════════════════════════════════════════════════════

# Public (exposed to browser via NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_SUPABASE_URL=https://fykqrmrpucdsfvzbkxic.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server-side only (API routes)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
N8N_CORVEE_WEBHOOK_URL=https://[n8n-host]/webhook/corvee-schema
N8N_BUDGET_WEBHOOK_URL=https://[n8n-host]/webhook/budget-planning

# ═══════════════════════════════════════════════════════════
# Supabase Edge Function Secrets (set via Supabase Dashboard)
# ═══════════════════════════════════════════════════════════
SIMPLICATE_API_KEY=[your-api-key]
SIMPLICATE_SECRET=[your-secret]

# ═══════════════════════════════════════════════════════════
# n8n Credentials (configured in n8n UI)
# ═══════════════════════════════════════════════════════════
# Anthropic API - credential id: lqZxK7Qp7b1jdU5v
# Supabase Service Role Key - used in HTTP Request nodes
```

---

## 6. n8n Configuration

### 6.1 Webhook URLs (Production)

```
Corvee Schema: https://[n8n-host]/webhook/corvee-schema
Budget Planning: https://[n8n-host]/webhook/budget-planning
```

### 6.2 HTTP Request Configuration

All Supabase requests use:
```
Headers:
  apikey: [SUPABASE_SERVICE_ROLE_KEY]
  Authorization: Bearer [SUPABASE_SERVICE_ROLE_KEY]
  Accept: application/json

Timeout: 30000ms
```

### 6.3 Node Execution Order

⚠️ **Important:** Nodes must execute **sequentially** (not parallel) to ensure data dependencies:

```
Trigger → Employees → Leave → Agenda → Combine → AI → Response
```

If running parallel, use `executeOnce: true` for nodes that should only run once (not per-item).

---

## 7. Data Sync Process

### Syncing Simplicate → Supabase

**Trigger:** Manual or scheduled call to Edge Function

```bash
curl -X POST \
  https://fykqrmrpucdsfvzbkxic.supabase.co/functions/v1/sync-simplicate-timesheets \
  -H "Authorization: Bearer [SUPABASE_ANON_KEY]" \
  -H "Content-Type: application/json"
```

**Sync Window:** 180 days from today (configurable in Edge Function)

**What Gets Synced:**
- All calendar activities from Simplicate `/hours/hours` endpoint
- Automatic classification of meeting importance
- Upsert into `simplicate_timesheetrows` table

---

## 8. Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Wrong week generated | `weekStart` not parsed correctly | Check webhook body structure |
| Meetings not considered | Classification too restrictive | Adjust `classifyMeetingImportance()` |
| Verlof not detected | Only checking `simplicate_leave` | Also check `simplicate_timesheetrows` for "verlof" in title |
| Timeout errors | Too many records fetched | Add `executeOnce: true` to fetch nodes |

### Debugging Tips

1. **Check n8n execution logs** for data flow between nodes
2. **Query Supabase directly** to verify data:
   ```sql
   SELECT * FROM simplicate_timesheetrows 
   WHERE start_date >= '2026-01-26' 
   ORDER BY start_date;
   ```
3. **Re-run sync** after modifying classification logic:
   ```bash
   supabase functions deploy sync-simplicate-timesheets
   curl -X POST [function-url]
   ```

---

## 9. File Structure

```
actonbrand-2025/
├── app/                                      # Next.js App Router
│   ├── layout.tsx                            # Root layout with providers
│   ├── page.tsx                              # Home page
│   ├── globals.css                           # Tailwind CSS imports
│   ├── (dashboard)/                          # Route group
│   │   ├── corvee/
│   │   │   └── page.tsx                      # Corvee Schema page
│   │   └── budget/
│   │       └── page.tsx                      # Budget Planning page
│   └── api/                                  # Next.js API routes
│       ├── corvee/
│       │   └── route.ts                      # Proxy to n8n webhook
│       └── budget/
│           └── route.ts                      # Proxy to n8n webhook
│
├── components/
│   ├── ui/                                   # Radix-based UI components
│   │   ├── button.tsx
│   │   ├── calendar.tsx
│   │   └── ...
│   ├── corvee/                               # Corvee-specific components
│   └── budget/                               # Budget-specific components
│
├── lib/
│   ├── supabase.ts                           # Supabase client setup
│   └── utils.ts                              # Utility functions (cn, etc.)
│
├── workflows/                                # n8n workflow exports
│   ├── Corvee Schema Generator.json
│   ├── AI Account Workflow (Database Only - Clean).json
│   └── 251021 - Briefing Ai corvee schema - DC 1 (1).docx
│
├── supabase/
│   ├── functions/
│   │   └── sync-simplicate-timesheets/
│   │       └── index.ts                      # Edge Function (Deno)
│   └── migrations/
│       └── *.sql                             # Database schema migrations
│
├── package.json                              # Dependencies
├── tailwind.config.ts                        # Tailwind v4 config
├── next.config.js                            # Next.js config
└── tsconfig.json                             # TypeScript config
```

---

## 10. Quick Reference - API Calls

### Frontend (Next.js App Router)

#### Call Corvee Schema (via API Route)

```tsx
// app/api/corvee/route.ts - API Route (Server-side)
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const response = await fetch(process.env.N8N_CORVEE_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  const schema = await response.text();
  return NextResponse.json({ schema });
}
```

```tsx
// Client component calling the API route
'use client';

async function generateSchema(weekStart: string) {
  const response = await fetch('/api/corvee', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weekStart }), // YYYY-MM-DD format
  });
  const { schema } = await response.json();
  return schema;
}
```

#### Call Budget Planning (via API Route)

```tsx
// app/api/budget/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  
  const response = await fetch(process.env.N8N_BUDGET_WEBHOOK_URL!, {
    method: 'POST',
    body: formData,
  });
  
  const budget = await response.json();
  return NextResponse.json(budget);
}
```

```tsx
// Client component
'use client';

async function generateBudget(pdfFile: File) {
  const formData = new FormData();
  formData.append('file', pdfFile);
  
  const response = await fetch('/api/budget', {
    method: 'POST',
    body: formData,
  });
  return response.json();
}
```

#### Direct Supabase Queries (Client)

```tsx
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Fetch employees
const { data: employees } = await supabase
  .from('simplicate_employees')
  .select('id, name, job_title, team')
  .eq('is_active', true);

// Fetch agenda items
const { data: agenda } = await supabase
  .from('simplicate_timesheetrows')
  .select('*')
  .gte('start_date', '2026-01-26')
  .order('start_date');
```

### Backend (Direct n8n Webhook)

```bash
# Corvee Schema (direct)
curl -X POST https://[n8n-host]/webhook/corvee-schema \
  -H "Content-Type: application/json" \
  -d '{"weekStart": "2026-01-26"}'

# Trigger Timesheet Sync
curl -X POST \
  https://fykqrmrpucdsfvzbkxic.supabase.co/functions/v1/sync-simplicate-timesheets \
  -H "Authorization: Bearer [SUPABASE_ANON_KEY]" \
  -H "Content-Type: application/json"
```

---

## 11. Future Improvements

- [ ] Add cron job or Supabase scheduled function to auto-sync Simplicate data
- [ ] Implement more sophisticated meeting detection (NLP-based with AI SDK)
- [ ] Add React Query or SWR for client-side caching of Supabase data
- [ ] Create admin dashboard with Recharts for sync status and agent performance
- [ ] Add streaming responses using AI SDK for real-time schema generation
- [ ] Implement Zustand store for corvee/budget state management
- [ ] Add loading states with Motion animations
- [ ] Implement dark mode styles for all agent interfaces

