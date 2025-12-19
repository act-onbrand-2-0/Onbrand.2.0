'use client';

import { useState } from 'react';
import { 
  Server, 
  Plus, 
  Trash2, 
  Power, 
  PowerOff, 
  TestTube,
  Loader2,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMCPServers, type MCPServerConfig, type MCPTransportType, type MCPAuthType } from '@/lib/mcp';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

interface MCPServerManagerProps {
  brandId: string;
}

export function MCPServerManager({ brandId }: MCPServerManagerProps) {
  const {
    servers,
    isLoading,
    error,
    createServer,
    updateServer,
    deleteServer,
    testConnection,
  } = useMCPServers({ brandId });

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServerConfig | null>(null);
  const [expandedServer, setExpandedServer] = useState<string | null>(null);
  const [testingServer, setTestingServer] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; tools?: string[] }>>({});

  // Form state for new server
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    transport_type: 'http' as MCPTransportType,
    url: '',
    auth_type: 'none' as MCPAuthType,
    auth_token: '',
  });
  
  // Form state for editing
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    transport_type: 'http' as MCPTransportType,
    url: '',
    auth_type: 'none' as MCPAuthType,
    auth_token: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateServer = async () => {
    if (!formData.name || !formData.url) return;

    console.log('Form data before submit:', {
      name: formData.name,
      transport_type: formData.transport_type,
      auth_type: formData.auth_type,
      has_auth_token: !!formData.auth_token,
      auth_token_length: formData.auth_token?.length || 0,
    });

    setIsSubmitting(true);
    try {
      await createServer({
        name: formData.name,
        description: formData.description || undefined,
        transport_type: formData.transport_type,
        url: formData.url,
        auth_type: formData.auth_type,
        auth_token: formData.auth_token || undefined,
      });
      setShowAddDialog(false);
      // Reset form
      setFormData({
        name: '',
        description: '',
        transport_type: 'http',
        url: '',
        auth_type: 'none',
        auth_token: '',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestConnection = async (server: MCPServerConfig) => {
    setTestingServer(server.id);
    const result = await testConnection({
      transport_type: server.transport_type,
      url: server.url,
      auth_type: server.auth_type,
      auth_token_encrypted: server.auth_token_encrypted,
    });
    setTestResults(prev => ({
      ...prev,
      [server.id]: {
        success: result.success,
        message: result.message,
        tools: result.tools,
      },
    }));
    setTestingServer(null);
  };

  const handleToggleEnabled = async (server: MCPServerConfig) => {
    await updateServer(server.id, { enabled: !server.enabled });
  };

  const handleEditServer = (server: MCPServerConfig) => {
    setEditingServer(server);
    setEditFormData({
      name: server.name,
      description: server.description || '',
      transport_type: server.transport_type,
      url: server.url || '',
      auth_type: server.auth_type || 'none',
      auth_token: '', // Don't pre-fill token for security
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingServer || !editFormData.name || !editFormData.url) return;

    setIsSubmitting(true);
    try {
      await updateServer(editingServer.id, {
        name: editFormData.name,
        description: editFormData.description || undefined,
        transport_type: editFormData.transport_type,
        url: editFormData.url,
        auth_type: editFormData.auth_type,
        // Only update token if a new one was entered
        ...(editFormData.auth_token ? { auth_token_encrypted: editFormData.auth_token } : {}),
      });
      setShowEditDialog(false);
      setEditingServer(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteServer = async (serverId: string) => {
    if (confirm('Are you sure you want to delete this MCP server?')) {
      await deleteServer(serverId);
    }
  };

  if (isLoading && servers.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">MCP Servers</h3>
          <p className="text-sm text-muted-foreground">
            Connect to Model Context Protocol servers to extend AI capabilities
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4 mr-2" />
              Add Server
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add MCP Server</DialogTitle>
              <DialogDescription>
                Connect to an MCP server to enable additional AI tools
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Server Name</Label>
                <Input
                  id="name"
                  placeholder="My MCP Server"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder="Provides tools for..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Transport Type</Label>
                <RadioGroup
                  value={formData.transport_type}
                  onValueChange={(value: string) => setFormData(prev => ({ ...prev, transport_type: value as MCPTransportType }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="http" id="transport-http" />
                    <Label htmlFor="transport-http" className="font-normal cursor-pointer">HTTP</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sse" id="transport-sse" />
                    <Label htmlFor="transport-sse" className="font-normal cursor-pointer">SSE (Smithery)</Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  Use SSE for Smithery servers, HTTP for standard MCP servers
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">Server URL</Label>
                <Input
                  id="url"
                  placeholder="https://your-mcp-server.com/mcp"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth">Authentication</Label>
                <Select
                  value={formData.auth_type}
                  onValueChange={(value) => setFormData({ ...formData, auth_type: value as MCPAuthType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="api_key">API Key</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.auth_type !== 'none' && (
                <div className="space-y-2">
                  <Label htmlFor="token">
                    {formData.auth_type === 'bearer' ? 'Bearer Token' : 'API Key'}
                  </Label>
                  <Input
                    id="token"
                    type="password"
                    placeholder="Enter your token/key"
                    value={formData.auth_token}
                    onChange={(e) => setFormData({ ...formData, auth_token: e.target.value })}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateServer} 
                disabled={!formData.name || !formData.url || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : null}
                Add Server
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {servers.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <Server className="size-12 mx-auto text-muted-foreground mb-4" />
          <h4 className="font-medium mb-2">No MCP Servers</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Add an MCP server to extend your AI assistant with additional tools
          </p>
          <Button variant="outline" onClick={() => setShowAddDialog(true)}>
            <Plus className="size-4 mr-2" />
            Add Your First Server
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {servers.map((server) => (
            <div
              key={server.id}
              className={cn(
                "border rounded-lg overflow-hidden transition-colors",
                server.enabled ? "bg-background" : "bg-muted/50"
              )}
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "size-2 rounded-full",
                    server.enabled ? "bg-green-500" : "bg-muted-foreground"
                  )} />
                  <div>
                    <div className="font-medium">{server.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {server.transport_type.toUpperCase()} • {server.url}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleTestConnection(server)}
                    disabled={testingServer === server.id}
                    title="Test connection"
                  >
                    {testingServer === server.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <TestTube className="size-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditServer(server)}
                    title="Edit server"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleEnabled(server)}
                    title={server.enabled ? 'Disable' : 'Enable'}
                  >
                    {server.enabled ? (
                      <Power className="size-4 text-green-500" />
                    ) : (
                      <PowerOff className="size-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteServer(server.id)}
                    title="Delete"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setExpandedServer(
                      expandedServer === server.id ? null : server.id
                    )}
                  >
                    {expandedServer === server.id ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Test result banner */}
              {testResults[server.id] && (
                <div className={cn(
                  "px-4 py-2 text-sm flex items-center gap-2",
                  testResults[server.id].success
                    ? "bg-green-500/10 text-green-600"
                    : "bg-destructive/10 text-destructive"
                )}>
                  {testResults[server.id].success ? (
                    <CheckCircle className="size-4" />
                  ) : (
                    <XCircle className="size-4" />
                  )}
                  {testResults[server.id].message}
                </div>
              )}

              {/* Expanded details */}
              {expandedServer === server.id && (
                <div className="px-4 pb-4 pt-2 border-t space-y-3">
                  {server.description && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Description</div>
                      <div className="text-sm">{server.description}</div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Priority</div>
                      <div>{server.priority}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Timeout</div>
                      <div>{server.timeout_ms}ms</div>
                    </div>
                  </div>
                  {testResults[server.id]?.tools && testResults[server.id].tools!.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Available Tools</div>
                      <div className="flex flex-wrap gap-1">
                        {testResults[server.id].tools!.map((tool) => (
                          <span
                            key={tool}
                            className="px-2 py-0.5 bg-muted rounded text-xs"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-muted-foreground flex items-center gap-1">
        Learn more about MCP at{' '}
        <a
          href="https://modelcontextprotocol.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-0.5"
        >
          modelcontextprotocol.io
          <ExternalLink className="size-3" />
        </a>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit MCP Server</DialogTitle>
            <DialogDescription>
              Update the MCP server configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Server Name</Label>
              <Input
                id="edit-name"
                placeholder="My MCP Server"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Input
                id="edit-description"
                placeholder="Provides tools for..."
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Transport Type</Label>
              <RadioGroup
                value={editFormData.transport_type}
                onValueChange={(value: string) => setEditFormData(prev => ({ ...prev, transport_type: value as MCPTransportType }))}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="http" id="edit-transport-http" />
                  <Label htmlFor="edit-transport-http" className="font-normal cursor-pointer">HTTP</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sse" id="edit-transport-sse" />
                  <Label htmlFor="edit-transport-sse" className="font-normal cursor-pointer">SSE (Smithery)</Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                Use SSE for Smithery servers, HTTP for standard MCP servers
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-url">Server URL</Label>
              <Input
                id="edit-url"
                placeholder="https://your-mcp-server.com/mcp"
                value={editFormData.url}
                onChange={(e) => setEditFormData({ ...editFormData, url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-auth">Authentication</Label>
              <Select
                value={editFormData.auth_type}
                onValueChange={(value) => setEditFormData({ ...editFormData, auth_type: value as MCPAuthType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="bearer">Bearer Token</SelectItem>
                  <SelectItem value="api_key">API Key</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editFormData.auth_type !== 'none' && (
              <div className="space-y-2">
                <Label htmlFor="edit-token">
                  {editFormData.auth_type === 'bearer' ? 'Bearer Token' : 'API Key'}
                </Label>
                <Input
                  id="edit-token"
                  type="password"
                  placeholder="Leave blank to keep existing token"
                  value={editFormData.auth_token}
                  onChange={(e) => setEditFormData({ ...editFormData, auth_token: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to keep the existing token
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={!editFormData.name || !editFormData.url || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
