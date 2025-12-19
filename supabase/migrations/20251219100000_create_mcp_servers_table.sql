-- MCP (Model Context Protocol) Servers Configuration
-- Allows brands to configure external MCP servers for AI tool integration

-- Create mcp_servers table
CREATE TABLE IF NOT EXISTS mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Transport configuration
  transport_type TEXT NOT NULL CHECK (transport_type IN ('http', 'sse', 'stdio')),
  url TEXT, -- For http/sse transports
  command TEXT, -- For stdio transport
  args TEXT[], -- For stdio transport
  
  -- Authentication
  auth_type TEXT CHECK (auth_type IN ('none', 'bearer', 'api_key', 'oauth')),
  auth_header TEXT, -- Custom header name (default: Authorization)
  auth_token_encrypted TEXT, -- Encrypted bearer token or API key
  
  -- Configuration
  enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Higher priority servers are queried first
  timeout_ms INTEGER DEFAULT 30000, -- Timeout for tool calls
  
  -- Tool filtering (optional)
  allowed_tools TEXT[], -- If set, only these tools are available
  blocked_tools TEXT[], -- If set, these tools are blocked
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT mcp_server_transport_check CHECK (
    (transport_type IN ('http', 'sse') AND url IS NOT NULL) OR
    (transport_type = 'stdio' AND command IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mcp_servers_brand_id ON mcp_servers(brand_id);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_enabled ON mcp_servers(enabled) WHERE enabled = true;

-- Enable RLS
ALTER TABLE mcp_servers ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only brand users can view/manage MCP servers
CREATE POLICY "Brand users can view MCP servers"
  ON mcp_servers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brand_users bu
      WHERE bu.brand_id = mcp_servers.brand_id
      AND bu.user_id = auth.uid()
    )
  );

CREATE POLICY "Brand admins can insert MCP servers"
  ON mcp_servers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brand_users bu
      WHERE bu.brand_id = mcp_servers.brand_id
      AND bu.user_id = auth.uid()
      AND bu.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Brand admins can update MCP servers"
  ON mcp_servers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM brand_users bu
      WHERE bu.brand_id = mcp_servers.brand_id
      AND bu.user_id = auth.uid()
      AND bu.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Brand admins can delete MCP servers"
  ON mcp_servers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM brand_users bu
      WHERE bu.brand_id = mcp_servers.brand_id
      AND bu.user_id = auth.uid()
      AND bu.role IN ('owner', 'admin')
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_mcp_servers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mcp_servers_updated_at
  BEFORE UPDATE ON mcp_servers
  FOR EACH ROW
  EXECUTE FUNCTION update_mcp_servers_updated_at();

-- Add comment
COMMENT ON TABLE mcp_servers IS 'MCP (Model Context Protocol) server configurations for AI tool integration';
