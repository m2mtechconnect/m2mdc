/**
 * Dependency Graph
 * Shows relationships: Agents → KPIs → Workflows → Scenarios
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot,
  BarChart3,
  GitBranch,
  PlayCircle,
  ArrowRight,
  ChevronRight,
  Network,
} from 'lucide-react';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { cn } from '@/lib/utils';

interface DependencyNode {
  id: string;
  name: string;
  type: 'agent' | 'kpi' | 'workflow' | 'scenario';
  enabled: boolean;
  connections: string[];
}

export function DependencyGraph({ className }: { className?: string }) {
  const { agents, kpis, workflows, scenarios } = useDCTwinBuilderStore();

  // Build dependency graph
  const graph = useMemo(() => {
    const nodes: DependencyNode[] = [];
    const connections: { from: string; to: string; type: string }[] = [];

    // Add agents
    agents.filter(a => a.enabled).forEach(agent => {
      nodes.push({
        id: `agent-${agent.id}`,
        name: agent.name,
        type: 'agent',
        enabled: agent.enabled,
        connections: agent.kpisImpacted.map(k => `kpi-${k}`),
      });

      // Agent → KPI connections
      agent.kpisImpacted.forEach(kpiId => {
        connections.push({
          from: `agent-${agent.id}`,
          to: `kpi-${kpiId}`,
          type: 'agent-kpi',
        });
      });
    });

    // Add KPIs
    kpis.filter(k => k.enabled).forEach(kpi => {
      nodes.push({
        id: `kpi-${kpi.id}`,
        name: kpi.name,
        type: 'kpi',
        enabled: kpi.enabled,
        connections: [],
      });
    });

    // Add workflows
    workflows.filter(w => w.enabled).forEach(workflow => {
      nodes.push({
        id: `workflow-${workflow.id}`,
        name: workflow.name,
        type: 'workflow',
        enabled: workflow.enabled,
        connections: [],
      });

      // KPI → Workflow connections (via trigger signals)
      const triggerSignal = workflow.trigger.signal.toLowerCase();
      kpis.forEach(kpi => {
        if (triggerSignal.includes(kpi.id.toLowerCase()) || 
            kpi.name.toLowerCase().includes(triggerSignal.split('_')[0])) {
          connections.push({
            from: `kpi-${kpi.id}`,
            to: `workflow-${workflow.id}`,
            type: 'kpi-workflow',
          });
        }
      });
    });

    // Add scenarios
    scenarios.filter(s => s.enabled).forEach(scenario => {
      nodes.push({
        id: `scenario-${scenario.id}`,
        name: scenario.name,
        type: 'scenario',
        enabled: scenario.enabled,
        connections: [],
      });

      // Workflow → Scenario connections (via impacted KPIs)
      scenario.kpisImpacted.forEach(kpiId => {
        workflows.filter(w => w.enabled).forEach(workflow => {
          const triggerSignal = workflow.trigger.signal.toLowerCase();
          if (triggerSignal.includes(kpiId.toLowerCase())) {
            connections.push({
              from: `workflow-${workflow.id}`,
              to: `scenario-${scenario.id}`,
              type: 'workflow-scenario',
            });
          }
        });
      });
    });

    return { nodes, connections };
  }, [agents, kpis, workflows, scenarios]);

  // Group nodes by type
  const agentNodes = graph.nodes.filter(n => n.type === 'agent');
  const kpiNodes = graph.nodes.filter(n => n.type === 'kpi');
  const workflowNodes = graph.nodes.filter(n => n.type === 'workflow');
  const scenarioNodes = graph.nodes.filter(n => n.type === 'scenario');

  const getNodeStyles = (type: DependencyNode['type']) => {
    switch (type) {
      case 'agent':
        return { bg: 'bg-primary/10', border: 'border-primary/30', text: 'text-primary', icon: Bot };
      case 'kpi':
        return { bg: 'bg-info/10', border: 'border-info/30', text: 'text-info', icon: BarChart3 };
      case 'workflow':
        return { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning', icon: GitBranch };
      case 'scenario':
        return { bg: 'bg-success/10', border: 'border-success/30', text: 'text-success', icon: PlayCircle };
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Network className="h-4 w-4" />
            System Dependency Graph
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {graph.nodes.length} nodes • {graph.connections.length} connections
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-6">
        {/* Flow Legend */}
        <div className="flex items-center justify-center gap-2 mb-4 p-2 rounded-lg bg-muted/50">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
            <Bot className="h-3 w-3 mr-1" />
            Agents
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline" className="bg-info/10 text-info border-info/30 text-xs">
            <BarChart3 className="h-3 w-3 mr-1" />
            KPIs
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">
            <GitBranch className="h-3 w-3 mr-1" />
            Workflows
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
            <PlayCircle className="h-3 w-3 mr-1" />
            Scenarios
          </Badge>
        </div>

        {/* Graph Columns */}
        <div className="grid grid-cols-4 gap-3">
          {/* Agents Column */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground text-center mb-2">
              Agents ({agentNodes.length})
            </p>
            <ScrollArea className="h-48">
              <div className="space-y-1.5">
                {agentNodes.slice(0, 8).map(node => {
                  const styles = getNodeStyles(node.type);
                  const Icon = styles.icon;
                  return (
                    <div
                      key={node.id}
                      className={cn(
                        'p-2 rounded border text-xs flex items-center gap-1.5',
                        styles.bg,
                        styles.border
                      )}
                    >
                      <Icon className={cn('h-3 w-3', styles.text)} />
                      <span className="truncate">{node.name.replace(' Agent', '')}</span>
                    </div>
                  );
                })}
                {agentNodes.length > 8 && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    +{agentNodes.length - 8} more
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* KPIs Column */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground text-center mb-2">
              KPIs ({kpiNodes.length})
            </p>
            <ScrollArea className="h-48">
              <div className="space-y-1.5">
                {kpiNodes.slice(0, 8).map(node => {
                  const styles = getNodeStyles(node.type);
                  const Icon = styles.icon;
                  return (
                    <div
                      key={node.id}
                      className={cn(
                        'p-2 rounded border text-xs flex items-center gap-1.5',
                        styles.bg,
                        styles.border
                      )}
                    >
                      <Icon className={cn('h-3 w-3', styles.text)} />
                      <span className="truncate">{node.name}</span>
                    </div>
                  );
                })}
                {kpiNodes.length > 8 && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    +{kpiNodes.length - 8} more
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Workflows Column */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground text-center mb-2">
              Workflows ({workflowNodes.length})
            </p>
            <ScrollArea className="h-48">
              <div className="space-y-1.5">
                {workflowNodes.slice(0, 8).map(node => {
                  const styles = getNodeStyles(node.type);
                  const Icon = styles.icon;
                  return (
                    <div
                      key={node.id}
                      className={cn(
                        'p-2 rounded border text-xs flex items-center gap-1.5',
                        styles.bg,
                        styles.border
                      )}
                    >
                      <Icon className={cn('h-3 w-3', styles.text)} />
                      <span className="truncate">{node.name}</span>
                    </div>
                  );
                })}
                {workflowNodes.length > 8 && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    +{workflowNodes.length - 8} more
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Scenarios Column */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground text-center mb-2">
              Scenarios ({scenarioNodes.length})
            </p>
            <ScrollArea className="h-48">
              <div className="space-y-1.5">
                {scenarioNodes.slice(0, 8).map(node => {
                  const styles = getNodeStyles(node.type);
                  const Icon = styles.icon;
                  return (
                    <div
                      key={node.id}
                      className={cn(
                        'p-2 rounded border text-xs flex items-center gap-1.5',
                        styles.bg,
                        styles.border
                      )}
                    >
                      <Icon className={cn('h-3 w-3', styles.text)} />
                      <span className="truncate">{node.name}</span>
                    </div>
                  );
                })}
                {scenarioNodes.length > 8 && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    +{scenarioNodes.length - 8} more
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Connection Summary */}
        <div className="mt-3 pt-2 border-t">
          <p className="text-[10px] text-muted-foreground text-center">
            This graph shows how agents monitor KPIs, which trigger workflows that respond to scenarios. All components work together to maintain optimal data centre operations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
