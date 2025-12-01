# n8n Workflow Examples - Multiple Workflows Per Brand

## Overview

Each brand can have **multiple n8n workflows**, each with its own unique webhook URL. This guide shows how to set up and manage multiple workflows.

---

## Architecture

```
Brand: ACME
├── Workflow 1: Content Generator
│   └── Webhook: https://n8n.cloud/webhook/acme-content-gen-abc123
├── Workflow 2: Social Media Poster
│   └── Webhook: https://n8n.cloud/webhook/acme-social-post-def456
├── Workflow 3: Email Campaign
│   └── Webhook: https://n8n.cloud/webhook/acme-email-campaign-ghi789
└── Workflow 4: Brand Analytics
    └── Webhook: https://n8n.cloud/webhook/acme-analytics-jkl012

Brand: Globex
├── Workflow 1: Content Generator
│   └── Webhook: https://n8n.cloud/webhook/globex-content-gen-xyz789
├── Workflow 2: Customer Onboarding
│   └── Webhook: https://n8n.cloud/webhook/globex-onboarding-uvw456
└── ...
```

**Key Points:**
- Each workflow has a **unique webhook URL**
- Workflows are stored in the database with their webhook URLs
- Trigger workflows by looking up their webhook URL from the database

---

## Setup Process

### 1. Create Workflow in n8n

For each workflow you want to create:

1. **Create new workflow** in n8n
2. **Add Webhook trigger node**
   - Method: `POST`
   - Path: `/acme-content-generator` (unique per workflow)
   - Response Mode: `On Received`
3. **Copy the webhook URL** (e.g., `https://your-n8n.cloud/webhook/acme-content-generator`)
4. **Build your workflow** (add nodes for your logic)
5. **Activate the workflow**

### 2. Register Workflow in Database

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Register Content Generator workflow for ACME
await supabase.from('n8n_workflows').insert({
  brand_id: 'acme',
  workflow_id: 'content-generator-acme',
  workflow_name: 'Content Generator',
  description: 'Generate blog posts, social media content, and marketing copy',
  webhook_url: 'https://your-n8n.cloud/webhook/acme-content-generator',
  webhook_method: 'POST',
  workflow_type: 'content_generation',
  is_active: true,
  tags: ['content', 'ai', 'marketing'],
});

// Register Social Media Poster workflow for ACME
await supabase.from('n8n_workflows').insert({
  brand_id: 'acme',
  workflow_id: 'social-poster-acme',
  workflow_name: 'Social Media Poster',
  description: 'Post content to Twitter, LinkedIn, and Facebook',
  webhook_url: 'https://your-n8n.cloud/webhook/acme-social-poster',
  webhook_method: 'POST',
  workflow_type: 'social_posting',
  is_active: true,
  tags: ['social', 'automation'],
});

// Register Email Campaign workflow for ACME
await supabase.from('n8n_workflows').insert({
  brand_id: 'acme',
  workflow_id: 'email-campaign-acme',
  workflow_name: 'Email Campaign Manager',
  description: 'Send targeted email campaigns to subscribers',
  webhook_url: 'https://your-n8n.cloud/webhook/acme-email-campaign',
  webhook_method: 'POST',
  workflow_type: 'email_campaign',
  is_active: true,
  tags: ['email', 'marketing'],
});
```

---

## Triggering Workflows

### Method 1: Using the API Route (Recommended)

```typescript
// Trigger by workflow type
const response = await fetch('/api/n8n/trigger', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    brand_id: 'acme',
    workflow_type: 'content_generation',
    data: {
      topic: 'AI in Marketing',
      content_type: 'blog_post',
      tone: 'professional',
    },
  }),
});

// Or trigger by workflow name
const response = await fetch('/api/n8n/trigger', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    brand_id: 'acme',
    workflow_name: 'Social Media Poster',
    data: {
      platforms: ['twitter', 'linkedin'],
      content: 'Check out our new product! 🚀',
    },
  }),
});
```

### Method 2: Direct Webhook Call

```typescript
// Look up workflow from database
const { data: workflow } = await supabase
  .from('n8n_workflows')
  .select('*')
  .eq('brand_id', 'acme')
  .eq('workflow_type', 'content_generation')
  .single();

