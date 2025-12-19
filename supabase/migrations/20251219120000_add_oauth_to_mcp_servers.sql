-- Add OAuth fields to mcp_servers table for Smithery integration

-- Add new auth type value
ALTER TABLE mcp_servers 
DROP CONSTRAINT IF EXISTS mcp_servers_auth_type_check;

ALTER TABLE mcp_servers 
ADD CONSTRAINT mcp_servers_auth_type_check 
CHECK (auth_type IN ('none', 'bearer', 'api_key', 'oauth', 'smithery'));

-- Add OAuth columns
ALTER TABLE mcp_servers 
ADD COLUMN IF NOT EXISTS oauth_client_id TEXT,
ADD COLUMN IF NOT EXISTS oauth_access_token TEXT,
ADD COLUMN IF NOT EXISTS oauth_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS oauth_expires_at TIMESTAMPTZ;

-- Add comment
COMMENT ON COLUMN mcp_servers.oauth_client_id IS 'OAuth client ID for Smithery or other OAuth providers';
COMMENT ON COLUMN mcp_servers.oauth_access_token IS 'Encrypted OAuth access token';
COMMENT ON COLUMN mcp_servers.oauth_refresh_token IS 'Encrypted OAuth refresh token';
COMMENT ON COLUMN mcp_servers.oauth_expires_at IS 'When the OAuth access token expires';
