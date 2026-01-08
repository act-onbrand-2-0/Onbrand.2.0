'use client';

import { useState, useEffect } from 'react';

// MCP server-based suggestions - keyed by common server name patterns
const MCP_SUGGESTIONS: Record<string, Array<{ title: string; label: string }>> = {
  'brave': [
    { title: 'Search for the latest news about [topic] and summarize the key points', label: 'News Search' },
    { title: 'Find competitor analysis and market insights for [industry/company]', label: 'Market Research' },
    { title: 'Research best practices for [marketing strategy] with real examples', label: 'Best Practices' },
    { title: 'Look up trending topics and hashtags for [platform/niche]', label: 'Trend Research' },
  ],
  'search': [
    { title: 'Search for the latest trends in [industry] and create a summary', label: 'Trend Search' },
    { title: 'Find examples of successful [campaign type] campaigns', label: 'Campaign Examples' },
    { title: 'Research what competitors are doing for [topic/product]', label: 'Competitor Research' },
    { title: 'Look up statistics and data about [topic] for my presentation', label: 'Data Research' },
  ],
  'web': [
    { title: 'Browse [website] and analyze their content strategy', label: 'Site Analysis' },
    { title: 'Find the latest articles about [topic] from reputable sources', label: 'Article Search' },
    { title: 'Research pricing and features of [competitor products]', label: 'Competitive Intel' },
    { title: 'Look up case studies for [industry/use case]', label: 'Case Studies' },
  ],
  'github': [
    { title: 'Review the README and suggest improvements for better documentation', label: 'Doc Review' },
    { title: 'Analyze the codebase structure and identify potential improvements', label: 'Code Analysis' },
    { title: 'Help me create a pull request description for [feature/fix]', label: 'PR Description' },
    { title: 'Search for issues related to [topic] and suggest solutions', label: 'Issue Research' },
  ],
  'code': [
    { title: 'Help me write a script to automate [task]', label: 'Automation' },
    { title: 'Review this code snippet and suggest optimizations', label: 'Code Review' },
    { title: 'Generate boilerplate code for [feature/component]', label: 'Code Generation' },
    { title: 'Debug this error and explain the fix', label: 'Debugging' },
  ],
  'slack': [
    { title: 'Draft a team announcement about [update/news]', label: 'Announcement' },
    { title: 'Summarize the key discussions from [channel] this week', label: 'Channel Summary' },
    { title: 'Help me write a thoughtful response to [message topic]', label: 'Message Draft' },
    { title: 'Create a project status update to share with the team', label: 'Status Update' },
  ],
  'database': [
    { title: 'Query our data to find insights about [metric/topic]', label: 'Data Query' },
    { title: 'Generate a report on [KPI] trends over the last [period]', label: 'Report' },
    { title: 'Analyze customer data to identify [pattern/segment]', label: 'Data Analysis' },
    { title: 'Find records matching [criteria] and summarize the results', label: 'Record Search' },
  ],
  'simplicate': [
    { title: 'Find all projects for [client name] and their current status', label: 'Project Status' },
    { title: 'Look up invoices and financial summary for [client/period]', label: 'Financial Overview' },
    { title: 'Show me the team capacity and upcoming deadlines', label: 'Capacity Planning' },
    { title: 'Generate a client report with hours and deliverables', label: 'Client Report' },
  ],
  'file': [
    { title: 'Analyze the uploaded document and extract key insights', label: 'Doc Analysis' },
    { title: 'Summarize this document and create action items', label: 'Summary' },
    { title: 'Compare these files and highlight the differences', label: 'Comparison' },
    { title: 'Extract data from this document into a structured format', label: 'Data Extraction' },
  ],
  'document': [
    { title: 'Review this document and suggest improvements', label: 'Document Review' },
    { title: 'Create an executive summary of the attached report', label: 'Exec Summary' },
    { title: 'Extract quotes and key points from this content', label: 'Key Points' },
    { title: 'Reformat this document for [audience/purpose]', label: 'Reformat' },
  ],
  'weather': [
    { title: "What's the weather forecast for [city] this week?", label: 'Weather Forecast' },
    { title: 'Should I plan outdoor activities in [location] on [date]?', label: 'Activity Planning' },
    { title: 'Compare weather conditions between [city1] and [city2]', label: 'Weather Compare' },
    { title: 'What should I pack for my trip to [destination]?', label: 'Packing Help' },
  ],
  'calendar': [
    { title: 'Show me my schedule for [today/this week/next week]', label: 'View Schedule' },
    { title: 'Find a free slot for a [duration] meeting with [attendees]', label: 'Find Time' },
    { title: 'Reschedule my [meeting type] to a better time', label: 'Reschedule' },
    { title: 'Block focus time for [task] this week', label: 'Block Time' },
  ],
  'email': [
    { title: 'Draft a professional response to [email topic]', label: 'Email Response' },
    { title: 'Summarize my unread emails and prioritize them', label: 'Email Summary' },
    { title: 'Write a follow-up email for [meeting/proposal]', label: 'Follow-up' },
    { title: 'Create an email template for [use case]', label: 'Template' },
  ],
  'api': [
    { title: 'Make a request to [endpoint] and format the results', label: 'API Call' },
    { title: 'Test the [API name] integration and verify the response', label: 'API Test' },
    { title: 'Generate API documentation for [endpoint]', label: 'API Docs' },
    { title: 'Debug this API error and suggest fixes', label: 'API Debug' },
  ],
  'notion': [
    { title: 'Create a new page for [project/topic] with a template', label: 'Create Page' },
    { title: 'Search my workspace for notes about [topic]', label: 'Search Notes' },
    { title: 'Update the [database/page] with the latest information', label: 'Update Content' },
    { title: 'Generate a meeting notes template for [meeting type]', label: 'Meeting Notes' },
  ],
  'analytics': [
    { title: 'Show me the key metrics for [campaign/website] this month', label: 'Key Metrics' },
    { title: 'Analyze traffic patterns and identify growth opportunities', label: 'Traffic Analysis' },
    { title: 'Compare performance between [period1] and [period2]', label: 'Period Comparison' },
    { title: 'Generate an insights report for stakeholders', label: 'Insights Report' },
  ],
};

