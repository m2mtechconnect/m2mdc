/**
 * Data Centre Digital Twin Dashboard
 * Main NOC-style dashboard with domain tabs and KPI cockpit
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Thermometer, Zap, Wind, Network, Shield, Cpu, 
  Globe, DollarSign, AlertTriangle, Activity 
} from 'lucide-react';
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
  
  const activeAlerts = facility.alerts.filter(a => a.status === 'active');
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
  
  return (
    <div className="space-y-6">
      {/* Header with facility status */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{facility.name}</h1>
            <Badge variant={facility.status === 'operational' ? 'default' : 'destructive'}>
              {facility.status}
            </Badge>
            {facility.tier && (
              <Badge variant="outline">Tier {facility.tier}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {facility.location.city}, {facility.location.region} • {facility.totalRacks} Racks • {facility.totalPowerCapacityKw.toLocaleString()} kW Capacity
          </p>
        </div>
        
        {criticalAlerts.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="text-sm font-medium text-destructive">
              {criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Main content with tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border border-border p-1 h-auto flex-wrap">
          {domainTabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <KPICockpit facility={facility} />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Facility Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard 
                      label="GPU Utilization" 
                      value={`${Math.round(facility.gpuClusters.reduce((acc, c) => acc + c.utilizationPercent, 0) / facility.gpuClusters.length)}%`}
                      trend="up"
                    />
                    <StatCard 
                      label="Power Draw" 
                      value={`${facility.currentPowerDrawKw.toLocaleString()} kW`}
                      subtext={`${Math.round((facility.currentPowerDrawKw / facility.totalPowerCapacityKw) * 100)}% of capacity`}
                    />
                    <StatCard 
                      label="PUE" 
                      value={facility.pue.toFixed(2)}
                      trend={facility.pue < 1.4 ? 'good' : facility.pue < 1.6 ? 'warning' : 'bad'}
                    />
                    <StatCard 
                      label="Carbon Intensity" 
                      value={`${facility.carbonIntensityGCo2Kwh} g/kWh`}
                      trend={facility.carbonIntensityGCo2Kwh < 200 ? 'good' : 'warning'}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            <AlertsPanel alerts={facility.alerts} />
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

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  trend?: 'up' | 'down' | 'good' | 'warning' | 'bad';
}

function StatCard({ label, value, subtext, trend }: StatCardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case 'good': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'bad': return 'text-destructive';
      default: return 'text-foreground';
    }
  };

  return (
    <div className="p-4 rounded-lg bg-muted/50 border border-border">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-xl font-bold ${getTrendColor()}`}>{value}</p>
      {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
    </div>
  );
}
