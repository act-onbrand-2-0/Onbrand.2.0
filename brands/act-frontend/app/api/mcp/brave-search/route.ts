import { type NextRequest, NextResponse } from 'next/server';

/**
 * Brave Search MCP Proxy
 * 
 * This proxies MCP requests to the Brave Search API.
 * 
 * To use:
 * 1. Get a free API key from https://brave.com/search/api/
 * 2. Add this server in Settings > MCP Servers:
 *    - URL: http://localhost:3000/api/mcp/brave-search
 *    - Auth: Bearer Token
 *    - Token: Your Brave API key
 */

export const dynamic = 'force-dynamic';

const BRAVE_API_BASE = 'https://api.search.brave.com/res/v1';

// Tool definitions
const TOOLS = [
  {
    name: 'brave_web_search',
    description: 'Search the web using Brave Search. Returns web pages, snippets, and information from across the internet.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
        count: {
          type: 'number',
          description: 'Number of results to return (default: 10, max: 20)',
        },
        freshness: {
          type: 'string',
          enum: ['pd', 'pw', 'pm', 'py'],
          description: 'Filter by freshness: pd=past day, pw=past week, pm=past month, py=past year',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'brave_news_search',
    description: 'Search for news articles using Brave Search.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The news search query',
        },
        count: {
          type: 'number',
          description: 'Number of results to return (default: 10, max: 20)',
        },
        freshness: {
          type: 'string',
          enum: ['pd', 'pw', 'pm'],
          description: 'Filter by freshness: pd=past day, pw=past week, pm=past month',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'brave_image_search',
    description: 'Search for images using Brave Search.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The image search query',
        },
        count: {
          type: 'number',
          description: 'Number of results to return (default: 10, max: 20)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'brave_video_search',
    description: 'Search for videos using Brave Search.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The video search query',
        },
        count: {
          type: 'number',
          description: 'Number of results to return (default: 10, max: 20)',
        },
      },
      required: ['query'],
    },
  },
];

// Tool implementations
async function braveWebSearch(
  apiKey: string,
  args: { query: string; count?: number; freshness?: string }
) {
  const params = new URLSearchParams({
    q: args.query,
    count: String(args.count || 10),
  });
  if (args.freshness) params.set('freshness', args.freshness);

  const response = await fetch(`${BRAVE_API_BASE}/web/search?${params}`, {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Brave API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  // Format results
  const results = data.web?.results?.map((r: any) => ({
    title: r.title,
    url: r.url,
    description: r.description,
  })) || [];

  return {
    query: args.query,
    total_results: data.web?.total || 0,
    results: results.slice(0, args.count || 10),
  };
}

async function braveNewsSearch(
  apiKey: string,
  args: { query: string; count?: number; freshness?: string }
) {
  const params = new URLSearchParams({
    q: args.query,
    count: String(args.count || 10),
  });
  if (args.freshness) params.set('freshness', args.freshness);

  const response = await fetch(`${BRAVE_API_BASE}/news/search?${params}`, {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Brave API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  const results = data.results?.map((r: any) => ({
    title: r.title,
    url: r.url,
    description: r.description,
    source: r.meta_url?.hostname,
    age: r.age,
  })) || [];

  return {
    query: args.query,
    results: results.slice(0, args.count || 10),
  };
}

async function braveImageSearch(
  apiKey: string,
  args: { query: string; count?: number }
) {
  const params = new URLSearchParams({
    q: args.query,
    count: String(args.count || 10),
  });

  const response = await fetch(`${BRAVE_API_BASE}/images/search?${params}`, {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Brave API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  const results = data.results?.map((r: any) => ({
    title: r.title,
    url: r.url,
    thumbnail: r.thumbnail?.src,
    source: r.source,
  })) || [];

  return {
    query: args.query,
    results: results.slice(0, args.count || 10),
  };
}

async function braveVideoSearch(
  apiKey: string,
  args: { query: string; count?: number }
) {
  const params = new URLSearchParams({
    q: args.query,
    count: String(args.count || 10),
  });

  const response = await fetch(`${BRAVE_API_BASE}/videos/search?${params}`, {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Brave API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  const results = data.results?.map((r: any) => ({
    title: r.title,
    url: r.url,
    description: r.description,
    thumbnail: r.thumbnail?.src,
    duration: r.video?.duration,
  })) || [];

  return {
    query: args.query,
    results: results.slice(0, args.count || 10),
  };
}

// Main handler
export async function POST(req: NextRequest) {
  try {
    // Parse body first to get the request id
    const body = await req.json();
    console.log('Brave MCP - Raw request body:', JSON.stringify(body));
    
    const { jsonrpc, id, method, params } = body;

    // Helper to create JSON-RPC response - ensure id is always present
    const requestId = id ?? 0;
    
    const jsonRpcResponse = (result: unknown) => ({
      jsonrpc: '2.0',
      id: requestId,
      result,
    });

    const jsonRpcError = (code: number, message: string) => ({
      jsonrpc: '2.0',
      id: requestId,
      error: { code, message },
    });

    // Get API key from environment variable OR Authorization header
    let apiKey = process.env.BRAVE_API_KEY;

    // Allow override from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      apiKey = authHeader.slice(7);
    }

    console.log('Brave API key present:', !!apiKey, 'Length:', apiKey?.length || 0);

    if (!apiKey) {
      return NextResponse.json(
        jsonRpcError(-32600, 'Missing Brave API key. Set BRAVE_API_KEY env var or pass Bearer token.')
      );
    }

    console.log('Brave Search MCP received:', { method, params, id });

    // Handle notifications - per MCP spec, return HTTP 202 Accepted with no body
    // Notifications don't have an 'id' field
    if (method?.startsWith('notifications/') || id === undefined || id === null) {
      console.log('Received notification, returning 202 Accepted');
      return new Response(null, { status: 202 });
    }

    switch (method) {
      case 'initialize':
        return NextResponse.json(jsonRpcResponse({
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'Brave Search MCP Proxy',
            version: '1.0.0',
          },
        }));
      
      case 'tools/list':
        return NextResponse.json(jsonRpcResponse({
          tools: TOOLS,
        }));

      case 'tools/call':
        const { name, arguments: toolArgs } = params || {};
        
        let result;
        try {
          switch (name) {
            case 'brave_web_search':
              result = await braveWebSearch(apiKey, toolArgs);
              break;
            case 'brave_news_search':
              result = await braveNewsSearch(apiKey, toolArgs);
              break;
            case 'brave_image_search':
              result = await braveImageSearch(apiKey, toolArgs);
              break;
            case 'brave_video_search':
              result = await braveVideoSearch(apiKey, toolArgs);
              break;
            default:
              return NextResponse.json(jsonRpcError(-32601, `Unknown tool: ${name}`));
          }
        } catch (error) {
          return NextResponse.json(jsonRpcResponse({
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: true,
                  message: error instanceof Error ? error.message : 'Search failed',
                }, null, 2),
              },
            ],
          }));
        }

        return NextResponse.json(jsonRpcResponse({
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }));

      default:
        return NextResponse.json(jsonRpcError(-32601, `Unknown method: ${method}`));
    }
  } catch (error) {
    console.error('Brave Search MCP error:', error);
    return NextResponse.json(
      { error: { code: -32603, message: 'Internal error' } },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    name: 'Brave Search MCP Proxy',
    version: '1.0.0',
    tools: TOOLS.map(t => t.name),
    usage: 'POST with Authorization: Bearer YOUR_BRAVE_API_KEY',
    getApiKey: 'https://brave.com/search/api/',
  });
}