// Get MCP-based suggestions from server name
function getMCPSuggestions(serverName: string): Array<{ title: string; label: string }> | null {
  const nameLower = serverName.toLowerCase();
  for (const [key, suggestions] of Object.entries(MCP_SUGGESTIONS)) {
    if (nameLower.includes(key)) {
      return suggestions;
    }
  }
  return null;
}

// Role-based suggestions
const ROLE_SUGGESTIONS: Record<string, Array<{ title: string; label: string }>> = {
  'Strategist': [
    { title: 'Analyze my target audience demographics and suggest content pillars that would resonate with them', label: 'Audience Analysis' },
    { title: 'Help me develop a content strategy for launching [product/campaign] across multiple channels', label: 'Content Strategy' },
    { title: "Review my competitor's messaging and identify gaps we could exploit in our positioning", label: 'Competitor Analysis' },
    { title: 'Create a quarterly content roadmap aligned with our business objectives', label: 'Content Roadmap' },
  ],
  'Creative': [
    { title: 'Generate 10 headline variations for [product/campaign] that capture [specific emotion/benefit]', label: 'Headlines' },
    { title: 'Brainstorm creative concepts for a social media campaign about [topic/product]', label: 'Campaign Ideas' },
    { title: 'Help me write compelling ad copy that highlights [key features] for [target audience]', label: 'Ad Copy' },
    { title: 'Suggest visual directions and mood boards for [brand/campaign theme]', label: 'Visual Direction' },
  ],
  'Account Manager': [
    { title: 'Draft a client presentation outline that explains our recommended strategy for [campaign]', label: 'Presentation' },
    { title: 'Create a project timeline and milestone breakdown for [campaign type]', label: 'Timeline' },
    { title: 'Help me write a status update email addressing [client concern] while managing expectations', label: 'Status Update' },
    { title: 'Generate talking points for a kickoff meeting with a new client in [industry]', label: 'Kickoff Meeting' },
  ],
  'Social Media Manager': [
    { title: "Create a week's worth of post ideas for [platform] that align with [brand voice/campaign]", label: 'Post Ideas' },
    { title: 'Suggest engagement strategies to boost interaction on our recent [content type] posts', label: 'Engagement' },
    { title: 'Help me write responses to common customer comments/questions about [product/topic]', label: 'Responses' },
    { title: 'Generate caption variations for [type of content] that encourage shares and saves', label: 'Captions' },
  ],
  'Communication Manager': [
    { title: 'Draft a press release announcing [company news/product launch]', label: 'Press Release' },
    { title: 'Create talking points for leadership to address [issue/announcement] internally and externally', label: 'Talking Points' },
    { title: 'Help me write crisis communication guidelines for [potential scenario]', label: 'Crisis Comms' },
    { title: 'Develop key messages for our brand that can be adapted across all communication channels', label: 'Key Messages' },
  ],
  'Other': [
    { title: "Help me understand my brand's voice and tone guidelines", label: 'Brand Voice' },
    { title: 'Generate content ideas based on current trends in [industry]', label: 'Content Ideas' },
    { title: 'Create a brief template for my next campaign', label: 'Brief Template' },
    { title: 'Analyze this content and suggest improvements for [specific goal]', label: 'Content Analysis' },
  ],
};

