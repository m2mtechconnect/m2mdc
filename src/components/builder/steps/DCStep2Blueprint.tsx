/**
 * DC Twin Builder Step 2 - Blueprint (Agents, Data Sources, KPIs)
 * Reads from useDCTwinBuilderStore, provides full editing capabilities
 */

import { useState } from 'react';
import { 
  Database, Activity, Gauge, Users, Shield, Zap, Thermometer, 
  Wind, Cpu, Network, DollarSign, AlertTriangle, Check 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { toast } from 'sonner';
import { DCCard, DCSectionHeader, DCKPITile } from '@/components/dc-ui';
import { BUILDER, AGENTS, KPIS } from '@/ux';

const DOMAIN_ICONS: Record<string, any> = {
  thermal: Thermometer,
  power: Zap,
  cooling: Wind,
  network: Network,
  workload: Cpu,
  financial: DollarSign,
  incidents: AlertTriangle,
  sovereignty: Shield,
};

export function DCStep2Blueprint() {
  const { 
    agents, 
    dataSources, 
    kpis,
    toggleAgent,
    toggleDataSource,
    toggleKPI,
    markStepComplete,
  } = useDCTwinBuilderStore();
  
  const [activeTab, setActiveTab] = useState('agents');

  const enabledAgents = agents.filter(a => a.enabled).length;
  const enabledDataSources = dataSources.filter(ds => ds.enabled).length;
  const enabledKPIs = kpis.filter(k => k.enabled).length;

  const handleToggleAgent = (agentId: string, enabled: boolean) => {
    toggleAgent(agentId, enabled);
    toast.success(enabled ? 'Agent enabled' : 'Agent disabled');
  };

  const handleToggleDataSource = (dsId: string, enabled: boolean) => {
    toggleDataSource(dsId, enabled);
    toast.success(enabled ? 'Data source enabled' : 'Data source disabled');
  };

  const handleToggleKPI = (kpiId: string, enabled: boolean) => {
    toggleKPI(kpiId, enabled);
    toast.success(enabled ? 'KPI enabled' : 'KPI disabled');
  };

  return (
    <div className="space-y-6 max-w-[920px] mx-auto">
      <DCSectionHeader
        title={BUILDER.STEPS.STEP_2.TITLE}
        subtitle={BUILDER.STEPS.STEP_2.SUBTITLE}
        icon={<Database className="h-5 w-5" />}
      />

      {/* Stats Row */}
      <div className="grid gap-4 grid-cols-3">
        <DCKPITile
          label="Agents"
          value={`${enabledAgents}/${agents.length}`}
          sublabel="enabled"
          status={enabledAgents >= 5 ? 'normal' : 'warning'}
          icon={<Users className="h-4 w-4" />}
        />
        <DCKPITile
          label="Data Sources"
          value={`${enabledDataSources}/${dataSources.length}`}
          sublabel="connected"
          status={enabledDataSources >= 3 ? 'normal' : 'warning'}
          icon={<Database className="h-4 w-4" />}
        />
        <DCKPITile
          label="KPIs"
          value={`${enabledKPIs}/${kpis.length}`}
          sublabel="tracked"
          status={enabledKPIs >= 5 ? 'normal' : 'warning'}
          icon={<Gauge className="h-4 w-4" />}
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Agents
            {enabledAgents > 0 && <Badge className="ml-1">{enabledAgents}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="datasources" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Sources
            {enabledDataSources > 0 && <Badge className="ml-1">{enabledDataSources}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="kpis" className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            KPIs
            {enabledKPIs > 0 && <Badge className="ml-1">{enabledKPIs}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4 mt-4">
          <DCCard 
            title="Subsystem Agents" 
            subtitle="AI agents that monitor and control different domains"
            icon={<Users className="h-4 w-4" />}
          >
            <div className="space-y-3">
              {agents.map((agent) => {
                const IconComponent = DOMAIN_ICONS[agent.domain] || Activity;
                return (
                  <div 
                    key={agent.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                      agent.enabled 
                        ? 'bg-primary/10 border-primary/30' 
                        : 'bg-muted/50 border-border'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        agent.enabled ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-sm text-muted-foreground">{agent.description}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{agent.domain}</Badge>
                          {agent.kpisImpacted.slice(0, 2).map((kpi, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">{kpi}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Switch 
                      checked={agent.enabled} 
                      onCheckedChange={(checked) => handleToggleAgent(agent.id, checked)}
                    />
                  </div>
                );
              })}
            </div>
          </DCCard>
        </TabsContent>

        {/* Data Sources Tab */}
        <TabsContent value="datasources" className="space-y-4 mt-4">
          <DCCard 
            title="Data Sources" 
            subtitle="Telemetry and data feeds for the twin"
            icon={<Database className="h-4 w-4" />}
          >
            <div className="space-y-3">
              {dataSources.map((ds) => (
                <div 
                  key={ds.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    ds.enabled 
                      ? 'bg-primary/10 border-primary/30' 
                      : 'bg-muted/50 border-border'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      ds.enabled ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <Database className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{ds.name}</p>
                      <p className="text-sm text-muted-foreground">{ds.description}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{ds.id}</Badge>
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={ds.enabled} 
                    onCheckedChange={(checked) => handleToggleDataSource(ds.id, checked)}
                  />
                </div>
              ))}
            </div>
          </DCCard>
        </TabsContent>

        {/* KPIs Tab */}
        <TabsContent value="kpis" className="space-y-4 mt-4">
          <DCCard 
            title="Key Performance Indicators" 
            subtitle="Metrics tracked by this data centre twin"
            icon={<Gauge className="h-4 w-4" />}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {kpis.map((kpi) => (
                <div 
                  key={kpi.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    kpi.enabled 
                      ? 'bg-primary/10 border-primary/30' 
                      : 'bg-muted/50 border-border'
                  }`}
                >
                  <div className="flex-1 mr-3">
                    <p className="font-medium text-sm">{kpi.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{kpi.unit}</Badge>
                      <span className="text-xs text-muted-foreground">
                        Target: {kpi.target}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${
                          kpi.direction === 'lower_is_better' 
                            ? 'bg-success/10 text-success' 
                            : 'bg-info/10 text-info'
                        }`}
                      >
                        {kpi.direction === 'lower_is_better' ? '↓ Lower' : '↑ Higher'}
                      </Badge>
                    </div>
                  </div>
                  <Switch 
                    checked={kpi.enabled} 
                    onCheckedChange={(checked) => handleToggleKPI(kpi.id, checked)}
                  />
                </div>
              ))}
            </div>
          </DCCard>
        </TabsContent>
      </Tabs>

      {/* Complete Step Button */}
      <DCCard className="bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Blueprint Configuration Complete?</p>
            <p className="text-xs text-muted-foreground">
              Ensure you've enabled the agents, data sources, and KPIs needed for your twin.
            </p>
          </div>
          <Button 
            onClick={() => {
              markStepComplete(2);
              toast.success('Blueprint configuration saved');
            }}
            disabled={enabledAgents === 0}
          >
            <Check className="h-4 w-4 mr-2" />
            Save & Continue
          </Button>
        </div>
      </DCCard>
    </div>
  );
}
