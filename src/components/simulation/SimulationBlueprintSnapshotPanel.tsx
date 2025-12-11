/**
 * Simulation Blueprint Snapshot Panel
 * Read-only view of the blueprint used for a specific simulation run
 * Uses identical components as Designer but in snapshot (read-only) mode
 */

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  FileText, 
  ExternalLink, 
  Clock, 
  Hash, 
  Bot, 
  Activity, 
  Workflow, 
  Target,
  Info,
  Server,
  MapPin,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BlueprintViewProvider } from '@/context/BlueprintViewContext';
import { useSimulationSnapshotStore } from '@/stores/simulationSnapshotStore';

// Import universal blueprint components - same as Designer uses
import { ExecutiveSummaryBlock } from '@/components/blueprint/ExecutiveSummaryBlock';
import { DomainHealthMap } from '@/components/blueprint/DomainHealthMap';
import { DependencyGraph } from '@/components/blueprint/DependencyGraph';
import { AgentHealthPanel } from '@/components/blueprint/AgentHealthPanel';
import { KPIEnhancementsPanel } from '@/components/blueprint/KPIEnhancementsPanel';

interface SimulationBlueprintSnapshotPanelProps {
  twinId?: string;
}

export function SimulationBlueprintSnapshotPanel({ twinId }: SimulationBlueprintSnapshotPanelProps) {
  const navigate = useNavigate();
  const { currentSnapshot, isSnapshotPanelOpen, setSnapshotPanelOpen } = useSimulationSnapshotStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'kpis' | 'workflows' | 'scenarios'>('overview');

  if (!currentSnapshot) return null;

  const { config: blueprint, simulationRunId, blueprintVersion, capturedAt, activeAgentIds, activeKpiIds, activeScenarioIds, triggeredWorkflowIds } = currentSnapshot;

  // Filter to active items for simulation focus
  const activeAgents = activeAgentIds 
    ? blueprint.agents.filter(a => activeAgentIds.includes(a.id))
    : blueprint.agents;
  
  const activeKpis = activeKpiIds
    ? blueprint.kpis.filter(k => activeKpiIds.includes(k.id))
    : blueprint.kpis.slice(0, 12); // Show top 12 by default
  
  const activeScenarios = activeScenarioIds
    ? blueprint.simulationScenarios.filter(s => activeScenarioIds.includes(s.id))
    : blueprint.simulationScenarios;
  
  const activeWorkflows = triggeredWorkflowIds
    ? blueprint.workflows.filter(w => triggeredWorkflowIds.includes(w.id))
    : blueprint.workflows.filter(w => w.enabled);

  const handleOpenDesigner = () => {
    setSnapshotPanelOpen(false);
    navigate(`/data-centre-twin/${twinId || 'default'}?view=blueprint`);
  };

  return (
    <Sheet open={isSnapshotPanelOpen} onOpenChange={setSnapshotPanelOpen}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-5 w-5 text-primary" />
                <SheetTitle className="text-lg">Blueprint Snapshot</SheetTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>This is a read-only snapshot of the exact blueprint configuration used for this simulation run. To make changes, open the Blueprint Designer.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-sm text-muted-foreground">
                {blueprint.name}
              </p>
            </div>
            <Badge variant="secondary" className="font-mono">
              v{blueprintVersion}
            </Badge>
          </div>

          {/* Snapshot Metadata */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Run ID</p>
                <p className="text-sm font-mono truncate max-w-[120px]" title={simulationRunId}>
                  {simulationRunId.slice(0, 8)}...
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Captured</p>
                <p className="text-sm">
                  {new Date(capturedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm truncate">{blueprint.location}</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            <div className="text-center p-2 rounded bg-muted/50">
              <p className="text-lg font-bold text-primary">{activeAgents.length}</p>
              <p className="text-xs text-muted-foreground">Agents</p>
            </div>
            <div className="text-center p-2 rounded bg-muted/50">
              <p className="text-lg font-bold text-primary">{activeKpis.length}</p>
              <p className="text-xs text-muted-foreground">KPIs</p>
            </div>
            <div className="text-center p-2 rounded bg-muted/50">
              <p className="text-lg font-bold text-primary">{activeWorkflows.length}</p>
              <p className="text-xs text-muted-foreground">Workflows</p>
            </div>
            <div className="text-center p-2 rounded bg-muted/50">
              <p className="text-lg font-bold text-primary">{activeScenarios.length}</p>
              <p className="text-xs text-muted-foreground">Scenarios</p>
            </div>
          </div>
        </SheetHeader>

        {/* Wrapped in simulation snapshot mode context */}
        <BlueprintViewProvider 
          mode="simulationSnapshot" 
          snapshotMeta={{
            simulationRunId,
            blueprintVersion,
            capturedAt,
          }}
        >
          <div className="mt-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview" className="gap-1">
                  <Activity className="h-3.5 w-3.5" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="agents" className="gap-1">
                  <Bot className="h-3.5 w-3.5" />
                  Agents
                </TabsTrigger>
                <TabsTrigger value="kpis" className="gap-1">
                  <Target className="h-3.5 w-3.5" />
                  KPIs
                </TabsTrigger>
                <TabsTrigger value="workflows" className="gap-1">
                  <Workflow className="h-3.5 w-3.5" />
                  Workflows
                </TabsTrigger>
                <TabsTrigger value="scenarios" className="gap-1">
                  <Zap className="h-3.5 w-3.5" />
                  Scenarios
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-4">
                {/* Facility Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      Facility Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Capacity</p>
                        <p className="font-medium">{blueprint.capacityKw} kW</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Racks</p>
                        <p className="font-medium">{blueprint.racks}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Tier</p>
                        <p className="font-medium">Tier {blueprint.tier}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Jurisdiction</p>
                        <p className="font-medium">{blueprint.jurisdiction}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Domain Health - Read Only */}
                <DomainHealthMap />
                
                {/* Dependency Graph - Read Only */}
                <DependencyGraph />
              </TabsContent>

              <TabsContent value="agents" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Active Agents ({activeAgents.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {activeAgents.map(agent => (
                        <div key={agent.id} className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Bot className="h-4 w-4 text-primary" />
                              <span className="font-medium">{agent.name}</span>
                              <Badge variant="outline" className="text-xs capitalize">{agent.type}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{agent.description}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">{agent.domain}</Badge>
                              <Badge variant={agent.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                {agent.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="kpis" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Tracked KPIs ({activeKpis.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {activeKpis.map(kpi => (
                        <div key={kpi.id} className="p-3 rounded-lg border bg-muted/30">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{kpi.name}</span>
                            <Badge variant="outline" className="text-xs">{kpi.unit}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{kpi.description}</p>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Target: {kpi.targetRange.ideal}</span>
                            <span className={kpi.direction === 'higher' ? 'text-green-600' : 'text-blue-600'}>
                              {kpi.direction === 'higher' ? '↑ Higher is better' : '↓ Lower is better'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="workflows" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Active Workflows ({activeWorkflows.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {activeWorkflows.map(workflow => (
                        <div key={workflow.id} className="p-3 rounded-lg border bg-muted/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{workflow.name}</span>
                            <Badge 
                              variant={workflow.autoRun ? 'default' : 'outline'}
                              className="text-xs"
                            >
                              {workflow.autoRun ? 'Auto' : 'Manual'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Trigger: {workflow.triggerCondition}
                          </p>
                          <div className="flex gap-2">
                            <Badge variant="secondary" className="text-xs">{workflow.domain}</Badge>
                            <Badge variant={
                              workflow.severity === 'critical' || workflow.severity === 'emergency' ? 'destructive' :
                              workflow.severity === 'warning' ? 'default' : 'secondary'
                            } className="text-xs">
                              {workflow.severity}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="scenarios" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Simulation Scenarios ({activeScenarios.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {activeScenarios.map(scenario => (
                        <div key={scenario.id} className="p-3 rounded-lg border bg-muted/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{scenario.name}</span>
                            <Badge variant={
                              scenario.severity === 'critical' || scenario.severity === 'emergency' ? 'destructive' :
                              scenario.severity === 'warning' ? 'default' : 'secondary'
                            } className="text-xs">
                              {scenario.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{scenario.description}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{scenario.durationMinutes} min</span>
                            <span className="mx-2">•</span>
                            <span>{scenario.kpiImpacts.length} KPI impacts</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </BlueprintViewProvider>

        {/* Footer Action */}
        <div className="mt-6 pt-4 border-t">
          <Button 
            onClick={handleOpenDesigner}
            variant="outline" 
            className="w-full gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open in Blueprint Designer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