// Fallback suggestions if role not found
const DEFAULT_SUGGESTIONS = ROLE_SUGGESTIONS['Other'];

export function getSuggestedActionsForRole(jobFunction?: string | null): Array<{ title: string; label: string }> {
  if (!jobFunction) return DEFAULT_SUGGESTIONS;
  return ROLE_SUGGESTIONS[jobFunction] || DEFAULT_SUGGESTIONS;
}

interface GreetingProps {
  userName?: string;
}

export function Greeting({ userName }: GreetingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 md:py-16 px-4">
      {/* Welcome Text */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          Hello there{userName ? `, ${userName}` : ''}!
        </h1>
        <p className="text-muted-foreground text-base md:text-lg">
          How can I help you today?
        </p>
      </div>
    </div>
  );
}

// MCP server info for dynamic suggestions
export interface MCPServerInfo {
  id: string;
  name: string;
  description?: string | null;
  enabled?: boolean;
}

interface SuggestedActionsProps {
  onSelect: (text: string) => void;
  jobFunction?: string | null;
  selectedMcpServers?: MCPServerInfo[];
  brandId?: string;
  selectedMcpServerIds?: string[];
}

// Get suggestions based on selected MCP servers, with fallback to role-based
function getSuggestionsForContext(
  selectedMcpServers?: MCPServerInfo[],
  jobFunction?: string | null
): { suggestions: Array<{ title: string; label: string }>; source: 'mcp' | 'role' } {
  // If MCP servers are selected, prioritize MCP-based suggestions
  if (selectedMcpServers && selectedMcpServers.length > 0) {
    const mcpSuggestions: Array<{ title: string; label: string }> = [];
    const usedLabels = new Set<string>();
    
    // Collect suggestions from each selected server
    for (const server of selectedMcpServers) {
      const serverSuggestions = getMCPSuggestions(server.name);
      if (serverSuggestions) {
        for (const suggestion of serverSuggestions) {
          // Avoid duplicates by checking label
          if (!usedLabels.has(suggestion.label)) {
            mcpSuggestions.push(suggestion);
            usedLabels.add(suggestion.label);
          }
          // Limit to 4 suggestions total
          if (mcpSuggestions.length >= 4) break;
        }
      }
      if (mcpSuggestions.length >= 4) break;
    }
    
    // If we found MCP-based suggestions, use them
    if (mcpSuggestions.length > 0) {
      // If we have fewer than 4, pad with role-based suggestions
      if (mcpSuggestions.length < 4) {
        const roleSuggestions = getSuggestedActionsForRole(jobFunction);
        for (const suggestion of roleSuggestions) {
          if (!usedLabels.has(suggestion.label)) {
            mcpSuggestions.push(suggestion);
            usedLabels.add(suggestion.label);
          }
          if (mcpSuggestions.length >= 4) break;
        }
      }
      return { suggestions: mcpSuggestions.slice(0, 4), source: 'mcp' };
    }
  }
  
  // Fallback to role-based suggestions
  return { suggestions: getSuggestedActionsForRole(jobFunction), source: 'role' };
}

