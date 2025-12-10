/**
 * DC Builder Step 2: Blueprint (Refactored)
 * Customer-first with KPI threshold editing
 * Quick Edit: Simple toggles + threshold editors
 * Architect: Full technical details
 */

import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { useBuilderMode } from '../BuilderModeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Bot, Database, Activity, Thermometer, Zap, Wind, Network, Building2, Cpu, DollarSign, Shield, ChevronDown, Settings2, Target } from 'lucide-react';
import { KPIThresholdGrid } from './KPIThresholdEditor';
import type { DCKPIConfig } from '@/types/dcTwinBuilder';
import { useState } from 'react';

const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  thermal: <Thermometer className="h-4 w-4" />,
  power: <Zap className="h-4 w-4" />,
  cooling: <Wind className="h-4 w-4" />,
  network: <Network className="h-4 w-4" />,
  facility: <Building2 className="h-4 w-4" />,
  workload: <Cpu className="h-4 w-4" />,
  sovereignty: <Shield className="h-4 w-4" />,
  carbon: <DollarSign className="h-4 w-4" />,
  financial: <DollarSign className="h-4 w-4" />,
  incidents: <Activity className="h-4 w-4" />,
  retail: <Building2 className="h-4 w-4" />,
};

export function DCStep2Blueprint() {
  const { agents, dataSources, kpis, toggleAgent, toggleDataSource, toggleKPI, updateKPIs } = useDCTwinBuilderStore();
  const { isArchitectMode, isQuickMode } = useBuilderMode();
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());

  const toggleDomain = (domain: string) => {
    const newExpanded = new Set(expandedDomains);
    if (newExpanded.has(domain)) {
      newExpanded.delete(domain);
    } else {
      newExpanded.add(domain);
    }
    setExpandedDomains(newExpanded);
  };

  const groupedAgents = agents.reduce((acc, agent) => {
    const domain = agent.domain || 'general';
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push(agent);
    return acc;
  }, {} as Record<string, typeof agents>);

  const groupedDataSources = dataSources.reduce((acc, ds) => {
    const domain = ds.domain || 'general';
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push(ds);
    return acc;
  }, {} as Record<string, typeof dataSources>);

  const groupedKPIs = kpis.reduce((acc, kpi) => {
    const domain = kpi.domain || 'general';
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push(kpi);
    return acc;
  }, {} as Record<string, typeof kpis>);

  const handleUpdateKPI = (kpiId: string, updates: Partial<DCKPIConfig>) => {
    const updatedKpis = kpis.map((k) =>
      k.id === kpiId ? { ...k, ...updates } : k
    );
    updateKPIs(updatedKpis);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="agents" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Agents ({agents.filter(a => a.enabled).length}/{agents.length})
          </TabsTrigger>
          <TabsTrigger value="kpis" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            KPIs ({kpis.filter(k => k.enabled).length}/{kpis.length})
          </TabsTrigger>
          {isArchitectMode && (
            <TabsTrigger value="data-sources" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Sources ({dataSources.filter(d => d.enabled).length}/{dataSources.length})
            </TabsTrigger>
          )}
          {isQuickMode && (
            <TabsTrigger value="data-sources" className="flex items-center gap-2 text-muted-foreground">
              <Database className="h-4 w-4" />
              Data Sources
            </TabsTrigger>
          )}
        </TabsList>

        {/* Agents Tab */}
        <TabsContent value="agents" className="mt-4 space-y-4">
          {isQuickMode ? (
            // Quick Mode: Simplified agent view
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Agents</CardTitle>
                <CardDescription>
                  Enable or disable AI agents that will monitor and optimize your data centre
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {agents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {DOMAIN_ICONS[agent.domain] || <Bot className="h-4 w-4" />}
                        <span className="font-medium">{agent.name}</span>
                        <Badge variant={agent.enabled ? 'default' : 'secondary'} className="text-xs">
                          {agent.domain}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{agent.description}</p>
                    </div>
                    <Switch checked={agent.enabled} onCheckedChange={(enabled) => toggleAgent(agent.id, enabled)} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            // Architect Mode: Full details with technical info
            Object.entries(groupedAgents).map(([domain, domainAgents]) => (
              <Collapsible key={domain} open={expandedDomains.has(domain)} onOpenChange={() => toggleDomain(domain)}>
                <Card>
                  <CardHeader className="pb-3">
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <CardTitle className="flex items-center gap-2 text-base">
                        {DOMAIN_ICONS[domain] || <Bot className="h-4 w-4" />}
                        {domain.charAt(0).toUpperCase() + domain.slice(1)} Agents
                        <Badge variant="secondary" className="text-xs">
                          {domainAgents.filter(a => a.enabled).length}/{domainAgents.length}
                        </Badge>
                      </CardTitle>
                      <ChevronDown className={`h-4 w-4 transition-transform ${expandedDomains.has(domain) ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {domainAgents.map((agent) => (
                      <div key={agent.id} className="flex items-start justify-between rounded-lg border p-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{agent.name}</span>
                            <Badge variant={agent.enabled ? 'default' : 'secondary'} className="text-xs">
                              {agent.domain}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{agent.description}</p>
                          
                          <CollapsibleContent className="mt-3 space-y-2">
                            <div className="grid gap-2 text-xs">
                              <div>
                                <span className="font-medium text-muted-foreground">Input Signals:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {agent.inputSignals.map((signal, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">{signal}</Badge>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-muted-foreground">Output Actions:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {agent.outputActions.map((action, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">{action}</Badge>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-muted-foreground">KPIs Impacted:</span>
                                <span className="ml-2">{agent.kpisImpacted.join(', ')}</span>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </div>
                        <Switch checked={agent.enabled} onCheckedChange={(enabled) => toggleAgent(agent.id, enabled)} />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </Collapsible>
            ))
          )}
        </TabsContent>

        {/* KPIs Tab - Now with threshold editing (P0) */}
        <TabsContent value="kpis" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-5 w-5 text-primary" />
                KPI Targets & Thresholds
              </CardTitle>
              <CardDescription>
                Set your performance goals and alert thresholds. Click any KPI to customize targets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isQuickMode ? (
                // Quick Mode: Only show enabled KPIs with threshold editors
                <KPIThresholdGrid />
              ) : (
                // Architect Mode: Full KPI management with enable/disable
                <div className="space-y-4">
                  {Object.entries(groupedKPIs).map(([domain, domainKPIs]) => (
                    <div key={domain} className="space-y-2">
                      <h4 className="text-sm font-medium capitalize flex items-center gap-2">
                        {DOMAIN_ICONS[domain] || <Activity className="h-4 w-4" />}
                        {domain} KPIs
                        <Badge variant="secondary" className="text-xs">
                          {domainKPIs.filter(k => k.enabled).length}/{domainKPIs.length}
                        </Badge>
                      </h4>
                      <div className="grid gap-3 md:grid-cols-2">
                        {domainKPIs.map((kpi) => (
                          <div key={kpi.id} className="rounded-lg border p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{kpi.name}</span>
                              <Switch checked={kpi.enabled} onCheckedChange={(enabled) => toggleKPI(kpi.id, enabled)} />
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{kpi.description}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{kpi.unit}</Badge>
                              <span className="text-xs text-muted-foreground">
                                Target: {kpi.target} | Warn: {kpi.warningThreshold} | Critical: {kpi.criticalThreshold}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Sources Tab */}
        <TabsContent value="data-sources" className="mt-4 space-y-4">
          {isQuickMode ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Data Sources</CardTitle>
                <CardDescription>
                  Select which data sources to connect for monitoring
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {dataSources.map((ds) => (
                  <div key={ds.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {DOMAIN_ICONS[ds.domain] || <Database className="h-4 w-4" />}
                        <span className="font-medium">{ds.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{ds.description}</p>
                    </div>
                    <Switch checked={ds.enabled} onCheckedChange={(enabled) => toggleDataSource(ds.id, enabled)} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            // Architect Mode: Full data source details
            Object.entries(groupedDataSources).map(([domain, domainSources]) => (
              <Card key={domain}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {DOMAIN_ICONS[domain] || <Database className="h-4 w-4" />}
                    {domain.charAt(0).toUpperCase() + domain.slice(1)} Data Sources
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {domainSources.map((ds) => (
                    <div key={ds.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ds.name}</span>
                          <Badge variant="outline" className="text-xs">{ds.sourceType}</Badge>
                          <Badge variant="secondary" className="text-xs">{ds.protocol}</Badge>
                          <Badge variant="outline" className="text-xs">{ds.updateFrequency}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{ds.description}</p>
                      </div>
                      <Switch checked={ds.enabled} onCheckedChange={(enabled) => toggleDataSource(ds.id, enabled)} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
