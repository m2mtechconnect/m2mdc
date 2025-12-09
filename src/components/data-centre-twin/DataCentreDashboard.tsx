/**
 * Data Centre Digital Twin Dashboard
 * Enterprise NOC-style dashboard with domain tabs and KPI cockpit
 * Uses DC UI component library for consistent DCIM aesthetics
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Thermometer, Zap, Wind, Network, Shield, Cpu, 
  Globe, DollarSign, AlertTriangle, Activity, Server
} from 'lucide-react';
import { 
  DCCard, 
  DCSectionHeader, 
  DCKPITile, 
  DCSearchBar,
  DCEventTimeline,
  DCRackGrid
} from '@/components/dc-ui';
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
import type { DataCentreFacility } from '@/types/dataCenterTwin';

interface DataCentreDashboardProps {
  facility: DataCentreFacility;
  onScenarioSelect?: (scenarioId: string) => void;
}

const domainTabs = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'thermal', label: 'Thermal', icon: Thermometer },
  { id: 'power', label: 'Power', icon: Zap },
  { id: 'cooling', label: 'Cooling', icon: Wind },
  { id: 'network', label: 'Network', icon: Network },
  { id: 'facility', label: 'Facility', icon: Shield },
  { id: 'workload', label: 'Workload', icon: Cpu },
  { id: 'sovereignty', label: 'Sovereignty', icon: Globe },
  { id: 'financial', label: 'Financial', icon: DollarSign },
];

export function DataCentreDashboard({ facility, onScenarioSelect }: DataCentreDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  
  const activeAlerts = facility.alerts.filter(a => a.status === 'active');
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
  
  // Calculate GPU utilization from workloadGpu domain
  const gpuClusters = facility.workloadGpu.clusters;
  const avgGpuUtilization = gpuClusters.length > 0 
    ? gpuClusters.reduce((acc, c) => acc + c.avgUtilization, 0) / gpuClusters.length
    : 0;
  
  // Convert alerts to timeline events
  const timelineEvents = activeAlerts.slice(0, 8).map(alert => ({
    id: alert.id,
    timestamp: alert.triggeredAt,
    severity: alert.severity as 'critical' | 'warning' | 'info',
    domain: alert.domain as any,
    title: alert.title,
    description: alert.description,
  }));

  // Generate sparkline data
  const generateSparkline = (base: number, variance: number = 5) => {
    return Array.from({ length: 12 }, () => base + (Math.random() - 0.5) * variance);
  };
  
  // Handle search
  const handleSearch = (query: string) => {
    console.log('Search query:', query);
    // Implement search logic
  };

  const handleChipClick = (chip: string) => {
    console.log('Chip clicked:', chip);
    // Navigate to relevant domain or filter
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* NOC Header with facility status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-dc-primary/20">
              <Server className="h-6 w-6 text-dc-primary" />
            </div>
            <h1 className="text-2xl font-display font-bold tracking-tight">{facility.name}</h1>
            <Badge 
              variant={facility.status === 'operational' ? 'default' : 'destructive'}
              className={facility.status === 'operational' ? 'bg-dc-success/20 text-dc-success border-dc-success/30' : ''}
            >
              <span className="relative flex h-2 w-2 mr-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${facility.status === 'operational' ? 'bg-dc-success' : 'bg-destructive'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${facility.status === 'operational' ? 'bg-dc-success' : 'bg-destructive'}`}></span>
              </span>
              {facility.status}
            </Badge>
            {facility.tier && (
              <Badge variant="outline" className="border-dc-sovereignty/30 text-dc-sovereignty">
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
            <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 rounded-lg border border-destructive/30 animate-pulse-glow">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                {criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
          <Badge variant="outline" className="font-mono text-xs animate-status-blink">
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

      {/* Hero KPI Row - Most Critical Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DCKPITile
          label="Power Usage Effectiveness"
          value={facility.pue}
          unit=""
          status={facility.pue < 1.4 ? 'normal' : facility.pue < 1.6 ? 'warning' : 'critical'}
          trend={facility.pue < 1.5 ? 'down' : 'stable'}
          delta={-2.3}
          sparklineData={generateSparkline(facility.pue * 100, 3)}
          thresholdValue={70}
          icon={<Zap className="h-4 w-4" />}
          size="lg"
        />
        <DCKPITile
          label="GPU Cluster Utilization"
          value={Math.round(avgGpuUtilization)}
          unit="%"
          status={avgGpuUtilization > 70 ? 'normal' : avgGpuUtilization > 50 ? 'warning' : 'critical'}
          trend="up"
          delta={5.2}
          sparklineData={generateSparkline(avgGpuUtilization, 10)}
          thresholdValue={avgGpuUtilization}
          icon={<Cpu className="h-4 w-4" />}
          size="lg"
        />
        <DCKPITile
          label="Carbon Intensity"
          value={facility.carbonIntensityGCo2Kwh}
          unit="g/kWh"
          status={facility.carbonIntensityGCo2Kwh < 150 ? 'normal' : facility.carbonIntensityGCo2Kwh < 250 ? 'warning' : 'critical'}
          trend="down"
          delta={-8.1}
          sparklineData={generateSparkline(facility.carbonIntensityGCo2Kwh, 20)}
          icon={<Globe className="h-4 w-4" />}
          size="lg"
        />
        <DCKPITile
          label="Sovereign Compute"
          value={facility.sovereignty?.kpis?.sovereigntyRiskScore !== undefined ? 100 - facility.sovereignty.kpis.sovereigntyRiskScore : 94}
          unit="%"
          status="info"
          trend="stable"
          sparklineData={generateSparkline(94, 2)}
          icon={<Shield className="h-4 w-4" />}
          size="lg"
        />
      </div>

      {/* Main content with tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-dc-surface border border-dc-border p-1 h-auto flex-wrap gap-1">
          {domainTabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="flex items-center gap-2 data-[state=active]:bg-dc-primary/20 data-[state=active]:text-dc-primary data-[state=active]:border-dc-primary/30 border border-transparent transition-all duration-200"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <KPICockpit facility={facility} />
          
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Facility Overview with Rack Grid */}
            <div className="lg:col-span-2 space-y-6">
              <DCCard title="Rack Status Overview" icon={<Server className="h-4 w-4" />}>
              <DCRackGrid
                racks={facility.thermalHardware.racks.slice(0, 12).map(rack => ({
                  id: rack.id,
                  name: rack.name,
                  status: rack.servers.some(s => s.cpuTempC > 85) ? 'critical' 
                        : rack.servers.some(s => s.cpuTempC > 75) ? 'warning' 
                        : 'normal',
                  powerKw: rack.servers.reduce((acc, s) => acc + s.powerDrawW, 0) / 1000,
                  thermalLoad: rack.inletTempC > 25 ? 'high' : rack.inletTempC > 22 ? 'medium' : 'low',
                }))}
                onRackClick={(rackId) => console.log('Rack clicked:', rackId)}
              />
              </DCCard>
              
              {/* Quick Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DCKPITile
                  label="Power Draw"
                  value={facility.currentPowerDrawKw}
                  unit="kW"
                  status={facility.currentPowerDrawKw / facility.totalPowerCapacityKw < 0.8 ? 'normal' : 'warning'}
                  trend="up"
                  delta={2.1}
                  sparklineData={generateSparkline(facility.currentPowerDrawKw, 50)}
                  thresholdValue={(facility.currentPowerDrawKw / facility.totalPowerCapacityKw) * 100}
                  icon={<Zap className="h-4 w-4" />}
                />
                <DCKPITile
                  label="Cooling Load"
                  value={facility.cooling.kpis.coolingEfficiencyIndex}
                  unit="%"
                  status={facility.cooling.kpis.coolingEfficiencyIndex > 70 ? 'normal' : 'warning'}
                  trend="stable"
                  sparklineData={generateSparkline(facility.cooling.kpis.coolingEfficiencyIndex, 5)}
                  icon={<Wind className="h-4 w-4" />}
                />
                <DCKPITile
                  label="Network Integrity"
                  value={facility.network.kpis.networkIntegrityScore}
                  unit="%"
                  status={facility.network.kpis.networkIntegrityScore > 90 ? 'normal' : 'warning'}
                  trend="up"
                  sparklineData={generateSparkline(facility.network.kpis.networkIntegrityScore, 3)}
                  icon={<Network className="h-4 w-4" />}
                />
                <DCKPITile
                  label="Facility Safety"
                  value={facility.facilitySafety.kpis.environmentalSafetyScore}
                  unit="%"
                  status={facility.facilitySafety.kpis.environmentalSafetyScore > 90 ? 'normal' : 'warning'}
                  trend="stable"
                  sparklineData={generateSparkline(facility.facilitySafety.kpis.environmentalSafetyScore, 2)}
                  icon={<Shield className="h-4 w-4" />}
                />
              </div>
            </div>
            
            {/* Alerts & Events Panel */}
            <div className="space-y-6">
              <AlertsPanel alerts={facility.alerts} maxHeight="250px" />
              <DCCard title="Event Timeline" icon={<Activity className="h-4 w-4" />}>
                <DCEventTimeline events={timelineEvents} maxItems={5} />
              </DCCard>
            </div>
          </div>
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
