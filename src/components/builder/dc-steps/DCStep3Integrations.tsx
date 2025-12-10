/**
 * DC Builder Step 3: Integrations
 * Configure external integrations and intelligence settings
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
import { Brain, Database, Link, Plus, Trash2, Thermometer, Zap, Cpu, X } from 'lucide-react';

const INTEGRATION_TEMPLATES = [
  { id: 'gpu-telemetry', name: 'GPU Telemetry', type: 'sensor', icon: Cpu },
  { id: 'rack-pdu', name: 'Rack/PDU Monitor', type: 'sensor', icon: Zap },
  { id: 'cooling-parser', name: 'Cooling System Parser', type: 'sensor', icon: Thermometer },
];

export function DCStep3Integrations() {
  const { integrations, intelligence, addIntegration, removeIntegration, updateIntelligence, addSampleQuery, removeSampleQuery } = useDCTwinBuilderStore();

  const handleAddIntegration = (template: typeof INTEGRATION_TEMPLATES[0]) => {
    addIntegration({ id: `${template.id}-${Date.now()}`, name: template.name, type: template.type, connected: false, config: {} });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Link className="h-5 w-5 text-primary" />External Integrations</CardTitle>
          <CardDescription>Connect data sources, APIs, and monitoring systems</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integrations.length > 0 && (
            <div className="space-y-3">
              <Label>Active Integrations</Label>
              {integrations.map((integration) => (
                <div key={integration.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5" />
                    <div>
                      <span className="font-medium">{integration.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{integration.type}</Badge>
                        <Badge variant={integration.connected ? 'default' : 'secondary'} className="text-xs">
                          {integration.connected ? 'Connected' : 'Not Connected'}
                        </Badge>
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
          <div className="space-y-3">
            <Label>Add Integration</Label>
            <div className="grid gap-2 md:grid-cols-3">
              {INTEGRATION_TEMPLATES.map((template) => (
                <Button key={template.id} variant="outline" className="h-auto py-3 justify-start" onClick={() => handleAddIntegration(template)}>
                  <template.icon className="h-4 w-4 mr-2" />
                  <div className="text-left"><div className="font-medium">{template.name}</div><div className="text-xs text-muted-foreground">{template.type}</div></div>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" />AI Intelligence Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Model Provider</Label>
              <Select value={intelligence.llmProvider} onValueChange={(value) => updateIntelligence({ llmProvider: value })}>
                <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Google (Gemini)</SelectItem>
                  <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={intelligence.llmModel} onValueChange={(value) => updateIntelligence({ llmModel: value })}>
                <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                  <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><Label>Temperature</Label><span className="text-sm text-muted-foreground">{intelligence.temperature.toFixed(2)}</span></div>
            <Slider value={[intelligence.temperature]} min={0} max={1} step={0.05} onValueChange={([value]) => updateIntelligence({ temperature: value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Prompt</Label>
            <Textarea id="systemPrompt" value={intelligence.systemPrompt} onChange={(e) => updateIntelligence({ systemPrompt: e.target.value })} rows={4} />
          </div>
          <div className="flex items-center justify-between">
            <div><span className="font-medium">RAG Enabled</span><p className="text-sm text-muted-foreground">Enable retrieval augmented generation</p></div>
            <Switch checked={intelligence.ragEnabled} onCheckedChange={(checked) => updateIntelligence({ ragEnabled: checked })} />
          </div>
          <div className="space-y-3">
            <Label>Sample Queries</Label>
            {intelligence.sampleQueries.map((query, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input value={query} readOnly className="flex-1" />
                <Button variant="ghost" size="icon" onClick={() => removeSampleQuery(index)}><X className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addSampleQuery('What is the current PUE?')}><Plus className="h-4 w-4 mr-2" />Add Query</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