// Trigger using its specific webhook URL
const response = await fetch(workflow.webhook_url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    brand_id: 'acme',
    topic: 'AI in Marketing',
  }),
});
```

---

## Example Workflows

### 1. Content Generator Workflow

**n8n Workflow:**
```
Webhook → Fetch Brand Guidelines → OpenAI (Generate) → Format → Save to DB → Response
```

**Registration:**
```typescript
{
  brand_id: 'acme',
  workflow_name: 'Content Generator',
  webhook_url: 'https://n8n.cloud/webhook/acme-content-gen',
  workflow_type: 'content_generation'
}
```

**Trigger:**
```typescript
await fetch('/api/n8n/trigger', {
  method: 'POST',
  body: JSON.stringify({
    brand_id: 'acme',
    workflow_type: 'content_generation',
    data: {
      content_type: 'blog_post',
      topic: 'Product Launch',
      keywords: ['innovation', 'technology'],
    },
  }),
});
```

### 2. Social Media Poster Workflow

**n8n Workflow:**
```
Webhook → Format for Each Platform → Twitter API → LinkedIn API → Facebook API → Log Results
```

**Registration:**
```typescript
{
  brand_id: 'acme',
  workflow_name: 'Social Media Poster',
  webhook_url: 'https://n8n.cloud/webhook/acme-social-post',
  workflow_type: 'social_posting'
}
```

**Trigger:**
```typescript
await fetch('/api/n8n/trigger', {
  method: 'POST',
  body: JSON.stringify({
    brand_id: 'acme',
    workflow_type: 'social_posting',
    data: {
      content: 'Exciting news! 🎉',
      platforms: ['twitter', 'linkedin'],
      schedule_time: '2025-12-02T10:00:00Z',
    },
  }),
});
```

### 3. Email Campaign Workflow

**n8n Workflow:**
```
Webhook → Fetch Recipients → Personalize Email → Resend API → Track Opens → Update DB
```

**Registration:**
```typescript
{
  brand_id: 'acme',
  workflow_name: 'Email Campaign Manager',
  webhook_url: 'https://n8n.cloud/webhook/acme-email-campaign',
  workflow_type: 'email_campaign'
}
```

**Trigger:**
```typescript
await fetch('/api/n8n/trigger', {
  method: 'POST',
  body: JSON.stringify({
    brand_id: 'acme',
    workflow_type: 'email_campaign',
    data: {
      campaign_name: 'Product Launch',
      template: 'launch_announcement',
      segment: 'premium_users',
    },
  }),
});
```

### 4. Brand Analytics Workflow

**n8n Workflow:**
```
Schedule (Daily) → Fetch Social Mentions → Analyze Sentiment → Generate Report → Email to Team
```

**Registration:**
```typescript
{
  brand_id: 'acme',
  workflow_name: 'Daily Brand Analytics',
  webhook_url: 'https://n8n.cloud/webhook/acme-analytics',
  workflow_type: 'brand_analysis'
}
```

**Trigger:**
```typescript
await fetch('/api/n8n/trigger', {
  method: 'POST',
  body: JSON.stringify({
    brand_id: 'acme',
    workflow_type: 'brand_analysis',
    data: {
      date_range: 'last_7_days',
      metrics: ['sentiment', 'reach', 'engagement'],
    },
  }),
});
```

---

## List Available Workflows

```typescript
// Get all active workflows for a brand
const response = await fetch('/api/n8n/trigger?brand_id=acme');
const { workflows } = await response.json();

console.log(workflows);
// [
//   {
//     id: 'uuid-1',
//     name: 'Content Generator',
//     type: 'content_generation',
//     trigger_count: 42,
//     last_triggered_at: '2025-12-01T14:30:00Z'
//   },
//   {
//     id: 'uuid-2',
//     name: 'Social Media Poster',
//     type: 'social_posting',
//     trigger_count: 18,
//     last_triggered_at: '2025-12-01T12:00:00Z'
//   },
//   ...
// ]
```

---

## Managing Multiple Workflows

### Activate/Deactivate Workflows

```typescript
// Deactivate a workflow
await supabase
  .from('n8n_workflows')
  .update({ is_active: false })
  .eq('id', workflowId);

// Reactivate
await supabase
  .from('n8n_workflows')
  .update({ is_active: true })
  .eq('id', workflowId);
```

### Update Webhook URL

```typescript
// If you recreate a workflow in n8n, update its webhook URL
await supabase
  .from('n8n_workflows')
  .update({ webhook_url: 'https://n8n.cloud/webhook/new-url' })
  .eq('id', workflowId);
```

### Track Usage

```typescript
// Get workflow statistics
const { data: stats } = await supabase
  .from('n8n_workflows')
  .select('workflow_name, trigger_count, last_triggered_at')
  .eq('brand_id', 'acme')
  .order('trigger_count', { ascending: false });
```

---

## Best Practices

### 1. **Naming Convention**
Use consistent naming for webhook paths:
- `{brand}-{workflow-type}-{unique-id}`
- Example: `acme-content-gen-abc123`

### 2. **Workflow Organization**
Group workflows by type:
- Content workflows
- Marketing workflows
- Analytics workflows
- Automation workflows

### 3. **Webhook Security**
- Use unique, hard-to-guess webhook paths
- Validate incoming data
- Use API keys for authentication

### 4. **Error Handling**
Each workflow should:
- Catch errors gracefully
- Send error notifications
- Log failures to the database

### 5. **Testing**
- Test each workflow individually
- Use test data before production
- Monitor execution logs

---

## Summary

✅ **Each workflow has its own unique webhook URL**  
✅ **Workflows are stored in the database per brand**  
✅ **Trigger workflows by looking up their webhook URL**  
✅ **Track all executions and results**  
✅ **Complete brand isolation**

**Your n8n setup supports unlimited workflows per brand!** 🚀
