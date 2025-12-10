/**
 * DC Builder Step 3: Integrations
 * Configure external integrations and intelligence settings
 * All 8 required integration templates defined per spec
 */

import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Brain, Database, Link, Plus, Trash2, Thermometer, Zap, Cpu, X, 
  Activity, Server, Gauge, Shield, Container, BarChart3 
} from 'lucide-react';

// All 8 required integration templates per QA spec
const INTEGRATION_TEMPLATES = [
  { 
    id: 'gpu-telemetry', 
    name: 'GPU Telemetry', 
    type: 'sensor', 
    icon: Cpu,
    description: 'HPC/GPU utilization, queues, tenants from NVIDIA DCGM or similar',
    dataSources: ['gpu-telemetry'],
    category: 'compute'
  },
  { 
    id: 'rack-pdu', 
    name: 'Rack/PDU Monitor', 
    type: 'sensor', 
    icon: Zap,
    description: 'Power distribution unit metrics and per-rack power consumption',
    dataSources: ['dcim-telemetry'],
    category: 'power'
  },
  { 
    id: 'cooling-parser', 
    name: 'Cooling System Parser', 
    type: 'sensor', 
    icon: Thermometer,
    description: 'CRAC/CRAH unit status, supply/return temps, refrigerant levels',
    dataSources: ['dcim-telemetry'],
    category: 'cooling'
  },
  { 
    id: 'prometheus', 
    name: 'Prometheus', 
    type: 'telemetry', 
    icon: Activity,
    description: 'Ingest metrics from Prometheus for GPU, node, and infra telemetry',
    dataSources: ['gpu-telemetry', 'dcim-telemetry'],
    category: 'monitoring'
  },
  { 
    id: 'dcim-bms', 
    name: 'DCIM/BMS', 
    type: 'api', 
    icon: Server,
    description: 'Data Center Infrastructure Management and Building Management System integration',
    dataSources: ['dcim-telemetry', 'energy-feeds'],
    category: 'infrastructure'
  },
  { 
    id: 'carbon-intensity-api', 
    name: 'Carbon Intensity API', 
    type: 'api', 
    icon: Gauge,
    description: 'Real-time grid carbon intensity (gCO₂/kWh) and renewable mix data',
    dataSources: ['carbon-intensity'],
    category: 'sustainability'
  },
  { 
    id: 'policy-compliance-source', 
    name: 'Policy/Compliance Source', 
    type: 'database', 
    icon: Shield,
    description: 'PIPEDA, internal policies, SLAs, and sovereignty compliance rules',
    dataSources: ['compliance-policies'],
    category: 'compliance'
  },
  { 
    id: 'slurm-k8s-telemetry', 
    name: 'Slurm/K8s Telemetry', 
    type: 'api', 
    icon: Container,
    description: 'Workload scheduler metrics from Slurm or Kubernetes clusters',
    dataSources: ['gpu-telemetry'],
    category: 'workload'
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  compute: 'bg-blue-500/10 text-blue-700 border-blue-200',
  power: 'bg-amber-500/10 text-amber-700 border-amber-200',
  cooling: 'bg-cyan-500/10 text-cyan-700 border-cyan-200',
  monitoring: 'bg-purple-500/10 text-purple-700 border-purple-200',
  infrastructure: 'bg-slate-500/10 text-slate-700 border-slate-200',
  sustainability: 'bg-green-500/10 text-green-700 border-green-200',
  compliance: 'bg-red-500/10 text-red-700 border-red-200',
  workload: 'bg-indigo-500/10 text-indigo-700 border-indigo-200',
};

export function DCStep3Integrations() {
  const { 
    integrations, 
    intelligence, 
    addIntegration, 
    removeIntegration, 
    updateIntelligence, 
    addSampleQuery, 
    removeSampleQuery 
  } = useDCTwinBuilderStore();

  const handleAddIntegration = (template: typeof INTEGRATION_TEMPLATES[0]) => {
    // Check if already added
    if (integrations.some(i => i.id.startsWith(template.id))) {
      return;
    }
    addIntegration({ 
      id: `${template.id}-${Date.now()}`, 
      name: template.name, 
      type: template.type, 
      connected: false, 
      config: {
        description: template.description,
        dataSources: template.dataSources,
        category: template.category,
      }
    });
  };

  const isIntegrationAdded = (templateId: string) => {
    return integrations.some(i => i.id.startsWith(templateId));
  };

  return (
    <div className="space-y-6">
      {/* External Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5 text-primary" />
            External Integrations
          </CardTitle>
          <CardDescription>
            Connect data sources, APIs, and monitoring systems ({integrations.length} active)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Active Integrations */}
          {integrations.length > 0 && (
            <div className="space-y-3">
              <Label>Active Integrations</Label>
              {integrations.map((integration) => (
                <div key={integration.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{integration.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{integration.type}</Badge>
                        <Badge 
                          variant={integration.connected ? 'default' : 'secondary'} 
                          className="text-xs"
                        >
                          {integration.connected ? 'Connected' : 'Not Connected'}
                        </Badge>
                        {integration.config?.category && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${CATEGORY_COLORS[integration.config.category] || ''}`}
                          >
                            {integration.config.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeIntegration(integration.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Available Integration Templates */}
          <div className="space-y-3">
            <Label>Available Integrations ({INTEGRATION_TEMPLATES.length} templates)</Label>
            <div className="grid gap-3 md:grid-cols-2">
              {INTEGRATION_TEMPLATES.map((template) => {
                const isAdded = isIntegrationAdded(template.id);
                const Icon = template.icon;
                return (
                  <div
                    key={template.id}
                    className={`relative rounded-lg border p-3 transition-colors ${
                      isAdded ? 'bg-muted/50 border-primary/30' : 'hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${CATEGORY_COLORS[template.category] || 'bg-muted'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{template.name}</span>
                          {isAdded ? (
                            <Badge variant="secondary" className="text-xs">Added</Badge>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 px-2"
                              onClick={() => handleAddIntegration(template)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {template.description}
                        </p>
                        <div className="flex items-center gap-1 mt-2">
                          <Badge variant="outline" className="text-xs">{template.type}</Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${CATEGORY_COLORS[template.category] || ''}`}
                          >
                            {template.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Intelligence Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Intelligence Settings
          </CardTitle>
          <CardDescription>
            Configure the AI model and behavior for this digital twin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Model Provider</Label>
              <Select 
                value={intelligence.llmProvider} 
                onValueChange={(value) => updateIntelligence({ llmProvider: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Google (Gemini)</SelectItem>
                  <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Select 
                value={intelligence.llmModel} 
                onValueChange={(value) => updateIntelligence({ llmModel: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                  <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                  <SelectItem value="google/gemini-3-pro-preview">Gemini 3 Pro Preview</SelectItem>
                  <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Temperature</Label>
              <span className="text-sm text-muted-foreground">{intelligence.temperature.toFixed(2)}</span>
            </div>
            <Slider 
              value={[intelligence.temperature]} 
              min={0} 
              max={1} 
              step={0.05} 
              onValueChange={([value]) => updateIntelligence({ temperature: value })} 
            />
            <p className="text-xs text-muted-foreground">
              Lower values = more focused, higher values = more creative
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Prompt</Label>
            <Textarea 
              id="systemPrompt" 
              value={intelligence.systemPrompt} 
              onChange={(e) => updateIntelligence({ systemPrompt: e.target.value })} 
              rows={4} 
              placeholder="Define the AI assistant's behavior and expertise..."
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <span className="font-medium">RAG Enabled</span>
              <p className="text-sm text-muted-foreground">Enable retrieval augmented generation</p>
            </div>
            <Switch 
              checked={intelligence.ragEnabled} 
              onCheckedChange={(checked) => updateIntelligence({ ragEnabled: checked })} 
            />
          </div>

          <div className="space-y-3">
            <Label>Sample Queries</Label>
            {intelligence.sampleQueries.map((query, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input value={query} readOnly className="flex-1" />
                <Button variant="ghost" size="icon" onClick={() => removeSampleQuery(index)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => addSampleQuery('What is the current PUE?')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Query
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
