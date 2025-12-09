import { useState, useEffect } from 'react';
import { Plug, Link2, Code, Check, Info, Sparkles, Trash2, Loader2, Zap, Wind, Cpu, Thermometer, Network, Calculator, Leaf, Shield, Database, Layers, BarChart, Activity, Flame, FileCheck, DollarSign } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWizardBuilderStore, BuilderTool } from '@/stores/wizardBuilderStore';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { ConnectStep } from '@/components/builder/ConnectStep';
import { toast } from 'sonner';
import { DCCard, DCSectionHeader } from '@/components/dc-ui';

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

const DATA_CENTRE_TOOLS = [
  { id: 'power-telemetry', name: 'Power Telemetry', category: 'Telemetry', icon: Zap, description: 'PDU metrics, UPS status, power consumption' },
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
  
  const [apiForm, setApiForm] = useState({
    name: '',
    endpoint: '',
    method: 'GET',
    authType: 'Bearer Token',
    headers: ''
  });
  const [isAddingApi, setIsAddingApi] = useState(false);

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

  const toggleTool = async (toolId: string, toolList: typeof DATA_CENTRE_TOOLS | typeof INTEGRATIONS) => {
    const tool = toolList.find(t => t.id === toolId);
    if (!tool) return;

    const existingTool = tools.find(t => t.id === toolId);
    
    let updatedTools: BuilderTool[];
    if (existingTool) {
      updatedTools = tools.filter(t => t.id !== toolId);
    } else {
      updatedTools = [...tools, {
        id: toolId,
        type: 'integration' as const,
        name: tool.name,
        category: tool.category,
        enabled: true,
        connected: false,
        config: {}
      }];
    }
    
    try {
      await setTools(updatedTools);
      toast.success(existingTool ? `Disabled ${tool.name}` : `Enabled ${tool.name}`);
    } catch (err) {
      toast.error('Failed to update tool');
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
  const enabledDCTools = tools.filter(t => DATA_CENTRE_TOOLS.some(dt => dt.id === t.id)).length;

  const renderToolCard = (tool: typeof DATA_CENTRE_TOOLS[0], isEnabled: boolean) => {
    const IconComponent = tool.icon;
    return (
      <div
        key={tool.id}
        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
          isEnabled 
            ? 'bg-dc-primary/10 border-dc-primary/30' 
            : 'bg-dc-surface border-dc-border hover:border-dc-primary/20'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            isEnabled ? 'bg-dc-primary text-dc-primary-foreground' : 'bg-dc-surface-elevated'
          }`}>
            <IconComponent className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-sm">{tool.name}</p>
            <p className="text-xs text-muted-foreground">{tool.description}</p>
          </div>
        </div>
        <Button
          variant={isEnabled ? "outline" : "default"}
          size="sm"
          onClick={() => toggleTool(tool.id, DATA_CENTRE_TOOLS)}
          disabled={isLoading}
          className={isEnabled ? 'border-dc-primary/30' : ''}
        >
          {isEnabled ? 'Disable' : 'Enable'}
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-[920px] mx-auto">
      <DCSectionHeader
        title="Tools & Integrations"
        subtitle="Connect telemetry, models, and infrastructure systems"
        icon={<Plug className="h-5 w-5" />}
      />

      <Tabs defaultValue="datacentre" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-dc-surface">
          <TabsTrigger value="datacentre" className="flex items-center gap-2 data-[state=active]:bg-dc-primary/10">
            <Cpu className="h-4 w-4" />
            <span className="hidden sm:inline">DC Tools</span>
            {enabledDCTools > 0 && <Badge className="ml-1 bg-dc-primary/20 text-dc-primary">{enabledDCTools}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2 data-[state=active]:bg-dc-primary/10">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Apps</span>
            {connectedIntegrations.size > 0 && <Badge variant="secondary" className="ml-1">{connectedIntegrations.size}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="mcp" className="flex items-center gap-2 data-[state=active]:bg-dc-primary/10">
            <Plug className="h-4 w-4" />
            <span className="hidden sm:inline">MCP</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2 data-[state=active]:bg-dc-primary/10">
            <Code className="h-4 w-4" />
            <span className="hidden sm:inline">API</span>
            {apiConnectors.length > 0 && <Badge variant="secondary" className="ml-1">{apiConnectors.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="datacentre" className="space-y-4 mt-6">
          {/* Telemetry Tools */}
          <DCCard 
            title="Telemetry Tools" 
            subtitle="Real-time data collection from infrastructure"
            icon={<Activity className="h-4 w-4 text-dc-info" />}
          >
            <div className="space-y-3">
              {DATA_CENTRE_TOOLS.filter(t => t.category === 'Telemetry').map((tool) => 
                renderToolCard(tool, tools.some(t => t.id === tool.id))
              )}
            </div>
          </DCCard>

          {/* Model Tools */}
          <DCCard 
            title="Analytics Models" 
            subtitle="PUE, thermal prediction, and financial analysis"
            icon={<Calculator className="h-4 w-4 text-dc-success" />}
          >
            <div className="space-y-3">
              {DATA_CENTRE_TOOLS.filter(t => t.category === 'Model').map((tool) => 
                renderToolCard(tool, tools.some(t => t.id === tool.id))
              )}
            </div>
          </DCCard>

          {/* Compliance Tools */}
          <DCCard 
            title="Compliance & Governance" 
            subtitle="Sovereignty validation and audit logging"
            icon={<Shield className="h-4 w-4 text-dc-sovereignty" />}
          >
            <div className="space-y-3">
              {DATA_CENTRE_TOOLS.filter(t => t.category === 'Compliance').map((tool) => 
                renderToolCard(tool, tools.some(t => t.id === tool.id))
              )}
            </div>
          </DCCard>

          {/* Integration Tools */}
          <DCCard 
            title="Infrastructure Integrations" 
            subtitle="DCIM, orchestration, and monitoring platforms"
            icon={<Database className="h-4 w-4 text-dc-power" />}
          >
            <div className="space-y-3">
              {DATA_CENTRE_TOOLS.filter(t => t.category === 'Integration').map((tool) => 
                renderToolCard(tool, tools.some(t => t.id === tool.id))
              )}
            </div>
          </DCCard>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4 mt-6">
          <DCCard title="Business Applications" icon={<Link2 className="h-4 w-4" />}>
            <div className="grid gap-3 sm:grid-cols-2">
              {INTEGRATIONS.map((integration) => {
                const isConnected = connectedIntegrations.has(integration.id);
                return (
                  <div
                    key={integration.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isConnected ? 'bg-dc-primary/10 border-dc-primary/30' : 'bg-dc-surface border-dc-border'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-sm">{integration.name}</p>
                      <p className="text-xs text-muted-foreground">{integration.category}</p>
                    </div>
                    <Button
                      variant={isConnected ? "outline" : "default"}
                      size="sm"
                      onClick={() => toggleTool(integration.id, INTEGRATIONS)}
                      disabled={isLoading}
                    >
                      {isConnected ? <Check className="h-4 w-4" /> : 'Connect'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </DCCard>
        </TabsContent>

        <TabsContent value="mcp" className="mt-6">
          <DCCard title="MCP Servers" subtitle="Model Context Protocol servers for extended capabilities" icon={<Plug className="h-4 w-4" />}>
            <ConnectStep systemId={builderId || ''} />
          </DCCard>
        </TabsContent>

        <TabsContent value="api" className="space-y-4 mt-6">
          <DCCard title="Custom API Connectors" icon={<Code className="h-4 w-4" />}>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>API Name</Label>
                  <Input 
                    placeholder="e.g., DCIM API" 
                    value={apiForm.name}
                    onChange={(e) => setApiForm(f => ({ ...f, name: e.target.value }))}
                    className="bg-dc-surface border-dc-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Endpoint URL</Label>
                  <Input 
                    placeholder="https://api.example.com/v1" 
                    value={apiForm.endpoint}
                    onChange={(e) => setApiForm(f => ({ ...f, endpoint: e.target.value }))}
                    className="bg-dc-surface border-dc-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select value={apiForm.method} onValueChange={(v) => setApiForm(f => ({ ...f, method: v }))}>
                    <SelectTrigger className="bg-dc-surface border-dc-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Auth Type</Label>
                  <Select value={apiForm.authType} onValueChange={(v) => setApiForm(f => ({ ...f, authType: v }))}>
                    <SelectTrigger className="bg-dc-surface border-dc-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bearer Token">Bearer Token</SelectItem>
                      <SelectItem value="API Key">API Key</SelectItem>
                      <SelectItem value="Basic Auth">Basic Auth</SelectItem>
                      <SelectItem value="OAuth2">OAuth2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button onClick={handleAddApiConnector} disabled={isAddingApi} className="w-full">
                {isAddingApi ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Code className="h-4 w-4 mr-2" />}
                Add API Connector
              </Button>

              {apiConnectors.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-dc-border">
                  <Label>Configured APIs</Label>
                  {apiConnectors.map((api) => (
                    <div key={api.id} className="flex items-center justify-between p-3 bg-dc-surface rounded-lg border border-dc-border">
                      <div>
                        <p className="font-medium text-sm">{api.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{api.endpoint}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveApiConnector(api.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DCCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