// Tool info type
interface MCPToolInfo {
  serverId: string;
  serverName: string;
  toolName: string;
  description?: string;
}

// Generate dynamic suggestions based on actual MCP tools - using tool names directly
function generateToolBasedSuggestions(tools: MCPToolInfo[]): Array<{ title: string; label: string }> {
  const suggestions: Array<{ title: string; label: string }> = [];
  const seenTitles = new Set<string>();
  
  for (const tool of tools) {
    const toolName = tool.toolName.toLowerCase();
    
    // Create a human-readable label from the tool name
    const readableName = tool.toolName
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase();
    
    // Generate specific actionable prompts based on the actual tool name
    let title: string;
    
    // Match specific tool patterns and create natural prompts
    if (toolName.includes('get_employee') || toolName.includes('list_employee') || toolName.includes('find_employee')) {
      title = `List all employees and their details`;
    } else if (toolName.includes('get_project') || toolName.includes('list_project') || toolName.includes('find_project')) {
      title = `Show all projects and their current status`;
    } else if (toolName.includes('get_invoice') || toolName.includes('list_invoice')) {
      title = `Get recent invoices and payment status`;
    } else if (toolName.includes('get_hours') || toolName.includes('list_hours') || toolName.includes('hours_')) {
      title = `Show hours logged this week/month`;
    } else if (toolName.includes('get_client') || toolName.includes('list_client') || toolName.includes('find_client')) {
      title = `Look up client information and history`;
    } else if (toolName.includes('get_task') || toolName.includes('list_task')) {
      title = `Show my pending tasks and deadlines`;
    } else if (toolName.includes('search')) {
      title = `Search the web for [your topic]`;
    } else if (toolName.includes('create_')) {
      const item = readableName.replace('create ', '').trim();
      title = `Create a new ${item}`;
    } else if (toolName.includes('update_')) {
      const item = readableName.replace('update ', '').trim();
      title = `Update ${item} information`;
    } else if (toolName.includes('delete_') || toolName.includes('remove_')) {
      const item = readableName.replace(/delete |remove /, '').trim();
      title = `Delete or remove a ${item}`;
    } else if (toolName.includes('get_') || toolName.includes('fetch_') || toolName.includes('read_')) {
      const item = readableName.replace(/get |fetch |read /, '').trim();
      title = `Get ${item} details`;
    } else if (toolName.includes('list_') || toolName.includes('all_')) {
      const item = readableName.replace(/list |all /, '').trim();
      title = `List all ${item}`;
    } else if (tool.description && tool.description.length > 5) {
      // Use description if available
      title = tool.description.charAt(0).toUpperCase() + tool.description.slice(1);
    } else {
      // Last resort: make the tool name readable
      title = `Use ${readableName} capability`;
    }
    
    // Skip duplicates
    if (seenTitles.has(title)) continue;
    seenTitles.add(title);
    
    suggestions.push({ 
      title, 
      label: `${tool.serverName}: ${readableName}` 
    });
    
    // Limit to 4 suggestions
    if (suggestions.length >= 4) break;
  }
  
  return suggestions;
}

// Cache tools globally to enable instant updates
const toolsCache = new Map<string, MCPToolInfo[]>();

