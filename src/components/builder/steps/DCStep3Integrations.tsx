/**
 * DC Twin Builder Step 3 - Integrations
 * Connect data sources to real infrastructure integrations
 */

import { useState } from 'react';
import { 
  Plug, Link2, Code, Check, Database, BarChart, Layers, 
  Activity, Cloud, Server, Plus, Trash2, Loader2 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { toast } from 'sonner';
import { DCCard, DCSectionHeader, DCKPITile } from '@/components/dc-ui';
import { BUILDER } from '@/ux';

const AVAILABLE_INTEGRATIONS = [
  { id: 'prometheus', name: 'Prometheus', type: 'monitoring', icon: BarChart, description: 'Metrics collection and alerting' },
  { id: 'grafana', name: 'Grafana', type: 'monitoring', icon: BarChart, description: 'Visualization and dashboards' },
  { id: 'dcim-nlyte', name: 'Nlyte DCIM', type: 'dcim', icon: Database, description: 'Data Centre Infrastructure Management' },
  { id: 'dcim-sunbird', name: 'Sunbird DCIM', type: 'dcim', icon: Database, description: 'DCIM and Power Management' },
  { id: 'kubernetes', name: 'Kubernetes', type: 'orchestration', icon: Layers, description: 'Container orchestration' },
  { id: 'slurm', name: 'Slurm', type: 'orchestration', icon: Layers, description: 'HPC workload manager' },
  { id: 'energy-grid', name: 'Energy Grid API', type: 'energy', icon: Activity, description: 'Real-time carbon intensity' },
  { id: 'aws', name: 'AWS CloudWatch', type: 'cloud', icon: Cloud, description: 'AWS metrics and logs' },
  { id: 'azure', name: 'Azure Monitor', type: 'cloud', icon: Cloud, description: 'Azure monitoring' },
  { id: 'gcp', name: 'Google Cloud Ops', type: 'cloud', icon: Cloud, description: 'GCP monitoring' },
];

export function DCStep3Integrations() {
  const { 
    integrations,
    dataSources,
    addIntegration,
    removeIntegration,
    markStepComplete,
  } = useDCTwinBuilderStore();
  
  const [activeTab, setActiveTab] = useState('available');
  const [isAdding, setIsAdding] = useState(false);
  
  // API connector form state
  const [apiForm, setApiForm] = useState({
    name: '',
    endpoint: '',
    method: 'GET',
    authType: 'Bearer Token',
  });

  const connectedIntegrations = new Set(integrations.map(i => i.id));

  const handleConnect = async (integration: typeof AVAILABLE_INTEGRATIONS[0]) => {
    setIsAdding(true);
    try {
      addIntegration({
        id: integration.id,
        name: integration.name,
        type: integration.type,
        connected: true,
        config: {},
      });
      toast.success(`Connected to ${integration.name}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDisconnect = (integrationId: string) => {
    removeIntegration(integrationId);
    toast.success('Integration disconnected');
  };

  const handleAddApiConnector = () => {
    if (!apiForm.name || !apiForm.endpoint) {
      toast.error('Please fill in API name and endpoint');
      return;
    }

    addIntegration({
      id: `api-${Date.now()}`,
      name: apiForm.name,
      type: 'api',
      connected: true,
      config: {
        endpoint: apiForm.endpoint,
        method: apiForm.method,
        authType: apiForm.authType,
      },
    });

    toast.success(`Added API connector: ${apiForm.name}`);
    setApiForm({ name: '', endpoint: '', method: 'GET', authType: 'Bearer Token' });
  };

  const enabledDataSources = dataSources.filter(ds => ds.enabled).length;

  return (
    <div className="space-y-6 max-w-[920px] mx-auto">
      <DCSectionHeader
        title={BUILDER.STEPS.STEP_3.TITLE}
        subtitle={BUILDER.STEPS.STEP_3.SUBTITLE}
        icon={<Plug className="h-5 w-5" />}
      />

      {/* Stats Row */}
      <div className="grid gap-4 grid-cols-3">
        <DCKPITile
          label="Connected"
          value={String(integrations.length)}
          sublabel="integrations"
          status={integrations.length >= 2 ? 'normal' : 'warning'}
          icon={<Link2 className="h-4 w-4" />}
        />
        <DCKPITile
          label="Data Sources"
          value={String(enabledDataSources)}
          sublabel="enabled"
          status={enabledDataSources >= 3 ? 'normal' : 'warning'}
          icon={<Database className="h-4 w-4" />}
        />
        <DCKPITile
          label="API Connectors"
          value={String(integrations.filter(i => i.type === 'api').length)}
          sublabel="custom"
          status="info"
          icon={<Code className="h-4 w-4" />}
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Available
          </TabsTrigger>
          <TabsTrigger value="connected" className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            Connected
            {integrations.length > 0 && <Badge className="ml-1">{integrations.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Custom API
          </TabsTrigger>
        </TabsList>

        {/* Available Integrations */}
        <TabsContent value="available" className="space-y-4 mt-4">
          {['monitoring', 'dcim', 'orchestration', 'energy', 'cloud'].map((category) => {
            const categoryIntegrations = AVAILABLE_INTEGRATIONS.filter(i => i.type === category);
            if (categoryIntegrations.length === 0) return null;
            
            const categoryLabel = {
              monitoring: 'Monitoring & Observability',
              dcim: 'DCIM Platforms',
              orchestration: 'Workload Orchestration',
              energy: 'Energy & Carbon',
              cloud: 'Cloud Providers',
            }[category];

            return (
              <DCCard 
                key={category}
                title={categoryLabel}
                icon={<Server className="h-4 w-4" />}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {categoryIntegrations.map((integration) => {
                    const isConnected = connectedIntegrations.has(integration.id);
                    const IconComponent = integration.icon;
                    
                    return (
                      <div 
                        key={integration.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          isConnected 
                            ? 'bg-success/10 border-success/30' 
                            : 'bg-muted/50 border-border'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                            isConnected ? 'bg-success text-success-foreground' : 'bg-muted'
                          }`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{integration.name}</p>
                            <p className="text-xs text-muted-foreground">{integration.description}</p>
                          </div>
                        </div>
                        <Button
                          variant={isConnected ? "outline" : "default"}
                          size="sm"
                          onClick={() => isConnected ? handleDisconnect(integration.id) : handleConnect(integration)}
                          disabled={isAdding}
                        >
                          {isConnected ? <Check className="h-4 w-4" /> : 'Connect'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </DCCard>
            );
          })}
        </TabsContent>

        {/* Connected Integrations */}
        <TabsContent value="connected" className="space-y-4 mt-4">
          <DCCard 
            title="Connected Integrations" 
            icon={<Check className="h-4 w-4" />}
          >
            {integrations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Server className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No integrations connected yet</p>
                <p className="text-sm">Connect integrations from the Available tab</p>
              </div>
            ) : (
              <div className="space-y-3">
                {integrations.map((integration) => (
                  <div 
                    key={integration.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-success text-success-foreground flex items-center justify-center">
                        <Check className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{integration.name}</p>
                        <Badge variant="outline" className="text-xs mt-1">{integration.type}</Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnect(integration.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </DCCard>
        </TabsContent>

        {/* Custom API Tab */}
        <TabsContent value="api" className="space-y-4 mt-4">
          <DCCard 
            title="Custom API Connector" 
            subtitle="Add custom API endpoints for data integration"
            icon={<Code className="h-4 w-4" />}
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>API Name</Label>
                  <Input 
                    placeholder="e.g., DCIM API" 
                    value={apiForm.name}
                    onChange={(e) => setApiForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Endpoint URL</Label>
                  <Input 
                    placeholder="https://api.example.com/v1" 
                    value={apiForm.endpoint}
                    onChange={(e) => setApiForm(f => ({ ...f, endpoint: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select value={apiForm.method} onValueChange={(v) => setApiForm(f => ({ ...f, method: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Auth Type</Label>
                  <Select value={apiForm.authType} onValueChange={(v) => setApiForm(f => ({ ...f, authType: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bearer Token">Bearer Token</SelectItem>
                      <SelectItem value="API Key">API Key</SelectItem>
                      <SelectItem value="Basic Auth">Basic Auth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button onClick={handleAddApiConnector} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add API Connector
              </Button>
            </div>
          </DCCard>
        </TabsContent>
      </Tabs>

      {/* Complete Step */}
      <DCCard className="bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Integrations Configured?</p>
            <p className="text-xs text-muted-foreground">
              Connect at least 2 integrations for full functionality.
            </p>
          </div>
          <Button 
            onClick={() => {
              markStepComplete(3);
              toast.success('Integrations saved');
            }}
          >
            <Check className="h-4 w-4 mr-2" />
            Save & Continue
          </Button>
        </div>
      </DCCard>
    </div>
  );
}
