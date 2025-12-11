/**
 * Dependency Graph
 * Shows relationships: Agents → KPIs → Workflows → Scenarios
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot,
  BarChart3,
  GitBranch,
  PlayCircle,
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

  const renderNodeList = (nodes: DependencyNode[]) => (
    <ScrollArea className="h-44">
      <div className="space-y-1.5 pr-2">
        {nodes.map(node => {
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
              <Icon className={cn('h-3 w-3 shrink-0', styles.text)} />
              <span className="truncate">{node.name.replace(' Agent', '')}</span>
            </div>
          );
        })}
        {nodes.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No items</p>
        )}
      </div>
    </ScrollArea>
  );

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Network className="h-4 w-4" />
            Dependencies
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {graph.nodes.length} nodes
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="agents" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-8">
            <TabsTrigger value="agents" className="text-xs px-1">
              <Bot className="h-3 w-3 mr-1" />
              {agentNodes.length}
            </TabsTrigger>
            <TabsTrigger value="kpis" className="text-xs px-1">
              <BarChart3 className="h-3 w-3 mr-1" />
              {kpiNodes.length}
            </TabsTrigger>
            <TabsTrigger value="workflows" className="text-xs px-1">
              <GitBranch className="h-3 w-3 mr-1" />
              {workflowNodes.length}
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="text-xs px-1">
              <PlayCircle className="h-3 w-3 mr-1" />
              {scenarioNodes.length}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="agents" className="mt-2">
            {renderNodeList(agentNodes)}
          </TabsContent>
          <TabsContent value="kpis" className="mt-2">
            {renderNodeList(kpiNodes)}
          </TabsContent>
          <TabsContent value="workflows" className="mt-2">
            {renderNodeList(workflowNodes)}
          </TabsContent>
          <TabsContent value="scenarios" className="mt-2">
            {renderNodeList(scenarioNodes)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