export function SuggestedActions({ onSelect, jobFunction, selectedMcpServers, brandId, selectedMcpServerIds }: SuggestedActionsProps) {
  // Fetch MCP tools directly when servers are selected
  const [mcpTools, setMcpTools] = useState<MCPToolInfo[]>([]);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [fetchedServers, setFetchedServers] = useState<MCPServerInfo[]>([]);
  
  // Create cache key from selected server IDs
  const cacheKey = selectedMcpServerIds?.sort().join(',') || '';
  
  // Check cache first for instant updates
  useEffect(() => {
    if (cacheKey && toolsCache.has(cacheKey)) {
      setMcpTools(toolsCache.get(cacheKey)!);
    }
  }, [cacheKey]);
  
  // Fetch server info for display
  useEffect(() => {
    if (!brandId || !selectedMcpServerIds || selectedMcpServerIds.length === 0) {
      setFetchedServers([]);
      return;
    }
    
    if (selectedMcpServers && selectedMcpServers.length > 0) {
      return;
    }
    
    async function fetchServers() {
      try {
        const response = await fetch(`/api/mcp/servers?brandId=${brandId}`);
        const data = await response.json();
        if (response.ok && data.servers) {
          const selected = data.servers.filter((s: MCPServerInfo) => 
            selectedMcpServerIds?.includes(s.id)
          );
          setFetchedServers(selected);
        }
      } catch (error) {
        console.error('Failed to fetch servers:', error);
      }
    }
    
    fetchServers();
  }, [brandId, selectedMcpServerIds, selectedMcpServers]);

  // Fetch actual MCP tools for dynamic suggestions
  useEffect(() => {
    if (!brandId || !selectedMcpServerIds || selectedMcpServerIds.length === 0) {
      setMcpTools([]);
      return;
    }
    
    // If already cached, don't refetch
    if (cacheKey && toolsCache.has(cacheKey)) {
      return;
    }
    
    async function fetchTools() {
      setIsLoadingTools(true);
      try {
        const response = await fetch(
          `/api/mcp/tools?brandId=${brandId}&serverIds=${selectedMcpServerIds?.join(',') || ''}`
        );
        const data = await response.json();
        if (response.ok && data.tools) {
          setMcpTools(data.tools);
          // Cache for instant updates next time
          if (cacheKey) {
            toolsCache.set(cacheKey, data.tools);
          }
        }
      } catch (error) {
        console.error('Failed to fetch MCP tools:', error);
      } finally {
        setIsLoadingTools(false);
      }
    }
    
    fetchTools();
  }, [brandId, selectedMcpServerIds, cacheKey]);
  
  // Use props if available, otherwise use fetched servers
  const effectiveServers = (selectedMcpServers && selectedMcpServers.length > 0) 
    ? selectedMcpServers 
    : fetchedServers;
  
  // Generate suggestions: prioritize dynamic tool-based, fallback to pattern-based, then role-based
  let suggestions: Array<{ title: string; label: string }>;
  let source: 'mcp-tools' | 'mcp' | 'role';
  
  if (mcpTools.length > 0) {
    // Use actual MCP tool metadata for dynamic suggestions
    suggestions = generateToolBasedSuggestions(mcpTools).slice(0, 4);
    source = 'mcp-tools';
  } else if (effectiveServers.length > 0) {
    // Fallback to pattern-based suggestions while tools are loading
    const result = getSuggestionsForContext(effectiveServers, jobFunction);
    suggestions = result.suggestions;
    source = result.source === 'mcp' ? 'mcp' : 'role';
  } else {
    // Default role-based suggestions
    const result = getSuggestionsForContext(undefined, jobFunction);
    suggestions = result.suggestions;
    source = 'role';
  }
  
  // Get unique server names from tools or servers
  const serverNames = source === 'mcp-tools' 
    ? [...new Set(mcpTools.map(t => t.serverName))]
    : effectiveServers.map(s => s.name);
  
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-2xl mx-auto px-4 mb-8">
      {/* Show indicator when MCP tools are influencing suggestions */}
      {(source === 'mcp-tools' || source === 'mcp') && serverNames.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>
            {source === 'mcp-tools' ? 'Dynamic suggestions from' : 'Suggestions powered by'}{' '}
            <span className="font-medium text-foreground">
              {serverNames.join(', ')}
            </span>
            {isLoadingTools && <span className="ml-1 animate-pulse">...</span>}
          </span>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {suggestions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => onSelect(action.title)}
            className="rounded-xl border border-border bg-background/50 px-4 py-3 text-sm text-foreground text-left transition-all hover:bg-muted hover:border-muted-foreground/50"
          >
            {action.title}
          </button>
        ))}
      </div>
    </div>
  );
}
