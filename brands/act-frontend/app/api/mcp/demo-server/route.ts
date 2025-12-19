import { type NextRequest, NextResponse } from 'next/server';

/**
 * Demo MCP Server for testing
 * 
 * This provides a simple HTTP MCP server with a few demo tools:
 * - get_current_time: Returns the current time
 * - calculate: Performs basic math operations
 * - get_weather: Returns mock weather data
 * 
 * Add this server in Settings > MCP Servers with URL:
 * http://localhost:3000/api/mcp/demo-server
 */

export const dynamic = 'force-dynamic';

// Tool definitions
const TOOLS = [
  {
    name: 'get_current_time',
    description: 'Get the current date and time',
    inputSchema: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'Timezone (e.g., "America/New_York", "Europe/London"). Default is UTC.',
        },
      },
      required: [],
    },
  },
  {
    name: 'calculate',
    description: 'Perform basic math calculations',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['add', 'subtract', 'multiply', 'divide'],
          description: 'The math operation to perform',
        },
        a: {
          type: 'number',
          description: 'First number',
        },
        b: {
          type: 'number',
          description: 'Second number',
        },
      },
      required: ['operation', 'a', 'b'],
    },
  },
  {
    name: 'get_weather',
    description: 'Get current weather for a location (mock data)',
    inputSchema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City name (e.g., "Paris", "New York")',
        },
      },
      required: ['location'],
    },
  },
  {
    name: 'generate_id',
    description: 'Generate a unique ID',
    inputSchema: {
      type: 'object',
      properties: {
        prefix: {
          type: 'string',
          description: 'Optional prefix for the ID',
        },
      },
      required: [],
    },
  },
];

// Tool implementations
function executeGetCurrentTime(args: { timezone?: string }) {
  const timezone = args.timezone || 'UTC';
  try {
    const now = new Date();
    const formatted = now.toLocaleString('en-US', { 
      timeZone: timezone,
      dateStyle: 'full',
      timeStyle: 'long',
    });
    return {
      success: true,
      timezone,
      datetime: formatted,
      iso: now.toISOString(),
      timestamp: now.getTime(),
    };
  } catch (error) {
    return {
      success: false,
      error: `Invalid timezone: ${timezone}`,
    };
  }
}

function executeCalculate(args: { operation: string; a: number; b: number }) {
  const { operation, a, b } = args;
  let result: number;

  switch (operation) {
    case 'add':
      result = a + b;
      break;
    case 'subtract':
      result = a - b;
      break;
    case 'multiply':
      result = a * b;
      break;
    case 'divide':
      if (b === 0) {
        return { success: false, error: 'Cannot divide by zero' };
      }
      result = a / b;
      break;
    default:
      return { success: false, error: `Unknown operation: ${operation}` };
  }

  return {
    success: true,
    operation,
    a,
    b,
    result,
    expression: `${a} ${operation} ${b} = ${result}`,
  };
}

function executeGetWeather(args: { location: string }) {
  const { location } = args;
  
  // Mock weather data
  const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy', 'Overcast'];
  const temp = Math.floor(Math.random() * 30) + 5; // 5-35°C
  const humidity = Math.floor(Math.random() * 50) + 30; // 30-80%
  const condition = conditions[Math.floor(Math.random() * conditions.length)];

  return {
    success: true,
    location,
    temperature: {
      celsius: temp,
      fahrenheit: Math.round((temp * 9/5) + 32),
    },
    condition,
    humidity: `${humidity}%`,
    wind: `${Math.floor(Math.random() * 30) + 5} km/h`,
    note: 'This is mock data for testing purposes',
  };
}

function executeGenerateId(args: { prefix?: string }) {
  const prefix = args.prefix || 'id';
  const random = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now().toString(36);
  
  return {
    success: true,
    id: `${prefix}_${timestamp}_${random}`,
    timestamp: Date.now(),
  };
}

// Main handler
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { method, params } = body;

    console.log('Demo MCP Server received:', { method, params });

    switch (method) {
      case 'initialize':
        return NextResponse.json({
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'ACT Demo MCP Server',
            version: '1.0.0',
          },
        });

      case 'tools/list':
        return NextResponse.json({
          tools: TOOLS,
        });

      case 'tools/call':
        const { name, arguments: toolArgs } = params || {};
        
        let result;
        switch (name) {
          case 'get_current_time':
            result = executeGetCurrentTime(toolArgs || {});
            break;
          case 'calculate':
            result = executeCalculate(toolArgs);
            break;
          case 'get_weather':
            result = executeGetWeather(toolArgs);
            break;
          case 'generate_id':
            result = executeGenerateId(toolArgs || {});
            break;
          default:
            return NextResponse.json(
              { error: { code: -32601, message: `Unknown tool: ${name}` } },
              { status: 400 }
            );
        }

        return NextResponse.json({
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        });

      default:
        return NextResponse.json(
          { error: { code: -32601, message: `Unknown method: ${method}` } },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Demo MCP Server error:', error);
    return NextResponse.json(
      { error: { code: -32603, message: 'Internal error' } },
      { status: 500 }
    );
  }
}

// Handle GET for health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    name: 'ACT Demo MCP Server',
    version: '1.0.0',
    tools: TOOLS.map(t => t.name),
    usage: 'POST to this endpoint with MCP protocol messages',
  });
}
