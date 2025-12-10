/**
 * DC Builder Step 4: Workflows & Scenarios
 * Simplified for Quick Edit mode, full details in Architect mode
 */

import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { useBuilderMode } from '../BuilderModeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Workflow, PlayCircle, AlertTriangle, Clock, ChevronDown, Zap } from 'lucide-react';
import { useState } from 'react';

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
  const { isArchitectMode } = useBuilderMode();
  const [openWorkflows, setOpenWorkflows] = useState<Record<string, boolean>>({});

  const toggleWorkflowDetails = (id: string) => {
    setOpenWorkflows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Scenarios & Automation</h2>
        <p className="text-sm text-muted-foreground">
          Enable simulation scenarios and automated responses for your twin.
        </p>
      </div>

      <Tabs defaultValue="scenarios" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scenarios">
            <PlayCircle className="h-4 w-4 mr-2" />
            Scenarios ({scenarios.filter(s => s.enabled).length}/{scenarios.length})
          </TabsTrigger>
          <TabsTrigger value="workflows">
            <Workflow className="h-4 w-4 mr-2" />
            Workflows ({workflows.filter(w => w.enabled).length}/{workflows.length})
          </TabsTrigger>
        </TabsList>

        {/* Scenarios Tab - Customer-friendly */}
        <TabsContent value="scenarios" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Simulation Scenarios</CardTitle>
              <CardDescription>
                Test how your data centre responds to different conditions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {scenarios.map((scenario) => (
                  <div key={scenario.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <span className="font-medium">{scenario.name}</span>
                        <p className="text-sm text-muted-foreground mt-1">
                          {scenario.description}
                        </p>
                      </div>
                      <Switch 
                        checked={scenario.enabled} 
                        onCheckedChange={(enabled) => toggleScenario(scenario.id, enabled)} 
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={SEVERITY_COLORS[scenario.severity] || 'bg-secondary'}>
                        {scenario.severity}
                      </Badge>
                      <Badge variant="outline">{scenario.category}</Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {Math.round(scenario.durationSeconds / 60)} min
                      </div>
                    </div>

                    {scenario.kpisImpacted.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="text-xs font-medium text-muted-foreground">
                          KPIs Impacted:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {scenario.kpisImpacted.slice(0, 4).map((kpi, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {kpi}
                            </Badge>
                          ))}
                          {scenario.kpisImpacted.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{scenario.kpisImpacted.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automated Workflows</CardTitle>
              <CardDescription>
                {isArchitectMode 
                  ? 'Configure trigger-action workflows with full details'
                  : 'Enable automated responses to operational events'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="rounded-lg border">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3 flex-1">
                      <Zap className="h-4 w-4 text-primary" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{workflow.name}</span>
                          <Badge className={SEVERITY_COLORS[workflow.severity] || 'bg-secondary'}>
                            {workflow.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {workflow.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={workflow.enabled} 
                        onCheckedChange={(enabled) => toggleWorkflow(workflow.id, enabled)} 
                      />
                      {isArchitectMode && (
                        <Collapsible open={openWorkflows[workflow.id]}>
                          <CollapsibleTrigger 
                            onClick={() => toggleWorkflowDetails(workflow.id)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            <ChevronDown className={`h-4 w-4 transition-transform ${openWorkflows[workflow.id] ? 'rotate-180' : ''}`} />
                          </CollapsibleTrigger>
                        </Collapsible>
                      )}
                    </div>
                  </div>

                  {/* Architect Mode: Show trigger details */}
                  {isArchitectMode && (
                    <Collapsible open={openWorkflows[workflow.id]}>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-0 border-t bg-muted/30">
                          <div className="space-y-2 pt-3">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                              <span className="text-sm font-medium">Trigger Condition:</span>
                            </div>
                            <code className="block text-xs bg-muted p-2 rounded font-mono">
                              {workflow.trigger.condition}
                            </code>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
