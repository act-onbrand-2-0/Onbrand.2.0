# Agent Notes - Task Learnings & Context

**Purpose**: This file captures what works, what fails, and missing context discovered during development. After completing a task, add notes below to improve future sessions.

---

## How to Use This File

After completing a task, add an entry using this template:

```markdown
### [Date] - [Brief Task Description]

**Task**: [What was accomplished]

**What Worked**:
- [Successful approaches, patterns, or solutions]

**What Failed**:
- [Approaches that didn't work, errors encountered]

**Missing Context**:
- [Information that would have been helpful to know upfront]
- [Gaps in CLAUDE.md or documentation]

**Recommendations**:
- [Suggestions for improving CLAUDE.md, setup docs, or workflow]

---
```

## Task Notes

### 2026-01-09 - Fixed Microsoft OAuth Login Issues

**Task**: Resolved authentication issues preventing users from logging in via Microsoft OAuth and accessing the dashboard.

**What Worked**:
- Checking terminal logs revealed the root cause (`Invalid API key` error)
- Comparing environment variables found placeholder values still in use
- Sequential fixing: URL first, then API key
- Restarting dev server after each environment change to reload variables
- Using `grep` to check `.env.local` values with full permissions

**What Failed**:
- Initial attempts to access `.env.local` without proper permissions (sandboxing issues)
- OAuth was partially configured but missing critical client-side environment variables

**Missing Context**:
- `.env.local` file had placeholder values that weren't obvious from error messages
- The distinction between `SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` wasn't clear
  - Frontend uses `NEXT_PUBLIC_*` variables for client-side code
  - Backend uses non-prefixed variables
- Microsoft OAuth specifically requires the client-side `NEXT_PUBLIC_SUPABASE_ANON_KEY` to exchange auth codes

**Recommendations**:
- Add to CLAUDE.md: "Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required for OAuth"
- Consider adding a startup check that validates required environment variables
- Document that `.env.local` placeholders like `your-project.supabase.co` will cause DNS errors

---

### 2026-01-09 - Created Git Branch 'agents' from 'chatbot'

**Task**: Created a new git branch called 'agents' based on the 'chatbot' branch for new feature development.

**What Worked**:
- Simple `git checkout -b agents` command worked perfectly
- User was already on chatbot branch, making it straightforward

**What Failed**:
- Initial git fetch attempts hit network/certificate issues in sandbox
- Wasn't necessary anyway since branch already existed locally

**Missing Context**:
- None - straightforward task

**Recommendations**:
- None needed

---

### 2026-01-09 - Started Development Server & Resolved Dependencies

**Task**: Started the localhost development server for the Next.js application.

**What Worked**:
- Running `pnpm install` with `required_permissions: ["all"]` to bypass symlink restrictions
- Starting server in background with `is_background: true`
- Port 3000 conflicts resolved with `lsof -ti:3000 | xargs kill -9`

**What Failed**:
- First install attempt failed due to sandbox symlink restrictions (EPERM errors)
- Initial dev server start had network interface errors (`uv_interface_addresses`) but server still ran
- Multiple attempts needed due to port conflicts from previous instances

**Missing Context**:
- Sandbox restrictions on symlinks require `all` permissions for `pnpm install`
- Next.js network interface errors are non-fatal warnings, server still works
- Port conflicts common when restarting dev server

**Recommendations**:
- Add to progressive disclosure: Document about running dev server and handling port conflicts
- Could create a helper script to check/kill port 3000 before starting

---

### 2026-01-09 - Built Budget Planning Agent (AI Account Workflow)

**Task**: Implemented the second agent - Budget Planning - that generates project budgets from PDF briefings.

**What Worked**:
- Following the same patterns established with Corvee Schema Generator
- PDF upload with drag & drop using native browser APIs (no new dependencies)
- FormData submission for file upload to n8n webhook
- Flexible response handling (JSON or Markdown)
- Word export reusing docx/file-saver packages already installed

**Files Created**:
- `app/api/agents/budget/route.ts` - API route with FormData handling, file validation
- `components/agents/budget/pdf-upload.tsx` - Drag & drop PDF upload component
- `components/agents/budget/budget-form.tsx` - Main form with upload + generate
- `components/agents/budget/budget-result.tsx` - Result display with Word export
- `app/agents/budget/page.tsx` - Budget Planning page

**Files Updated**:
- `.env.local` - Added `N8N_BUDGET_WEBHOOK_URL`
- `components/agents/agents-sidebar.tsx` - Enabled Budget link
- `app/agents/page.tsx` - Activated Budget card

**What Failed**:
- None - reused patterns from Corvee implementation

**Missing Context**:
- n8n response format unknown (built flexible handler for JSON or text)
- No sample PDF briefings available for testing

