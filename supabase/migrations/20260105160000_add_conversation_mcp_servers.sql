-- Add enabled_mcp_servers column to conversations table
-- This allows users to select which MCP servers are active for each conversation

ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS enabled_mcp_server_ids UUID[] DEFAULT '{}';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversations_mcp_servers 
ON public.conversations USING GIN (enabled_mcp_server_ids);

-- Add a comment explaining the column
COMMENT ON COLUMN public.conversations.enabled_mcp_server_ids IS 
'Array of MCP server IDs enabled for this conversation. Empty array means use all brand-enabled servers.';
