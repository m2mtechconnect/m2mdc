import { useState, useEffect } from 'react';
import { Plug, Link2, Code, Check, Info, Sparkles, Trash2, Loader2, Zap, Wind, Cpu, Thermometer, Network, Calculator, Leaf, Shield, Database, Layers, BarChart, Activity, Flame, FileCheck, DollarSign } from 'lucide-react';
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

// Data Centre specific tools
const DATA_CENTRE_TOOLS = [
  { id: 'power-telemetry', name: 'Power Telemetry', category: 'Telemetry', icon: Zap, description: 'Real-time power consumption, PDU metrics, UPS status' },
  { id: 'cooling-telemetry', name: 'Cooling Telemetry', category: 'Telemetry', icon: Wind, description: 'CRAH/CRAC units, chiller status, zone temps' },
  { id: 'gpu-metrics', name: 'GPU Metrics', category: 'Telemetry', icon: Cpu, description: 'GPU utilization, memory, workload distribution' },
  { id: 'thermal-sensors', name: 'Thermal Sensors', category: 'Telemetry', icon: Thermometer, description: 'Rack temps, hotspot detection, airflow' },
  { id: 'network-fabric', name: 'Network Fabric', category: 'Telemetry', icon: Network, description: 'Switch utilization, InfiniBand, latency' },
  { id: 'pue-model', name: 'PUE Calculator', category: 'Model', icon: Calculator, description: 'Real-time PUE calculation and forecasting' },
  { id: 'carbon-model', name: 'Carbon Footprint', category: 'Model', icon: Leaf, description: 'gCO₂e/kWh tracking, emissions per GPU-hour' },
  { id: 'thermal-model', name: 'Thermal Prediction', category: 'Model', icon: Flame, description: 'Hotspot prediction, thermal runaway detection' },
  { id: 'financial-model', name: 'Financial Model', category: 'Model', icon: DollarSign, description: 'Cost per GPU-hour, energy cost forecasting' },
  { id: 'sovereignty-checker', name: 'Sovereignty Compliance', category: 'Compliance', icon: Shield, description: 'Data residency validation, jurisdiction tagging' },
  { id: 'audit-logger', name: 'Audit Logger', category: 'Compliance', icon: FileCheck, description: 'Immutable audit trail for SOC2, ISO 27001' },
  { id: 'dcim-integration', name: 'DCIM Integration', category: 'Integration', icon: Database, description: 'Data Centre Infrastructure Management' },
  { id: 'k8s-integration', name: 'Kubernetes/Slurm', category: 'Integration', icon: Layers, description: 'Container and HPC job orchestration' },
  { id: 'prometheus-integration', name: 'Prometheus/Grafana', category: 'Integration', icon: BarChart, description: 'Metrics collection and visualization' },
  { id: 'energy-api', name: 'Energy Grid API', category: 'Integration', icon: Activity, description: 'Real-time carbon intensity and pricing' },
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

      <Tabs defaultValue="datacentre" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="datacentre" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            <span className="hidden sm:inline">Data Centre</span>
          </TabsTrigger>
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
            <span className="hidden sm:inline">API</span>
            {apiConnectors.length > 0 && (
              <Badge variant="secondary" className="ml-1">{apiConnectors.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* DATA CENTRE TOOLS TAB */}
        <TabsContent value="datacentre" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                Data Centre Tools & Models
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Info Banner */}
                <div className="p-4 border-2 border-primary/20 bg-primary/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-medium">Recommended for Data Centre Twin</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    These tools are pre-configured for power, cooling, GPU, and sovereignty monitoring.
                  </p>
                </div>

                {/* Telemetry Tools */}
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    Telemetry
                  </h4>
                  <div className="grid gap-3">
                    {DATA_CENTRE_TOOLS.filter(t => t.category === 'Telemetry').map((tool) => {
                      const IconComponent = tool.icon;
                      const isEnabled = tools.some(t => t.id === tool.id);
                      return (
                        <div
                          key={tool.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{tool.name}</p>
                              <p className="text-xs text-muted-foreground">{tool.description}</p>
                            </div>
                          </div>
                          <Button
                            variant={isEnabled ? "outline" : "default"}
                            size="sm"
                            onClick={() => toggleIntegration(tool.id)}
                            disabled={isLoading}
                          >
                            {isEnabled ? 'Disable' : 'Enable'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Model Tools */}
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-green-500" />
                    Models & Analytics
                  </h4>
                  <div className="grid gap-3">
                    {DATA_CENTRE_TOOLS.filter(t => t.category === 'Model').map((tool) => {
                      const IconComponent = tool.icon;
                      const isEnabled = tools.some(t => t.id === tool.id);
                      return (
                        <div
                          key={tool.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{tool.name}</p>
                              <p className="text-xs text-muted-foreground">{tool.description}</p>
                            </div>
                          </div>
                          <Button
                            variant={isEnabled ? "outline" : "default"}
                            size="sm"
                            onClick={() => toggleIntegration(tool.id)}
                            disabled={isLoading}
                          >
                            {isEnabled ? 'Disable' : 'Enable'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Compliance Tools */}
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-500" />
                    Compliance & Governance
                  </h4>
                  <div className="grid gap-3">
                    {DATA_CENTRE_TOOLS.filter(t => t.category === 'Compliance').map((tool) => {
                      const IconComponent = tool.icon;
                      const isEnabled = tools.some(t => t.id === tool.id);
                      return (
                        <div
                          key={tool.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{tool.name}</p>
                              <p className="text-xs text-muted-foreground">{tool.description}</p>
                            </div>
                          </div>
                          <Button
                            variant={isEnabled ? "outline" : "default"}
                            size="sm"
                            onClick={() => toggleIntegration(tool.id)}
                            disabled={isLoading}
                          >
                            {isEnabled ? 'Disable' : 'Enable'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Integration Tools */}
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Database className="h-4 w-4 text-orange-500" />
                    Infrastructure Integrations
                  </h4>
                  <div className="grid gap-3">
                    {DATA_CENTRE_TOOLS.filter(t => t.category === 'Integration').map((tool) => {
                      const IconComponent = tool.icon;
                      const isEnabled = tools.some(t => t.id === tool.id);
                      return (
                        <div
                          key={tool.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{tool.name}</p>
                              <p className="text-xs text-muted-foreground">{tool.description}</p>
                            </div>
                          </div>
                          <Button
                            variant={isEnabled ? "outline" : "default"}
                            size="sm"
                            onClick={() => toggleIntegration(tool.id)}
                            disabled={isLoading}
                          >
                            {isEnabled ? 'Disable' : 'Enable'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
