# ACT 2.0 - AI-Powered Brand Management Platform

## What is this project?

ACT 2.0 is a multi-tenant brand management platform with AI chat capabilities and MCP (Model Context Protocol) integration. It enables brands to have their own subdomain-based portals with AI-powered chat assistants that can connect to external tools and services.

## Project Structure

This is a **pnpm monorepo** with the following structure:

```
Onbrand.2.0/
├── brands/act-frontend/        # Main Next.js application
├── packages/                   # Shared workspace packages
│   ├── auth/                  # Authentication utilities
│   ├── chat/                  # Chat components & logic
│   ├── tenant-config/         # Brand configuration
│   └── ui/                    # Shared UI components
├── supabase/                  # Database & backend
│   ├── migrations/           # SQL migrations (55 files)
│   └── functions/            # Edge functions (9 functions)
└── Setup/                     # Documentation (22+ guides)
```

**Key apps**: `brands/act-frontend` is the primary frontend application.
**Shared packages**: Use workspace protocol (`@act/auth`, `@act/chat`, etc.)

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS v4, Radix UI components
- **Database**: Supabase (PostgreSQL with RLS)
- **Auth**: Supabase Auth (supports Microsoft OAuth)
- **AI**: Vercel AI SDK (`ai` package) with streaming support
- **MCP**: Model Context Protocol integration (`@ai-sdk/mcp`)
- **Package Manager**: pnpm (workspace mode)
- **Build Tool**: Turbo (monorepo orchestration)

## Architecture Concepts

### Multi-tenant Brand System
- Each brand has its own subdomain (e.g., `act.onbrandai.app`)
- Middleware validates brands and sets headers (`x-brand-subdomain`, `x-brand-id`)
- Brand detection: `lib/brand.ts` - detects from subdomain or env var

### AI Chat with MCP Integration
- Chat API: `app/api/chat/route.ts` uses Vercel AI SDK streaming
- MCP servers provide external tools to the AI (database: `mcp_servers` table)
- MCP client manager: `lib/mcp/client-manager.ts` handles connections

### Authentication Flow
- OAuth callback: `app/auth/callback/route.ts` exchanges code for session
- Middleware: `middleware.ts` protects routes and validates users
- User-brand relationship: `user_brands` table with role-based access

## Development Commands

```bash
# Install dependencies
pnpm install

# Start dev server (runs act-frontend on port 3000)
pnpm dev

# Type checking (run before committing)
pnpm type-check

# Full QA suite
pnpm qa
```

**Important**: Always use `pnpm` (not npm/yarn). The project uses pnpm workspaces.

## Environment Setup

Create `brands/act-frontend/.env.local` with:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://pyvobennsmzyvtaceopn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Critical**: Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set correctly for OAuth to work.

See `brands/act-frontend/SETUP_ENV.md` for full environment variable documentation.

## Key Files & Patterns

### Supabase Client Creation
- **Browser**: `lib/supabase/client.ts` - use `createClient()`
- **Server**: `lib/supabase/server.ts` - use `await createClient()` (async)
- **Middleware**: `lib/supabase/middleware.ts` - use `updateSession()`

### Brand Detection
- Client-side: `detectBrandId()` reads from `window.location.hostname`
- Server-side: `detectBrandIdFromHostname(hostname)` from headers
- Middleware injects `x-brand-subdomain` header for downstream use

### Database Access
- RLS policies enforce brand isolation
- Service role key bypasses RLS (use with caution)
- Always filter by `brand_id` in queries

## Testing & Verification

```bash
# Run unit tests
pnpm test

# Type check all packages
pnpm type-check

# Run linter (fixes auto-fixable issues)
pnpm lint
```

**Note**: Pre-commit hooks run automatically via Husky. They will auto-format code with Prettier and run ESLint.

## Where to Find Things

- **API Routes**: `brands/act-frontend/app/api/*/route.ts`
- **Pages**: `brands/act-frontend/app/*/page.tsx`
- **Components**: `brands/act-frontend/components/`
- **Utilities**: `brands/act-frontend/lib/`
- **Migrations**: `supabase/migrations/` (numbered, run in order)
- **Edge Functions**: `supabase/functions/`
- **Setup Guides**: `Setup/*.md` (22 detailed documentation files)

## Progressive Disclosure Documents

For task-specific context, read these files only when relevant:

- `Setup/SUPABASE_SETUP.md` - Database schema and RLS policies
- `Setup/MICROSOFT_OAUTH_SETUP.md` - OAuth configuration
- `brands/act-frontend/docs/MCP_INTEGRATION.md` - MCP server setup
- `Setup/MULTI_BRAND_SETUP.md` - Multi-tenancy patterns
- `Setup/EDGE_FUNCTIONS_SETUP.md` - Deploying edge functions
- `Setup/RBAC_PERMISSIONS.md` - Role-based access control

## Common Gotchas

1. **Environment variables**: `NEXT_PUBLIC_*` vars are required for client-side code
2. **Supabase client**: Server components need async `createClient()`, client components use sync
3. **Brand context**: Always check middleware headers for brand ID in API routes
4. **pnpm workspaces**: Reference packages with `@act/*` imports
5. **OAuth redirects**: Callback URL must match Supabase dashboard configuration
6. **Turbo cache**: If builds seem stale, run `turbo run build --force`

## Project Supabase Details

- **Project ID**: `pyvobennsmzyvtaceopn`
- **Project URL**: `https://pyvobennsmzyvtaceopn.supabase.co`
- **55+ migrations** in `supabase/migrations/`
- **9 edge functions** deployed

