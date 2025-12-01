# Edge Functions Deployment Guide

## Functions Created

### 1. **AI Proxy Functions** (Secure API Keys)
- `openai-proxy` - Proxy OpenAI API requests
- `anthropic-proxy` - Proxy Anthropic/Claude API requests  
- `replicate-proxy` - Proxy Replicate API requests

### 2. **RAG Functions** (Document Processing)
- `process-document` - Extract text, chunk, and create embeddings
- `search-documents` - Semantic search across brand documents

### 3. **n8n Integration**
- `trigger-workflow` - Trigger n8n workflows with validation

---

## Deployment Steps

### 1. Set Secrets

```bash
# Navigate to project root
cd /Users/dwayne/Documents/Playground/Onbrand.2.0

# Set all required secrets
supabase secrets set SUPABASE_URL=https://pyvobennsmzyvtaceopn.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
supabase secrets set SUPABASE_ANON_KEY=your_anon_key
supabase secrets set OPENAI_API_KEY=your_openai_key
supabase secrets set ANTHROPIC_API_KEY=your_anthropic_key
supabase secrets set REPLICATE_API_TOKEN=your_replicate_token
supabase secrets set N8N_API_KEY=your_n8n_key

# Verify secrets
supabase secrets list
```

### 2. Deploy Functions

```bash
# Deploy all functions
supabase functions deploy openai-proxy
supabase functions deploy anthropic-proxy
supabase functions deploy replicate-proxy
supabase functions deploy process-document
supabase functions deploy search-documents
supabase functions deploy trigger-workflow
```

### 3. Function URLs

After deployment, your functions will be available at:

```
https://pyvobennsmzyvtaceopn.functions.supabase.co/openai-proxy
https://pyvobennsmzyvtaceopn.functions.supabase.co/anthropic-proxy
https://pyvobennsmzyvtaceopn.functions.supabase.co/replicate-proxy
https://pyvobennsmzyvtaceopn.functions.supabase.co/process-document
https://pyvobennsmzyvtaceopn.functions.supabase.co/search-documents
https://pyvobennsmzyvtaceopn.functions.supabase.co/trigger-workflow
```

---

## Usage Examples

### OpenAI Proxy

```typescript
const response = await fetch(
  'https://pyvobennsmzyvtaceopn.functions.supabase.co/openai-proxy',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: 'Hello!' }
      ],
    }),
  }
);
```

### Process Document

```typescript
const response = await fetch(
  'https://pyvobennsmzyvtaceopn.functions.supabase.co/process-document',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      document_id: 'uuid-here',
      brand_id: 'act',
      content: 'Full document text...',
    }),
  }
);
```

### Search Documents

```typescript
const response = await fetch(
  'https://pyvobennsmzyvtaceopn.functions.supabase.co/search-documents',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'What are our brand colors?',
      brand_id: 'act',
      match_threshold: 0.7,
      match_count: 5,
    }),
  }
);
```

### Trigger Workflow

```typescript
const response = await fetch(
  'https://pyvobennsmzyvtaceopn.functions.supabase.co/trigger-workflow',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      brand_id: 'act',
      workflow_type: 'content_generation',
      data: {
        topic: 'AI in Marketing',
        content_type: 'blog_post',
      },
    }),
  }
);
```

---

## Local Testing

### 1. Create Local Env File

```bash
# Create supabase/.env
cat > supabase/.env << EOF
SUPABASE_URL=https://pyvobennsmzyvtaceopn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
REPLICATE_API_TOKEN=your_replicate_token
N8N_API_KEY=your_n8n_key
EOF
```

### 2. Serve Locally

```bash
supabase functions serve --env-file ./supabase/.env
```

### 3. Test Locally

```bash
# Test OpenAI proxy
curl -i http://localhost:54321/functions/v1/openai-proxy \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hello"}]}'
```

---

## Security Notes

- ✅ All functions require JWT authentication
- ✅ API keys are server-side only
- ✅ User verification on every request
- ✅ Brand isolation enforced
- ✅ CORS configured for browser access

---

## Monitoring

View logs in Supabase Dashboard:
1. Go to Edge Functions
2. Select function
3. View Logs tab

---

## Troubleshooting

### 401 Unauthorized
- Missing or invalid Authorization header
- User token expired

### 500 Internal Error
- Check secrets are set correctly
- View function logs for details

### CORS Error
- Functions include CORS headers
- Check browser console for details

---

## Next Steps

1. Deploy all functions
2. Test each endpoint
3. Integrate into frontend
4. Monitor usage and errors

**Status:** Ready to deploy  
**Created:** December 1, 2025