**Recommendations**:
- Test with actual PDF briefing to verify n8n integration
- May need to adjust Word export format based on actual budget data structure
- Consider adding project name input field if n8n needs it

---

### 2026-01-09 - Fixed Budget Planning Response Parsing

**Task**: Fixed Budget Planning agent displaying raw JSON instead of formatted markdown content.

**What Worked**:
- Reading the actual n8n response format from the user's screenshot
- Identified that n8n returns `{ success: true, text: "markdown" }` not `{ budget: "markdown" }`
- Simple fix: added `data.text` as first fallback option

**What Failed**:
- Initial code assumed response would have `budget` field, causing fallback to `JSON.stringify()`

**Missing Context**:
- n8n response format wasn't documented in SKILL.md
- Response format: `{ success: true, text: "# Markdown content..." }`

**Recommendations**:
- Document n8n response formats in SKILL.md for each webhook
- Consider standardizing response formats across n8n webhooks

---

### 2026-01-09 - Built AI Agents Module (Corvee Schema Generator)

**Task**: Implemented the AI Agents module for OnBrand 2.0, including the Corvee Schema Generator feature with both standalone and dashboard-integrated navigation.

**What Worked**:
- Planning phase with user questions clarified requirements upfront (navigation, database, n8n status)
- Following existing patterns from dashboard layout and n8n integration
- Using existing UI components (Select, Card, Button, etc.) - no new dependencies needed
- Dual Supabase setup (main app + Simplicate) cleanly separated in `simplicate-client.ts`
- Dutch language UI for ACT Agency context

**Files Created**:
- `lib/supabase/simplicate-client.ts` - Dual database client
- `app/api/agents/corvee/route.ts` - API route proxying to n8n
- `components/agents/corvee/week-picker.tsx` - Week selector using date-fns
- `components/agents/corvee/corvee-form.tsx` - Main form with loading states
- `components/agents/corvee/corvee-result.tsx` - Markdown display with copy/print
- `components/agents/agents-sidebar.tsx` - Standalone agents navigation
- `app/agents/layout.tsx` - Standalone layout with auth
- `app/agents/page.tsx` - Overview with agent cards
- `app/agents/corvee/page.tsx` - Corvee generator page
- `app/dashboard/agents/page.tsx` - Redirect to /agents

**What Failed**:
- None - implementation went smoothly following existing patterns

**Missing Context**:
- SKILL.md was comprehensive and well-documented
- n8n webhooks were already deployed, making integration straightforward
- Existing codebase had all needed patterns (n8n proxy, sidebar, layout)

**Recommendations**:
- Add `N8N_CORVEE_WEBHOOK_URL` to production environment variables
- Test with actual n8n webhook once URL is configured
- Budget Planning can follow same pattern for Phase 2

---

### 2026-01-09 - Created Optimized CLAUDE.md

**Task**: Created a CLAUDE.md file following best practices from HumanLayer article.

**What Worked**:
- Reading multiple setup documents to understand project scope
- Applying "less is more" principle (kept under 160 lines, well under 300 limit)
- Using progressive disclosure pattern with pointers to detailed docs
- WHAT/WHY/HOW structure for onboarding
- Including only universally applicable instructions

**What Failed**:
- None

**Missing Context**:
- HumanLayer article was provided by user with excellent guidelines
- Project had comprehensive Setup/ documentation to reference

**Recommendations**:
- Maintain CLAUDE.md strictly - resist adding task-specific instructions
- When team members want to add instructions, point them to create separate docs in `Setup/` instead
- Periodically review CLAUDE.md to ensure it stays concise and universally applicable

---

## Patterns & Learnings

### Environment Variables
- Always check for placeholder values in `.env.local` (common issue)
- `NEXT_PUBLIC_*` variables are for client-side code (browser)
- Non-prefixed variables are for server-side/build-time code
- Restart dev server after any `.env.local` changes

### Git Operations
- Check for existing branches before creating new ones
- Network issues in sandbox may require `required_permissions: ["all"]`

### Package Management
- Always use `pnpm` (not npm/yarn) in this project
- Symlink operations need `required_permissions: ["all"]`
- Port conflicts are common - kill processes on 3000 before starting

### Development Server
- Terminal logs are invaluable for debugging (check terminals/*.txt files)
- Background processes: `is_background: true` for long-running commands
- Network interface errors from Next.js are usually non-fatal

---

## Future Task Template

Copy this template when adding new notes:

```markdown
### [YYYY-MM-DD] - [Task Title]

**Task**: [1-2 sentence description of what was done]

**What Worked**:
- [List successful approaches]

**What Failed**:
- [List failed approaches or obstacles]

**Missing Context**:
- [Information that would have helped]

**Recommendations**:
- [How to improve workflow/docs]

---
```

