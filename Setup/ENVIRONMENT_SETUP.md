# Environment Setup Guide

## Overview

The ACT 2.0 platform supports three environments:
- **Development** - Local development
- **Staging** - Pre-production testing
- **Production** - Live production

## Environment Files

### `.env.local` (Development)
```bash
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### `.env.staging` (Staging)
```bash
NODE_ENV=staging
NEXT_PUBLIC_APP_ENV=staging
NEXT_PUBLIC_APP_URL=https://staging.actonbrand.com
```

### `.env.production` (Production)
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_APP_URL=https://actonbrand.com
```

## Environment Variables

### Required for All Environments

#### Supabase
```bash
SUPABASE_URL=https://pyvobennsmzyvtaceopn.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_FUNCTIONS_URL=https://pyvobennsmzyvtaceopn.functions.supabase.co
```

#### AI Services
```bash
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
REPLICATE_API_TOKEN=r8_...
```

#### Email & Analytics
```bash
RESEND_API_KEY=re_...
SOCIAL_ANALYTICS_KEY=sk_...
GETLATE_API_URL=https://api.getlate.dev
```

#### n8n Workflows
```bash
N8N_API_KEY=your_n8n_key
N8N_BASE_URL=https://your-instance.n8n.cloud
```

#### Public Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=https://pyvobennsmzyvtaceopn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APP_ENV=development|staging|production
NEXT_PUBLIC_APP_URL=your_app_url
```

## Running Different Environments

### Development
```bash
# Run development server
pnpm dev

# Or explicitly
NODE_ENV=development pnpm dev
```

### Staging
```bash
# Run with staging environment
pnpm dev:staging

# Build for staging
pnpm build:staging
```

### Production
```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## Environment Detection in Code

Use the environment utilities from `@act/auth`:

```typescript
import { 
  getAppEnv, 
  isDevelopment, 
  isStaging, 
  isProduction,
  getEnvConfig 
} from '@act/auth';

// Check environment
if (isDevelopment()) {
  console.log('Running in development');
}

if (isStaging()) {
  console.log('Running in staging');
}

if (isProduction()) {
  console.log('Running in production');
}

// Get full config
const config = getEnvConfig();
console.log('Environment:', config.env);
console.log('App URL:', config.appUrl);
```

## Environment-Specific Behavior

### API Endpoints
```typescript
import { getAppUrl } from '@act/auth';

const apiUrl = `${getAppUrl()}/api/endpoint`;
```

### Feature Flags
```typescript
import { isDevelopment, isProduction } from '@act/auth';

// Enable debug mode in development
const DEBUG = isDevelopment();

// Enable analytics in production only
const ENABLE_ANALYTICS = isProduction();
```

### Error Reporting
```typescript
import { isProduction } from '@act/auth';

if (isProduction()) {
  // Send to error tracking service
  Sentry.captureException(error);
} else {
  // Log to console
  console.error(error);
}
```

## Deployment

### Vercel/Netlify

Set environment variables in your deployment platform:

**Development Preview:**
- `NODE_ENV=development`
- `NEXT_PUBLIC_APP_ENV=development`

**Staging:**
- `NODE_ENV=staging`
- `NEXT_PUBLIC_APP_ENV=staging`
- `NEXT_PUBLIC_APP_URL=https://staging.actonbrand.com`

**Production:**
- `NODE_ENV=production`
- `NEXT_PUBLIC_APP_ENV=production`
- `NEXT_PUBLIC_APP_URL=https://actonbrand.com`

## Security Best Practices

1. **Never commit `.env.local`, `.env.staging`, or `.env.production`**
   - These files are in `.gitignore`
   - Only commit `.env.example`

2. **Use different API keys per environment**
   - Development: Test/sandbox keys
   - Staging: Separate staging keys
   - Production: Production keys

3. **Rotate keys regularly**
   - Especially after team member changes
   - If keys are accidentally exposed

4. **Use environment variables for secrets**
   - Never hardcode API keys
   - Use `process.env.VARIABLE_NAME`

## Troubleshooting

### Environment not detected correctly
```bash
# Check NODE_ENV
echo $NODE_ENV

# Check Next.js public variables
console.log(process.env.NEXT_PUBLIC_APP_ENV);
```

### Variables not loading
1. Restart dev server after changing `.env` files
2. Check variable names start with `NEXT_PUBLIC_` for client-side
3. Verify `.env` file is in project root

### Different behavior in production
1. Check `NODE_ENV` is set correctly
2. Verify all required env variables are set
3. Check build logs for missing variables

## Environment Checklist

### Development Setup
- [ ] Copy `.env.example` to `.env.local`
- [ ] Fill in all API keys
- [ ] Set `NODE_ENV=development`
- [ ] Set `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- [ ] Test with `pnpm dev`

### Staging Setup
- [ ] Create `.env.staging`
- [ ] Use staging API keys
- [ ] Set `NODE_ENV=staging`
- [ ] Set staging URL
- [ ] Deploy to staging environment

### Production Setup
- [ ] Create `.env.production`
- [ ] Use production API keys
- [ ] Set `NODE_ENV=production`
- [ ] Set production URL
- [ ] Deploy to production environment

## Next Steps

1. Set up environment variables for your environment
2. Test environment detection with `getEnvConfig()`
3. Configure deployment platform with env variables
4. Set up monitoring and error tracking per environment

---

**Status:** Environment configuration complete  
**Created:** December 1, 2025
