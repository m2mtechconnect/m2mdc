/**
 * DC Builder Step 2: Blueprint
 * Configure agents, data sources, and KPIs
 */

import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Database, Activity, Thermometer, Zap, Wind, Network, Building2, Cpu, DollarSign, Shield } from 'lucide-react';

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
};

export function DCStep2Blueprint() {
  const { agents, dataSources, kpis, toggleAgent, toggleDataSource, toggleKPI } = useDCTwinBuilderStore();

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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="agents" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Agents ({agents.filter(a => a.enabled).length}/{agents.length})
          </TabsTrigger>
          <TabsTrigger value="data-sources" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Sources ({dataSources.filter(d => d.enabled).length}/{dataSources.length})
          </TabsTrigger>
          <TabsTrigger value="kpis" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            KPIs ({kpis.filter(k => k.enabled).length}/{kpis.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="mt-4 space-y-4">
          {Object.entries(groupedAgents).map(([domain, domainAgents]) => (
            <Card key={domain}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  {DOMAIN_ICONS[domain] || <Bot className="h-4 w-4" />}
                  {domain.charAt(0).toUpperCase() + domain.slice(1)} Agents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {domainAgents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
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
          ))}
        </TabsContent>

        <TabsContent value="data-sources" className="mt-4 space-y-4">
          {Object.entries(groupedDataSources).map(([domain, domainSources]) => (
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
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{ds.description}</p>
                    </div>
                    <Switch checked={ds.enabled} onCheckedChange={(enabled) => toggleDataSource(ds.id, enabled)} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="kpis" className="mt-4 space-y-4">
          {Object.entries(groupedKPIs).map(([domain, domainKPIs]) => (
            <Card key={domain}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  {DOMAIN_ICONS[domain] || <Activity className="h-4 w-4" />}
                  {domain.charAt(0).toUpperCase() + domain.slice(1)} KPIs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {domainKPIs.map((kpi) => (
                    <div key={kpi.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex-1">
                        <span className="font-medium text-sm">{kpi.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{kpi.unit}</Badge>
                          <span className="text-xs text-muted-foreground">Target: {kpi.target}</span>
                        </div>
                      </div>
                      <Switch checked={kpi.enabled} onCheckedChange={(enabled) => toggleKPI(kpi.id, enabled)} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
