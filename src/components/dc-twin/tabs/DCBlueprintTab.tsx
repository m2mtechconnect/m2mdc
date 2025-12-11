/**
 * DC Twin Design Tab (formerly Blueprint Tab)
 * READ-ONLY summary view of Design when accessed from DC Twin page
 * All UX content sourced from centralized UX_STRINGS
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, Database, BarChart3, GitBranch, CheckCircle2, AlertCircle,
  Thermometer, Zap, Wind, Network, Cpu, Globe, DollarSign, AlertTriangle,
  ExternalLink, Lock, Eye, FileText
} from 'lucide-react';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import type { DCAgentDomain } from '@/types/dcTwinBuilder';
import { ExecutiveSummaryBlock } from '@/components/blueprint/ExecutiveSummaryBlock';
import { DomainHealthMap } from '@/components/blueprint/DomainHealthMap';
import { DependencyGraph } from '@/components/blueprint/DependencyGraph';
import { ChangeLogPanel } from '@/components/blueprint/ChangeLogPanel';
import { AgentHealthPanel } from '@/components/blueprint/AgentHealthPanel';
import { KPIEnhancementsPanel } from '@/components/blueprint/KPIEnhancementsPanel';
import { WorkflowEnhancementsPanel } from '@/components/blueprint/WorkflowEnhancementsPanel';
import { BlueprintViewProvider } from '@/context/BlueprintViewContext';
import { DesignViewHeader } from '@/components/blueprint/DesignViewHeader';
import { BLUEPRINT, WORKFLOWS, getAgentSummary } from '@/ux';

const domainIcons: Record<DCAgentDomain, React.ReactNode> = {
  thermal: <Thermometer className="h-4 w-4" />,
  power: <Zap className="h-4 w-4" />,
  cooling: <Wind className="h-4 w-4" />,
  network: <Network className="h-4 w-4" />,
  workload: <Cpu className="h-4 w-4" />,
  financial: <DollarSign className="h-4 w-4" />,
  incidents: <AlertTriangle className="h-4 w-4" />,
  sovereignty: <Globe className="h-4 w-4" />,
  retail: <Bot className="h-4 w-4" />,
};

export function DCBlueprintTab() {
  const navigate = useNavigate();
  const { agents, dataSources, kpis, workflows, overview } = useDCTwinBuilderStore();
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  
  const enabledAgents = agents.filter(a => a.enabled);
  const activeDataSources = dataSources.filter(ds => ds.enabled);
  const enabledKpis = kpis.filter(k => k.enabled);

  const handleOpenDesigner = () => {
    navigate('/blueprint/default');
  };
  
  return (
    <BlueprintViewProvider mode="designView">
      <div className="space-y-6">
        {/* DESIGN VIEW HEADER - Indicates this is READ-ONLY */}
        <DesignViewHeader
          twinName={overview.twinName || 'Data Centre Configuration'}
          twinId="default"
          facilityLocation={overview.facilityLocation || 'Montreal, QC'}
          capacityKw={overview.capacityKw || 10000}
          tier={overview.tier || 'Tier IV'}
          renewablePercent={overview.renewablePercent || 95}
        />

        {/* Blueprint Intro - from UX_STRINGS */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{BLUEPRINT.TITLE}</CardTitle>
            <CardDescription>{BLUEPRINT.INTRO}</CardDescription>
          </CardHeader>
        </Card>

        {/* Executive Summary Block */}
        <ExecutiveSummaryBlock />
        
        {/* Domain Health Map */}
        <DomainHealthMap />
        
        {/* Dependency Graph & Change Log */}
        <div className="grid lg:grid-cols-2 gap-4">
          <DependencyGraph />
          <ChangeLogPanel />
        </div>
      
      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents" className="gap-2">
            <Bot className="h-4 w-4" />
            Agents ({enabledAgents.length})
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Database className="h-4 w-4" />
            Data Sources ({activeDataSources.length})
          </TabsTrigger>
          <TabsTrigger value="kpis" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            KPIs ({enabledKpis.length})
          </TabsTrigger>
          <TabsTrigger value="workflows" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Workflows ({workflows.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="agents" className="space-y-4">
          {/* Agent Health Panel */}
          <AgentHealthPanel />
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <Card key={agent.id} className={!agent.enabled ? 'opacity-50' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        {domainIcons[agent.domain]}
                      </div>
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                    </div>
                    <Badge variant={agent.enabled ? 'default' : 'secondary'}>
                      {agent.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{agent.description}</p>
                  
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Input Signals</p>
                    <div className="flex flex-wrap gap-1">
                      {agent.inputSignals.slice(0, 3).map((signal, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{signal}</Badge>
                      ))}
                      {agent.inputSignals.length > 3 && (
                        <Badge variant="outline" className="text-[10px]">+{agent.inputSignals.length - 3}</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">KPIs Impacted</p>
                    <div className="flex flex-wrap gap-1">
                      {agent.kpisImpacted.slice(0, 2).map((kpi, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{kpi}</Badge>
                      ))}
                      {agent.kpisImpacted.length > 2 && (
                        <Badge variant="secondary" className="text-[10px]">+{agent.kpisImpacted.length - 2}</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="data" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {dataSources.map((ds) => (
              <Card key={ds.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      {ds.name}
                    </CardTitle>
                    <Badge variant={ds.enabled ? 'default' : 'secondary'}>
                      {ds.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">{ds.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Type: <span className="font-medium">{ds.sourceType}</span></span>
                    <span>Protocol: <span className="font-medium">{ds.protocol}</span></span>
                    <span>Refresh: <span className="font-medium">{ds.updateFrequency}</span></span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{ds.domain}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="kpis" className="space-y-4">
          {/* KPI Enhancement Panel - shown when a KPI is selected */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="grid md:grid-cols-2 gap-4">
                {kpis.map((kpi) => (
                  <Card 
                    key={kpi.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      !kpi.enabled ? 'opacity-50' : ''
                    } ${selectedKpiId === kpi.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedKpiId(kpi.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">{kpi.name}</span>
                        </div>
                        {kpi.enabled ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Target</span>
                          <span className="font-mono">{kpi.target} {kpi.unit}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Direction</span>
                          <Badge variant="outline" className="text-[10px]">
                            {kpi.direction.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px] text-warning">
                            Warn: {kpi.warningThreshold}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] text-destructive">
                            Crit: {kpi.criticalThreshold}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            {/* KPI Detail Panel */}
            <div>
              <KPIEnhancementsPanel />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="workflows" className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              {workflows.map((wf) => (
                <Card 
                  key={wf.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedWorkflowId === wf.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedWorkflowId(wf.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <GitBranch className="h-4 w-4" />
                        {wf.name}
                      </CardTitle>
                      <Badge variant={wf.enabled ? 'default' : 'secondary'}>
                        {wf.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{wf.description}</p>
                    
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Trigger</p>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{wf.trigger.signal} {wf.trigger.condition}</code>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Root Cause</p>
                        <p className="text-xs">{wf.rootCauseLogic}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Mitigation</p>
                        <p className="text-xs">{wf.recommendedMitigation}</p>
                      </div>
                    </div>
                    
                    {wf.autoActions.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Auto Actions</p>
                        <div className="flex flex-wrap gap-1">
                          {wf.autoActions.map((action, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">{action}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Workflow Detail Panel */}
            <div>
              <WorkflowEnhancementsPanel 
                workflowId={selectedWorkflowId || undefined}
                workflowName={workflows.find(w => w.id === selectedWorkflowId)?.name}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </BlueprintViewProvider>
  );
}
