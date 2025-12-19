# MCP (Model Context Protocol) Integration Guide

This guide explains how to use the MCP integration in the ACT 2.0 chat system.

## Overview

MCP (Model Context Protocol) is an open standard that allows AI assistants to connect to external tools and services. With this integration, your chat AI can:

- Execute external API calls
- Access databases
- Run code
- Interact with third-party services
- And much more...

## Setup

### 1. Run the Database Migration

First, create the `mcp_servers` table in your Supabase database:

```bash
# From the project root
cd /Users/dwayne/Documents/ACT/Onbrand.2.0

# Push the migration to your database
supabase db push
```

Or run the migration manually in Supabase SQL Editor:

```sql
-- Copy contents from:
-- supabase/migrations/20251219100000_create_mcp_servers_table.sql
```

### 2. Install Dependencies (Already Done)

The `@ai-sdk/mcp` package has already been installed:

```bash
pnpm add @ai-sdk/mcp
```

### 3. Access the Settings Page

Navigate to the brand settings page to configure MCP servers:

```
/brand/[your-brand-name]/settings
```

Then click on "MCP Servers" in the sidebar.

## Using the MCP Server Manager

### Adding an MCP Server

1. Click **"Add Server"** button
2. Fill in the required fields:
   - **Server Name**: A friendly name for the server
   - **Description**: What tools this server provides
   - **Transport Type**: Choose HTTP (recommended) or SSE
   - **Server URL**: The MCP server endpoint (e.g., `https://your-mcp-server.com/mcp`)
   - **Authentication**: Choose None, Bearer Token, or API Key
3. Click **"Add Server"**

### Testing a Connection

Click the **test tube icon** next to any server to verify the connection. If successful, you'll see:
- Connection status
- Number of available tools
- List of tool names

### Enabling/Disabling Servers

Click the **power icon** to toggle a server on/off. Disabled servers won't be used in chat.

### Deleting a Server

Click the **trash icon** to remove a server.

## How It Works in Chat

When a user sends a message in the chat:

1. The system fetches all enabled MCP servers for the brand
2. Connects to each server and retrieves available tools
3. Tools are passed to the AI model via `streamText({ tools: mcpTools })`
4. The AI can use these tools to answer questions or perform actions
5. After the response completes, connections are cleaned up

### Example Chat Flow

**User**: "What's the weather in San Francisco?"

**AI** (with weather MCP server):
1. Recognizes it needs weather data
2. Calls the `get_weather` tool from the MCP server
3. Receives weather data
4. Formats and returns the response to the user

## API Reference

### Endpoints

#### List MCP Servers
```http
GET /api/mcp/servers?brandId={brandId}
```

#### Create MCP Server
```http
POST /api/mcp/servers
Content-Type: application/json

{
  "brandId": "uuid",
  "name": "Weather API",
  "description": "Provides weather information",
  "transport_type": "http",
  "url": "https://weather-mcp.example.com/mcp",
  "auth_type": "bearer",
  "auth_token": "your-api-key"
}
```

#### Update MCP Server
```http
PATCH /api/mcp/servers
Content-Type: application/json

{
  "serverId": "uuid",
  "enabled": false
}
```

#### Delete MCP Server
```http
DELETE /api/mcp/servers?serverId={serverId}
```

#### Test Connection
```http
POST /api/mcp/test
Content-Type: application/json

{
  "server": {
    "transport_type": "http",
    "url": "https://weather-mcp.example.com/mcp",
    "auth_type": "bearer",
    "auth_token_encrypted": "your-api-key"
  }
}
```

## React Hook Usage

Use the `useMCPServers` hook in your components:

```tsx
import { useMCPServers } from '@/lib/mcp';

function MyComponent({ brandId }: { brandId: string }) {
  const {
    servers,
    isLoading,
    error,
    createServer,
    updateServer,
    deleteServer,
    testConnection,
  } = useMCPServers({ brandId });

  // Your component logic
}
```

## Creating Your Own MCP Server

MCP servers can be built in any language. Here's a simple example using Node.js:

```typescript
// Example MCP server with HTTP transport
import express from 'express';

const app = express();
app.use(express.json());

// MCP endpoint
app.post('/mcp', (req, res) => {
  const { method, params } = req.body;

  switch (method) {
    case 'tools/list':
      return res.json({
        tools: [
          {
            name: 'get_weather',
            description: 'Get current weather for a location',
            inputSchema: {
              type: 'object',
              properties: {
                location: { type: 'string', description: 'City name' }
              },
              required: ['location']
            }
          }
        ]
      });

    case 'tools/call':
      if (params.name === 'get_weather') {
        // Fetch real weather data here
        return res.json({
          result: {
            temperature: 72,
            condition: 'Sunny',
            location: params.arguments.location
          }
        });
      }
      break;
  }

  res.status(400).json({ error: 'Unknown method' });
});

app.listen(3001, () => {
  console.log('MCP server running on http://localhost:3001/mcp');
});
```

## Popular MCP Servers

Here are some popular MCP servers you can connect to:

- **GitHub MCP** - Interact with GitHub repositories
- **Slack MCP** - Send and read Slack messages
- **Google Drive MCP** - Access Google Drive files
- **Database MCP** - Query databases (PostgreSQL, MySQL, etc.)
- **Web Search MCP** - Search the web

Visit [modelcontextprotocol.io](https://modelcontextprotocol.io) for more MCP servers.

## Security Considerations

1. **Token Storage**: Auth tokens are stored encrypted in the database
2. **RLS Policies**: Only brand admins can manage MCP servers
3. **Connection Validation**: Always test connections before enabling
4. **Tool Filtering**: Use `allowed_tools` and `blocked_tools` to restrict which tools are available
5. **Timeout Configuration**: Set appropriate timeouts for tool calls

## Troubleshooting

### "Connection failed" Error
- Verify the server URL is correct and accessible
- Check that the server supports the selected transport type
- Verify authentication credentials

### Tools Not Available in Chat
- Ensure the server is enabled
- Check server priority (higher priority = loaded first)
- Verify the tools aren't in the blocked list

### Slow Response Times
- Reduce the number of connected MCP servers
- Increase the timeout setting
- Use HTTP transport instead of SSE for better performance

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Chat UI       │────▶│   Chat API       │────▶│   AI Model      │
│                 │     │   /api/chat      │     │   (Claude/GPT)  │
└─────────────────┘     └────────┬─────────┘     └────────┬────────┘
                                 │                        │
                                 ▼                        ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │  MCP Client      │◀────│  Tool Calls     │
                        │  Manager         │     │                 │
                        └────────┬─────────┘     └─────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
     ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
     │  MCP Server 1   │ │  MCP Server 2   │ │  MCP Server N   │
     │  (Weather)      │ │  (GitHub)       │ │  (Custom)       │
     └─────────────────┘ └─────────────────┘ └─────────────────┘
```

## File Reference

| File | Description |
|------|-------------|
| `supabase/migrations/20251219100000_create_mcp_servers_table.sql` | Database schema |
| `lib/mcp/types.ts` | TypeScript types |
| `lib/mcp/client-manager.ts` | MCP connection manager |
| `lib/mcp/use-mcp-servers.ts` | React hook |
| `app/api/mcp/servers/route.ts` | CRUD API endpoints |
| `app/api/mcp/test/route.ts` | Connection test endpoint |
| `app/api/chat/route.ts` | Chat API with MCP integration |
| `components/mcp/mcp-server-manager.tsx` | Management UI |
| `app/brand/[brandName]/settings/page.tsx` | Settings page |
