/**
 * Data Centre Digital Twin Dashboard
 * Enterprise dashboard with domain tabs and KPI cockpit
 * Uses Studio design system (light theme)
 * Blueprint-aware for system configuration
 * CoPilot command-aware for voice/text control
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Thermometer, Zap, Wind, Network, Shield, Cpu, 
  Globe, DollarSign, AlertTriangle, Activity, Server, PlayCircle,
  FileText, Eye
} from 'lucide-react';
import { DCSearchBar } from '@/components/dc-ui';
import { KPICockpit } from './KPICockpit';
import { ThermalDomainView } from './domains/ThermalDomainView';
import { PowerDomainView } from './domains/PowerDomainView';
import { CoolingDomainView } from './domains/CoolingDomainView';
import { NetworkDomainView } from './domains/NetworkDomainView';
import { FacilityDomainView } from './domains/FacilityDomainView';
import { WorkloadDomainView } from './domains/WorkloadDomainView';
import { SovereigntyDomainView } from './domains/SovereigntyDomainView';
import { FinancialDomainView } from './domains/FinancialDomainView';
import { AlertsPanel } from './AlertsPanel';
import { DCSimulationPanel } from '@/components/simulation/DCSimulationPanel';
import { useBlueprint } from '@/hooks/useBlueprint';
import { DcToolsRow } from '@/components/dc-tools';
import { useCoPilotCommands } from '@/contexts/CoPilotCommandContext';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { useSimulation } from '@/simulation/useSimulation';
import { cn } from '@/lib/utils';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

interface DataCentreDashboardProps {
  facility: DataCentreFacility;
  twinId?: string;
  onScenarioSelect?: (scenarioId: string) => void;
}

const domainTabs = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'simulation', label: 'Simulation', icon: PlayCircle },
  { id: 'thermal', label: 'Thermal', icon: Thermometer },
  { id: 'power', label: 'Power', icon: Zap },
  { id: 'cooling', label: 'Cooling', icon: Wind },
  { id: 'network', label: 'Network', icon: Network },
  { id: 'facility', label: 'Facility', icon: Shield },
  { id: 'workload', label: 'Workload', icon: Cpu },
  { id: 'sovereignty', label: 'Sovereignty', icon: Globe },
  { id: 'financial', label: 'Financial', icon: DollarSign },
];

// Studio-themed KPI Tile component
function KPITile({ 
  label, 
  value, 
  unit, 
  status = 'normal',
  trend,
  delta,
  icon 
}: { 
  label: string;
  value: number | string;
  unit: string;
  status?: 'normal' | 'warning' | 'critical' | 'info';
  trend?: 'up' | 'down' | 'stable';
  delta?: number;
  icon?: React.ReactNode;
}) {
  const statusColors = {
    normal: 'text-success',
    warning: 'text-warning',
    critical: 'text-destructive',
    info: 'text-info',
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            {icon}
          </div>
          {delta !== undefined && (
            <Badge variant="outline" className={`text-xs ${delta >= 0 ? 'text-success' : 'text-destructive'}`}>
              {delta >= 0 ? '+' : ''}{delta}%
            </Badge>
          )}
        </div>
        <div className="space-y-1">
          <p className={`text-2xl font-bold font-mono ${statusColors[status]}`}>
            {value}
            <span className="text-sm text-muted-foreground ml-1">{unit}</span>
          </p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Studio-themed Rack Grid component
function RackGrid({ 
  racks, 
  onRackClick 
}: { 
  racks: Array<{ id: string; name: string; status: string; powerKw: number }>;
  onRackClick: (id: string) => void;
}) {
  const statusColors: Record<string, string> = {
    normal: 'bg-success/20 border-success/30',
    warning: 'bg-warning/20 border-warning/30',
    critical: 'bg-destructive/20 border-destructive/30',
  };

  return (
    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
      {racks.map(rack => (
        <button
          key={rack.id}
          onClick={() => onRackClick(rack.id)}
          className={`p-2 rounded-lg border transition-all hover:scale-105 ${statusColors[rack.status] || statusColors.normal}`}
        >
          <div className="text-xs font-medium text-card-foreground">{rack.name}</div>
          <div className="text-[10px] text-muted-foreground">{rack.powerKw.toFixed(1)} kW</div>
        </button>
      ))}
    </div>
  );
}

// Studio-themed Event Timeline component
function EventTimeline({ events }: { events: Array<{ id: string; title: string; severity: string; timestamp: Date }> }) {
  const severityColors: Record<string, string> = {
    critical: 'bg-destructive/10 border-destructive/30 text-destructive',
    warning: 'bg-warning/10 border-warning/30 text-warning',
    info: 'bg-info/10 border-info/30 text-info',
  };

  return (
    <div className="space-y-2">
      {events.slice(0, 5).map(event => (
        <div 
          key={event.id} 
          className={`p-2 rounded-lg border ${severityColors[event.severity] || severityColors.info}`}
        >
          <div className="text-sm font-medium">{event.title}</div>
          <div className="text-xs text-muted-foreground">
            {event.timestamp.toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DataCentreDashboard({ facility, twinId = 'default', onScenarioSelect }: DataCentreDashboardProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedKPILocal, setHighlightedKPILocal] = useState<string | null>(null);
  
  // Get Blueprint for system configuration
  const { blueprint, summary } = useBlueprint(twinId);
  
  // CoPilot command integration
  const { registerCommands, highlightedKPI } = useCoPilotCommands();
  const { updateDCContext } = useCoPilotContext();
  
  // Simulation controls - get from hook
  const simulation = useSimulation();
  const simulationRef = useRef(simulation);
  simulationRef.current = simulation;
  
  // Register CoPilot commands
  useEffect(() => {
    registerCommands({
      navigateToTab: (tabName: string) => {
        console.log('[Dashboard] CoPilot navigateToTab:', tabName);
        const validTabs = ['overview', 'simulation', 'thermal', 'power', 'cooling', 'network', 'facility', 'workload', 'sovereignty', 'financial'];
        const normalizedTab = tabName.toLowerCase();
        if (validTabs.includes(normalizedTab)) {
          setActiveTab(normalizedTab);
        }
      },
      runSimulation: (scenarioId?: string) => {
        console.log('[Dashboard] CoPilot runSimulation:', scenarioId);
        setActiveTab('simulation');
        // Use ref to get latest simulation state
        if (scenarioId && simulationRef.current.startScenario) {
          simulationRef.current.startScenario(scenarioId);
        } else if (simulationRef.current.resume) {
          simulationRef.current.resume();
        }
      },
      pauseSimulation: () => {
        console.log('[Dashboard] CoPilot pauseSimulation');
        if (simulationRef.current.pause) {
          simulationRef.current.pause();
        }
      },
      resetSimulation: () => {
        console.log('[Dashboard] CoPilot resetSimulation');
        if (simulationRef.current.reset) {
          simulationRef.current.reset();
        }
      },
      highlightKPI: (kpiId: string) => {
        console.log('[Dashboard] CoPilot highlightKPI:', kpiId);
        setHighlightedKPILocal(kpiId);
        setTimeout(() => setHighlightedKPILocal(null), 5000);
      },
      toggleDomain: (domainName: string) => {
        console.log('[Dashboard] CoPilot toggleDomain:', domainName);
        setActiveTab(domainName.toLowerCase());
      },
    });
  }, [registerCommands]);
  
  // Update DC context when tab changes
  useEffect(() => {
    updateDCContext({ domainTabActive: activeTab });
  }, [activeTab, updateDCContext]);
  
  const activeAlerts = facility.alerts.filter(a => a.status === 'active');
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
  
  const gpuClusters = facility.workloadGpu.clusters;
  const avgGpuUtilization = gpuClusters.length > 0 
    ? gpuClusters.reduce((acc, c) => acc + c.avgUtilization, 0) / gpuClusters.length
    : 0;
  
  const timelineEvents = activeAlerts.slice(0, 8).map(alert => ({
    id: alert.id,
    timestamp: alert.triggeredAt,
    severity: alert.severity as 'critical' | 'warning' | 'info',
    domain: alert.domain as any,
    title: alert.title,
    description: alert.description,
  }));
  
  // Combined highlight state
  const currentHighlight = highlightedKPILocal || highlightedKPI;

  const handleSearch = (query: string) => {
    console.log('Search query:', query);
  };

  const handleChipClick = (chip: string) => {
    console.log('Chip clicked:', chip);
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with facility status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Server className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{facility.name}</h1>
            <Badge 
              variant={facility.status === 'operational' ? 'default' : 'destructive'}
              className={facility.status === 'operational' ? 'bg-success/10 text-success border-success/30' : ''}
            >
              <span className="relative flex h-2 w-2 mr-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${facility.status === 'operational' ? 'bg-success' : 'bg-destructive'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${facility.status === 'operational' ? 'bg-success' : 'bg-destructive'}`}></span>
              </span>
              {facility.status}
            </Badge>
            {facility.tier && (
              <Badge variant="outline" className="border-primary/30 text-primary">
                Tier {facility.tier}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground font-mono">
            {facility.location.city}, {facility.location.country} • {facility.totalRacks} Racks • {facility.totalPowerCapacityKw.toLocaleString()} kW Capacity
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {criticalAlerts.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 rounded-lg border border-destructive/30">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                {criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/blueprint/${twinId}`)}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Blueprint
            {summary && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1">
                {summary.totalAgents} agents
              </Badge>
            )}
          </Button>
          <Badge variant="outline" className="font-mono text-xs">
            LIVE • {new Date().toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      {/* Search Bar */}
      <DCSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        onSearch={handleSearch}
        onChipClick={handleChipClick}
        placeholder="Search racks, sensors, metrics..."
      />

      {/* Hero KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPITile
          label="Power Usage Effectiveness"
          value={facility.pue.toFixed(2)}
          unit=""
          status={facility.pue < 1.4 ? 'normal' : facility.pue < 1.6 ? 'warning' : 'critical'}
          delta={-2.3}
          icon={<Zap className="h-4 w-4 text-primary" />}
        />
        <KPITile
          label="GPU Cluster Utilization"
          value={Math.round(avgGpuUtilization)}
          unit="%"
          status={avgGpuUtilization > 70 ? 'normal' : avgGpuUtilization > 50 ? 'warning' : 'critical'}
          delta={5.2}
          icon={<Cpu className="h-4 w-4 text-primary" />}
        />
        <KPITile
          label="Carbon Intensity"
          value={facility.carbonIntensityGCo2Kwh}
          unit="g/kWh"
          status={facility.carbonIntensityGCo2Kwh < 150 ? 'normal' : facility.carbonIntensityGCo2Kwh < 250 ? 'warning' : 'critical'}
          delta={-8.1}
          icon={<Globe className="h-4 w-4 text-primary" />}
        />
        <KPITile
          label="Sovereign Compute"
          value={facility.sovereignty?.kpis?.sovereigntyRiskScore !== undefined ? 100 - facility.sovereignty.kpis.sovereigntyRiskScore : 94}
          unit="%"
          status="info"
          icon={<Shield className="h-4 w-4 text-primary" />}
        />
      </div>

      {/* Main content with tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="h-auto flex-wrap gap-1">
          {domainTabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="flex items-center gap-2"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <KPICockpit facility={facility} twinId={twinId} />
          
          {/* Data Centre Tools Row */}
          <DcToolsRow 
            twinId={twinId} 
            title="Data Centre Tools"
            subtitle="Quick access to specialized monitoring and analysis tools"
          />
          
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Server className="h-4 w-4 text-primary" />
                    Rack Status Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RackGrid
                    racks={facility.thermalHardware.racks.slice(0, 12).map(rack => ({
                      id: rack.id,
                      name: rack.name,
                      status: rack.servers.some(s => s.cpuTempC > 85) ? 'critical' 
                            : rack.servers.some(s => s.cpuTempC > 75) ? 'warning' 
                            : 'normal',
                      powerKw: rack.servers.reduce((acc, s) => acc + s.powerDrawW, 0) / 1000,
                    }))}
                    onRackClick={(rackId) => console.log('Rack clicked:', rackId)}
                  />
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPITile
                  label="Power Draw"
                  value={facility.currentPowerDrawKw}
                  unit="kW"
                  status={facility.currentPowerDrawKw / facility.totalPowerCapacityKw < 0.8 ? 'normal' : 'warning'}
                  delta={2.1}
                  icon={<Zap className="h-4 w-4 text-primary" />}
                />
                <KPITile
                  label="Cooling Load"
                  value={facility.cooling.kpis.coolingEfficiencyIndex}
                  unit="%"
                  status={facility.cooling.kpis.coolingEfficiencyIndex > 70 ? 'normal' : 'warning'}
                  icon={<Wind className="h-4 w-4 text-primary" />}
                />
                <KPITile
                  label="Network Integrity"
                  value={facility.network.kpis.networkIntegrityScore}
                  unit="%"
                  status={facility.network.kpis.networkIntegrityScore > 90 ? 'normal' : 'warning'}
                  icon={<Network className="h-4 w-4 text-primary" />}
                />
                <KPITile
                  label="Facility Safety"
                  value={facility.facilitySafety.kpis.environmentalSafetyScore}
                  unit="%"
                  status={facility.facilitySafety.kpis.environmentalSafetyScore > 90 ? 'normal' : 'warning'}
                  icon={<Shield className="h-4 w-4 text-primary" />}
                />
              </div>
            </div>
            
            <div className="space-y-6">
              <AlertsPanel alerts={facility.alerts} maxHeight="250px" />
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Event Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EventTimeline events={timelineEvents} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="simulation">
          <DCSimulationPanel twinId={twinId} />
        </TabsContent>

        <TabsContent value="thermal">
          <ThermalDomainView facility={facility} />
        </TabsContent>

        <TabsContent value="power">
          <PowerDomainView facility={facility} />
        </TabsContent>

        <TabsContent value="cooling">
          <CoolingDomainView facility={facility} />
        </TabsContent>

        <TabsContent value="network">
          <NetworkDomainView facility={facility} />
        </TabsContent>

        <TabsContent value="facility">
          <FacilityDomainView facility={facility} />
        </TabsContent>

        <TabsContent value="workload">
          <WorkloadDomainView facility={facility} />
        </TabsContent>

        <TabsContent value="sovereignty">
          <SovereigntyDomainView facility={facility} />
        </TabsContent>

        <TabsContent value="financial">
          <FinancialDomainView facility={facility} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
