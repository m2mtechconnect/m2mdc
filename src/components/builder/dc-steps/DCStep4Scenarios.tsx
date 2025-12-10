/**
 * DC Builder Step 4: Workflows & Scenarios
 */

import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Workflow, PlayCircle, AlertTriangle, Clock, Zap, Thermometer, Shield, DollarSign } from 'lucide-react';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-500 text-white',
  warning: 'bg-yellow-500 text-black',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-blue-500 text-white',
  info: 'bg-blue-500 text-white',
};

export function DCStep4Scenarios() {
  const { workflows, scenarios, toggleWorkflow, toggleScenario } = useDCTwinBuilderStore();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="workflows" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="workflows"><Workflow className="h-4 w-4 mr-2" />Workflows ({workflows.filter(w => w.enabled).length}/{workflows.length})</TabsTrigger>
          <TabsTrigger value="scenarios"><PlayCircle className="h-4 w-4 mr-2" />Scenarios ({scenarios.filter(s => s.enabled).length}/{scenarios.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Automated Workflows</CardTitle><CardDescription>Configure trigger-action workflows</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{workflow.name}</span>
                        <Badge className={SEVERITY_COLORS[workflow.severity] || 'bg-secondary'}>{workflow.severity}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{workflow.description}</p>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span className="text-sm">Trigger: {workflow.trigger.condition}</span>
                      </div>
                    </div>
                    <Switch checked={workflow.enabled} onCheckedChange={(enabled) => toggleWorkflow(workflow.id, enabled)} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Simulation Scenarios</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {scenarios.map((scenario) => (
                  <div key={scenario.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between mb-3">
                      <span className="font-medium">{scenario.name}</span>
                      <Switch checked={scenario.enabled} onCheckedChange={(enabled) => toggleScenario(scenario.id, enabled)} />
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{scenario.description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={SEVERITY_COLORS[scenario.severity] || 'bg-secondary'}>{scenario.severity}</Badge>
                      <Badge variant="outline">{scenario.category}</Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />{Math.round(scenario.durationSeconds / 60)}min
                      </div>
                    </div>
                    {scenario.kpisImpacted.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="text-xs font-medium text-muted-foreground">KPIs Impacted:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {scenario.kpisImpacted.slice(0, 3).map((kpi, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">{kpi}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
