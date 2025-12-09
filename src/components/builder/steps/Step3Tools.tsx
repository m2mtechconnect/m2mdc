import { useState, useEffect } from 'react';
import { Plug, Link2, Code, Check, Info, Sparkles, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useWizardBuilderStore, BuilderTool } from '@/stores/wizardBuilderStore';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { ConnectStep } from '@/components/builder/ConnectStep';
import { toast } from 'sonner';

const INTEGRATIONS = [
  { id: 'gmail', name: 'Gmail', category: 'Communication' },
  { id: 'slack', name: 'Slack', category: 'Communication' },
  { id: 'teams', name: 'Microsoft Teams', category: 'Communication' },
  { id: 'notion', name: 'Notion', category: 'Productivity' },
  { id: 'confluence', name: 'Confluence', category: 'Productivity' },
  { id: 'hubspot', name: 'HubSpot', category: 'CRM' },
  { id: 'salesforce', name: 'Salesforce', category: 'CRM' },
  { id: 'stripe', name: 'Stripe', category: 'Payments' },
  { id: 'airtable', name: 'Airtable', category: 'Database' },
  { id: 'jira', name: 'Jira', category: 'Development' },
  { id: 'github', name: 'GitHub', category: 'Development' },
];

export function Step3Tools() {
  const { builderId, tools, apiConnectors, setTools, addApiConnector, removeApiConnector, isLoading } = useWizardBuilderStore();
  const { currentBlueprint } = useBlueprintStore();
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // API connector form state
  const [apiForm, setApiForm] = useState({
    name: '',
    endpoint: '',
    method: 'GET',
    authType: 'Bearer Token',
    headers: ''
  });
  const [isAddingApi, setIsAddingApi] = useState(false);

  // Initialize tools from blueprint on first load
  useEffect(() => {
    if (hasInitialized || tools.length > 0) return;
    
    if (currentBlueprint?.tools?.preselectedIntegrations) {
      const recommendedIds = currentBlueprint.tools.preselectedIntegrations
        .map(name => name.toLowerCase().replace(/\s+/g, ''))
        .filter(id => INTEGRATIONS.find(int => int.id === id));
      
      const initialTools: BuilderTool[] = recommendedIds.map(id => {
        const integration = INTEGRATIONS.find(int => int.id === id)!;
        return {
          id,
          type: 'integration' as const,
          name: integration.name,
          category: integration.category,
          enabled: true,
          connected: false,
          config: {}
        };
      });
      
      if (initialTools.length > 0) {
        setTools(initialTools).catch(console.error);
      }
    }
    setHasInitialized(true);
  }, [currentBlueprint, hasInitialized, tools.length, setTools]);

  const recommendedTools = currentBlueprint?.tools?.recommendedIntegrations?.slice(0, 3) || ['Slack', 'HubSpot', 'Jira'];

  const toggleIntegration = async (integrationId: string) => {
    const integration = INTEGRATIONS.find(int => int.id === integrationId);
    if (!integration) return;

    const existingTool = tools.find(t => t.id === integrationId);
    
    let updatedTools: BuilderTool[];
    if (existingTool) {
      // Remove tool
      updatedTools = tools.filter(t => t.id !== integrationId);
    } else {
      // Add tool
      updatedTools = [...tools, {
        id: integrationId,
        type: 'integration' as const,
        name: integration.name,
        category: integration.category,
        enabled: true,
        connected: false,
        config: {}
      }];
    }
    
    try {
      await setTools(updatedTools);
      toast.success(existingTool ? `Disconnected ${integration.name}` : `Connected ${integration.name}`);
    } catch (err) {
      toast.error('Failed to update integration');
    }
  };

  const handleAddApiConnector = async () => {
    if (!apiForm.name || !apiForm.endpoint) {
      toast.error('Please fill in API name and endpoint');
      return;
    }

    setIsAddingApi(true);
    try {
      let headers: Record<string, string> = {};
      if (apiForm.headers) {
        try {
          headers = JSON.parse(apiForm.headers);
        } catch {
          toast.error('Invalid JSON in headers field');
          setIsAddingApi(false);
          return;
        }
      }

      await addApiConnector({
        name: apiForm.name,
        endpoint: apiForm.endpoint,
        method: apiForm.method,
        authType: apiForm.authType,
        headers
      });
      
      toast.success(`Added API connector: ${apiForm.name}`);
      setApiForm({ name: '', endpoint: '', method: 'GET', authType: 'Bearer Token', headers: '' });
    } catch (err) {
      toast.error('Failed to add API connector');
    } finally {
      setIsAddingApi(false);
    }
  };

  const handleRemoveApiConnector = async (id: string) => {
    try {
      await removeApiConnector(id);
      toast.success('Removed API connector');
    } catch (err) {
      toast.error('Failed to remove API connector');
    }
  };

  const connectedIntegrations = new Set(tools.filter(t => t.type === 'integration').map(t => t.id));

  return (
    <div className="space-y-8 max-w-[880px] mx-auto">
      <div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                Tools, Integrations & MCP
                <Info className="h-5 w-5 text-muted-foreground" />
              </h1>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p>Connect external capabilities to extend your agent: business systems, MCP servers for specialized actions, and custom APIs.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <p className="text-muted-foreground mt-2">
          Connect external systems and extend capabilities
        </p>
      </div>

      <Tabs defaultValue="integrations" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Integrations</span>
            {connectedIntegrations.size > 0 && (
              <Badge variant="secondary" className="ml-1">{connectedIntegrations.size}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="mcp" className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            <span className="hidden sm:inline">MCP Servers</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span className="hidden sm:inline">API Connectors</span>
            {apiConnectors.length > 0 && (
              <Badge variant="secondary" className="ml-1">{apiConnectors.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* INTEGRATIONS TAB */}
        <TabsContent value="integrations" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Business System Integrations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Connected Count */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Connected Integrations</span>
                  <Badge variant="secondary">{connectedIntegrations.size} / {INTEGRATIONS.length}</Badge>
                </div>

                {/* Recommended Tools Widget */}
                {connectedIntegrations.size === 0 && (
                  <div className="p-4 border-2 border-primary/20 bg-primary/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-medium">Recommended for Your Agent</h4>
                      {currentBlueprint && (
                        <Badge variant="secondary" className="text-xs">From Template</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recommendedTools.map((tool, idx) => (
                        <Badge key={idx} variant="outline">{tool}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Integration Grid */}
                <div className="grid gap-3">
                  {INTEGRATIONS.map((integration) => {
                    const isConnected = connectedIntegrations.has(integration.id);
                    return (
                      <div
                        key={integration.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isConnected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            {isConnected ? <Check className="h-5 w-5" /> : <Link2 className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{integration.name}</p>
                            <p className="text-xs text-muted-foreground">{integration.category}</p>
                          </div>
                        </div>
                        <Button
                          variant={isConnected ? "outline" : "default"}
                          size="sm"
                          onClick={() => toggleIntegration(integration.id)}
                          disabled={isLoading}
                        >
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isConnected ? 'Disconnect' : 'Connect'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MCP SERVERS TAB */}
        <TabsContent value="mcp" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plug className="h-4 w-4" />
                MCP Servers (Machine Control Protocol)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ConnectStep systemId={builderId} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* API CONNECTORS TAB */}
        <TabsContent value="api" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="h-4 w-4" />
                Custom API Connectors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>API Name *</Label>
                  <Input 
                    placeholder="My Custom API" 
                    value={apiForm.name}
                    onChange={e => setApiForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Endpoint URL *</Label>
                  <Input 
                    placeholder="https://api.example.com/v1" 
                    value={apiForm.endpoint}
                    onChange={e => setApiForm(f => ({ ...f, endpoint: e.target.value }))}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select value={apiForm.method} onValueChange={v => setApiForm(f => ({ ...f, method: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Auth Type</Label>
                    <Select value={apiForm.authType} onValueChange={v => setApiForm(f => ({ ...f, authType: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bearer Token">Bearer Token</SelectItem>
                        <SelectItem value="API Key">API Key</SelectItem>
                        <SelectItem value="Basic Auth">Basic Auth</SelectItem>
                        <SelectItem value="None">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Headers (JSON)</Label>
                  <Input 
                    placeholder='{"Authorization": "Bearer TOKEN"}' 
                    value={apiForm.headers}
                    onChange={e => setApiForm(f => ({ ...f, headers: e.target.value }))}
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleAddApiConnector}
                  disabled={isAddingApi || !apiForm.name || !apiForm.endpoint}
                >
                  {isAddingApi ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plug className="h-4 w-4 mr-2" />}
                  Add API Connector
                </Button>
              </div>

              {/* Existing API Connectors */}
              {apiConnectors.length > 0 ? (
                <div className="mt-6 space-y-3">
                  <h4 className="text-sm font-medium">Configured APIs</h4>
                  {apiConnectors.map((connector) => (
                    <div key={connector.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{connector.name}</p>
                        <p className="text-xs text-muted-foreground">{connector.method} {connector.endpoint}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveApiConnector(connector.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 p-6 border-2 border-dashed rounded-lg text-center">
                  <Code className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No custom APIs configured yet
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
