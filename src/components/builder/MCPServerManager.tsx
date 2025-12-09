import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MCPToolsPlayground } from "./MCPToolsPlayground";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { handleError } from "@/lib/errorHandlers";
import { 
  Plus, 
  Settings, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Play,
  Loader2,
  AlertTriangle
} from "lucide-react";

interface MCPServer {
  name: string;
  endpoint: string;
  transport: "http-stream" | "stdio";
  scopes?: string[];
  auth_meta?: {
    type: "bearer" | "oauth";
  };
  capabilities?: {
    tools: Array<{ name: string; description: string; schema: Record<string, unknown> }>;
    resources: Array<{ name: string; description: string; schema: Record<string, unknown> }>;
    prompts: Array<{ name: string; description: string; schema: Record<string, unknown> }>;
  };
  last_verified?: string;
  status?: "active" | "error";
  avg_latency_ms?: number;
}

interface MCPServerManagerProps {
  systemId: string | null;
}

export function MCPServerManager({ systemId }: MCPServerManagerProps) {
  const { toast } = useToast();
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [allowlist, setAllowlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [selectedTool, setSelectedTool] = useState<{ name: string; description: string; schema: Record<string, unknown> } | null>(null);
  const [activeTab, setActiveTab] = useState<string>("configure");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [validatingServer, setValidatingServer] = useState<string | null>(null);
  const [testingTool, setTestingTool] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    endpoint: "",
    transport: "http-stream" as "http-stream" | "stdio",
    authType: "bearer" as "bearer" | "oauth",
    authToken: "",
  });

  // Load servers from intelligence_settings
  useEffect(() => {
    if (systemId) {
      loadServers();
    }
  }, [systemId]);

  const loadServers = async () => {
    if (!systemId) return;

    try {
      const { data, error } = await supabase
        .from('intelligence_settings')
        .select('mcp_servers, tool_allowlist')
        .eq('system_id', systemId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setServers((data.mcp_servers as unknown as MCPServer[]) || []);
        setAllowlist(data.tool_allowlist || []);
      }
    } catch (error) {
      handleError(error, {
        component: 'MCPServerManager',
        action: 'loadServers',
        fallbackMessage: 'Failed to load MCP servers'
      });
    }
  };

  const handleAddServer = async () => {
    if (!systemId || !formData.name || !formData.endpoint) {
      toast({
        title: "Validation Error",
        description: "Server name and endpoint are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mcp-register', {
        body: {
          system_id: systemId,
          name: formData.name,
          endpoint: formData.endpoint,
          transport: formData.transport,
          auth: formData.authToken ? {
            type: formData.authType,
            token: formData.authToken,
          } : undefined,
        }
      });

      if (error) throw error;

      toast({
        title: "Server Registered",
        description: `${formData.name} registered successfully with ${data.capabilities?.tools?.length || 0} tools`,
      });

      // Reset form
      setFormData({
        name: "",
        endpoint: "",
        transport: "http-stream",
        authType: "bearer",
        authToken: "",
      });
      setIsAddDrawerOpen(false);
      await loadServers();
    } catch (error) {
      handleError(error, {
        component: 'MCPServerManager',
        action: 'handleAddServer',
        fallbackMessage: 'Failed to register MCP server'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (serverName: string) => {
    if (!systemId) return;

    setValidatingServer(serverName);
    try {
      const server = servers?.find(s => s.name === serverName);
      if (!server) return;

      const { data, error } = await supabase.functions.invoke('mcp-validate', {
        body: {
          system_id: systemId,
          endpoint: server.endpoint,
          transport: server.transport,
          auth: server.auth_meta,
        }
      });

      if (error) throw error;

      toast({
        title: "Validation Successful",
        description: `${serverName} responded in ${data.latency}ms`,
      });

      await loadServers();
    } catch (error) {
      handleError(error, {
        component: 'MCPServerManager',
        action: 'handleValidate',
        fallbackMessage: 'Failed to validate MCP server'
      });
    } finally {
      setValidatingServer(null);
    }
  };

  const handleConfigureTools = (server: MCPServer) => {
    setSelectedServer(server);
    setSelectedTool(null);
    setActiveTab("configure");
    setIsConfigDialogOpen(true);
  };

  const handleSelectTool = (tool: { name: string; description: string; schema: Record<string, unknown> }) => {
    setSelectedTool(tool);
    setActiveTab("preview");
  };

  const handleToggleTool = (serverName: string, toolName: string) => {
    const toolId = `${serverName}:${toolName}`;
    setAllowlist(prev => 
      prev.includes(toolId) 
        ? prev.filter(t => t !== toolId)
        : [...prev, toolId]
    );
  };

  const handleSaveAllowlist = async () => {
    if (!systemId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('intelligence_settings')
        .update({ tool_allowlist: allowlist })
        .eq('system_id', systemId);

      if (error) throw error;

      toast({
        title: "Allowlist Saved",
        description: `${allowlist.length} tools enabled`,
      });

      setIsConfigDialogOpen(false);
    } catch (error) {
      handleError(error, {
        component: 'MCPServerManager',
        action: 'handleSaveAllowlist',
        fallbackMessage: 'Failed to save tool allowlist'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestTool = async (serverName: string, toolName: string) => {
    if (!systemId) return;

    setTestingTool(`${serverName}:${toolName}`);
    try {
      const { data, error } = await supabase.functions.invoke('mcp-test-tool', {
        body: {
          system_id: systemId,
          server_name: serverName,
          tool_name: toolName,
          args: {}, // Safe canned args
        }
      });

      if (error) throw error;

      toast({
        title: "Test Successful",
        description: `${toolName} executed in ${data.latency}ms`,
      });

      setSelectedServer(prev => prev ? { ...prev, _testResult: data.result } : null);
    } catch (error) {
      handleError(error, {
        component: 'MCPServerManager',
        action: 'handleTestTool',
        fallbackMessage: 'Tool execution failed'
      });
    } finally {
      setTestingTool(null);
    }
  };

  const handleDeleteServer = async (serverName: string) => {
    if (!systemId) return;

    setLoading(true);
    try {
      // Remove from mcp_servers array
      const updatedServers = servers.filter(s => s.name !== serverName);
      
      const { error: settingsError } = await supabase
        .from('intelligence_settings')
        .update({ mcp_servers: updatedServers as unknown as Json })
        .eq('system_id', systemId);

      if (settingsError) throw settingsError;

      // Remove token
      const { error: tokenError } = await supabase
        .from('mcp_tokens')
        .delete()
        .eq('system_id', systemId)
        .eq('server_name', serverName);

      if (tokenError) logger.warn('Token cleanup error', { component: 'MCPServerManager', action: 'handleDeleteServer', metadata: { tokenError } });

      toast({
        title: "Server Deleted",
        description: `${serverName} removed from system`,
      });

      setDeleteConfirm(null);
      await loadServers();
    } catch (error) {
      handleError(error, {
        component: 'MCPServerManager',
        action: 'handleDeleteServer',
        fallbackMessage: 'Failed to delete server'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!systemId) {
    return (
      <Card className="section-padding">
        <p className="text-sm text-muted-foreground">Save your system to enable MCP server management</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-h3 font-display">MCP Servers (Arcade)</h3>
          <p className="text-caption text-muted-foreground">Register Model Context Protocol servers for enhanced capabilities</p>
        </div>
        <Sheet open={isAddDrawerOpen} onOpenChange={setIsAddDrawerOpen}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add MCP Server
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Register MCP Server</SheetTitle>
              <SheetDescription>
                Connect to an Arcade MCP server to extend your AI capabilities
              </SheetDescription>
            </SheetHeader>
            
            <div className="space-y-4 mt-6">
              <div>
                <Label htmlFor="server-name">Server Name *</Label>
                <Input
                  id="server-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="my-mcp-server"
                />
              </div>

              <div>
                <Label htmlFor="endpoint">Endpoint URL *</Label>
                <Input
                  id="endpoint"
                  value={formData.endpoint}
                  onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                  placeholder="https://mcp-server.example.com"
                />
              </div>

              <div>
                <Label htmlFor="transport">Transport</Label>
                <Select value={formData.transport} onValueChange={(value) => setFormData({ ...formData, transport: value as "http-stream" | "stdio" })}>
                  <SelectTrigger id="transport">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http-stream">HTTP Stream</SelectItem>
                    <SelectItem value="stdio">STDIO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <Label htmlFor="auth-type">Authentication Type</Label>
                <Select value={formData.authType} onValueChange={(value) => setFormData({ ...formData, authType: value as "bearer" | "oauth" })}>
                  <SelectTrigger id="auth-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bearer">API Token</SelectItem>
                    <SelectItem value="oauth">OAuth</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.authType === "bearer" && (
                <div>
                  <Label htmlFor="auth-token">API Token (Optional)</Label>
                  <Input
                    id="auth-token"
                    type="password"
                    value={formData.authToken}
                    onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
                    placeholder="sk-..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Token will be encrypted and stored securely
                  </p>
                </div>
              )}

              <Button onClick={handleAddServer} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Register Server
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {servers.length === 0 ? (
        <Card className="section-padding text-center">
          <p className="text-muted-foreground">No MCP servers registered yet</p>
          <p className="text-sm text-muted-foreground mt-1">Click "Add MCP Server" to get started</p>
        </Card>
      ) : (
        <Card className="section-padding">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Transport</TableHead>
                <TableHead>Tools</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.map((server) => (
                <TableRow key={server.name}>
                  <TableCell className="font-medium">{server.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {server.endpoint}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{server.transport}</Badge>
                  </TableCell>
                  <TableCell>
                    {server.capabilities?.tools?.length || 0} tools
                  </TableCell>
                  <TableCell>
                    {server.status === "active" ? (
                      <div className="flex items-center gap-1 text-sm text-primary">
                        <CheckCircle2 className="h-4 w-4" />
                        Active
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-sm text-destructive">
                        <XCircle className="h-4 w-4" />
                        Error
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleValidate(server.name)}
                        disabled={validatingServer === server.name}
                      >
                        {validatingServer === server.name ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleConfigureTools(server)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(server.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Configure Tools Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Configure Tools - {selectedServer?.name}</DialogTitle>
            <DialogDescription>
              Enable tools for your AI to use. All tools are disabled by default for security.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="configure">Configure</TabsTrigger>
              <TabsTrigger value="preview" disabled={!selectedTool}>
                Preview {selectedTool && `- ${selectedTool.name}`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="configure" className="flex-1 overflow-y-auto mt-4">
              <div className="space-y-3">
                {selectedServer?.capabilities?.tools?.map((tool) => {
                  const toolId = `${selectedServer.name}:${tool.name}`;
                  const isEnabled = allowlist.includes(toolId);

                  return (
                    <Card key={tool.name} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{tool.name}</h4>
                            {isEnabled && <Badge variant="secondary">Enabled</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{tool.description}</p>
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              View Schema
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                              {JSON.stringify(tool.schema, null, 2)}
                            </pre>
                          </details>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={() => handleToggleTool(selectedServer.name, tool.name)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectTool(tool)}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveAllowlist} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Configuration
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="flex-1 overflow-hidden mt-0">
              {selectedTool && selectedServer && systemId && (
                <MCPToolsPlayground
                  systemId={systemId}
                  serverName={selectedServer.name}
                  tool={selectedTool}
                />
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete MCP Server
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm}"? This action is irreversible.
              All associated tools and tokens will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDeleteServer(deleteConfirm)}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete Server
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
