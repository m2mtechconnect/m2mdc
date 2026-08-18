/**
 * Network Domain View - Network monitoring
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Network, Activity, AlertTriangle, Wifi, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

import { DomainProvenanceHeader } from '@/components/provenance/DomainProvenanceHeader';
import { MetricProvenanceManifest } from '@/components/provenance/MetricProvenanceManifest';
import { NETWORK_METRICS } from './metricCatalogs';
import { mulberry32, deriveSeed } from '@/simulation/orchestrator/prng';

interface NetworkDomainViewProps {
  facility: DataCentreFacility;
}

type SwitchType = 'all' | 'ToR' | 'Spine' | 'Leaf';
type StatusFilter = 'all' | 'normal' | 'warning' | 'critical';

/**
 * Demo fabric padding.
 *
 * Truth rule: this surface is classified `demo` (see DomainProvenanceHeader
 * below). It must never call `Math.random()` — values are derived from the
 * seeded `mulberry32-v1` generator so the same facility always renders the
 * same fabric across renders, reloads and screenshots.
 */
const generateSwitches = (baseSwitches: any[], seedText: string) => {
  const switchTypes = ['ToR', 'Spine', 'Leaf'];
  const allSwitches = [...baseSwitches];
  const rand = mulberry32(deriveSeed(`network-fabric:${seedText}`));

  for (let i = baseSwitches.length; i < 24; i++) {
    const type = switchTypes[i % 3];
    const hasWarning = rand() > 0.8;
    const hasCritical = rand() > 0.95;
    const portCount = Math.floor(rand() * 24) + 24;
    allSwitches.push({
      id: `sw-${i + 1}`,
      name: `${type} Switch ${i + 1}`,
      type,
      status: hasCritical ? 'critical' : hasWarning ? 'warning' : 'normal',
      cpuUtilization: Math.floor(rand() * 60) + 20,
      memoryUtilization: Math.floor(rand() * 50) + 30,
      temperature: Math.floor(rand() * 20) + 25,
      uptime: Math.floor(rand() * 86400) + 3600,
      ports: Array.from({ length: portCount }, (_, j) => ({
        id: `port-${j}`,
        status: rand() > 0.1 ? 'up' : 'down',
        utilizationPct: rand() * 100,
        packetErrors: Math.floor(rand() * 5),
        crcErrors: Math.floor(rand() * 2),
      })),
    });
  }
  return allSwitches;
};

export function NetworkDomainView({ facility }: NetworkDomainViewProps) {
  const [fabricOpen, setFabricOpen] = useState(true);
  const [throughputOpen, setThroughputOpen] = useState(true);
  const [typeFilter, setTypeFilter] = useState<SwitchType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const baseSwitches = facility.network.switches;
  const allSwitches = useMemo(
    () => generateSwitches(baseSwitches, facility.id ?? facility.name ?? 'facility'),
    [baseSwitches, facility.id, facility.name],
  );
  
  // Apply filters
  const switches = allSwitches.filter(sw => {
    const typeMatch = typeFilter === 'all' || sw.type === typeFilter;
    const statusMatch = statusFilter === 'all' || sw.status === statusFilter;
    return typeMatch && statusMatch;
  });

  const avgLatency = facility.network.kpis.avgLatencyMs;
  const totalErrors = allSwitches.reduce((acc, s) => 
    acc + s.ports.reduce((sum, p) => sum + p.packetErrors + p.crcErrors, 0), 0);
  
  // Count by type and status for filter badges
  const typeCounts = {
    all: allSwitches.length,
    ToR: allSwitches.filter(s => s.type === 'ToR').length,
    Spine: allSwitches.filter(s => s.type === 'Spine').length,
    Leaf: allSwitches.filter(s => s.type === 'Leaf').length,
  };
  
  const statusCounts = {
    all: allSwitches.length,
    normal: allSwitches.filter(s => s.status === 'normal').length,
    warning: allSwitches.filter(s => s.status === 'warning').length,
    critical: allSwitches.filter(s => s.status === 'critical').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-500';
      case 'warning': return 'text-amber-500';
      default: return 'text-emerald-500';
    }
  };

  const getStatusBadge = (type: string, status: string) => {
    const isCritical = status === 'critical';
    const isWarning = status === 'warning';
    
    return (
      <Badge 
        variant="outline" 
        className={`text-xs font-medium ${
          isCritical ? 'border-red-500/50 text-red-500 bg-red-500/10' :
          isWarning ? 'border-amber-500/50 text-amber-500 bg-amber-500/10' :
          'border-blue-500/50 text-blue-500 bg-blue-500/10'
        }`}
      >
        {type}
      </Badge>
    );
  };

  const getUptimeDisplay = (uptimeSec: number) => {
    const hours = Math.floor(uptimeSec / 3600);
    if (hours >= 24) {
      return `${Math.floor(hours / 24)}d`;
    }
    return `${hours}h`;
  };
  
  return (
    <div className="space-y-6" data-provenance="demo" data-testid="network-domain-view">
      <DomainProvenanceHeader provenance="demo" sourceName="sovereignDataCenter/mockData" ariaContext="Network domain data provenance" />
      <MetricProvenanceManifest domain="network" metrics={NETWORK_METRICS} />
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          title="Network Integrity"
          value={`${facility.network.kpis.networkIntegrityScore.toFixed(0)}%`}
          status={facility.network.kpis.networkIntegrityScore > 90 ? 'good' : 'warning'}
          icon={Network}
        />
        <SummaryCard
          title="Avg Latency"
          value={`${avgLatency.toFixed(2)}ms`}
          status={avgLatency < 1 ? 'good' : avgLatency < 5 ? 'warning' : 'critical'}
          icon={Activity}
        />
        <SummaryCard
          title="Total Errors"
          value={`${totalErrors.toLocaleString()}`}
          status={totalErrors < 10 ? 'good' : totalErrors < 100 ? 'warning' : 'critical'}
          icon={AlertTriangle}
        />
        <SummaryCard
          title="Active Switches"
          value={`${allSwitches.length}`}
          status="good"
          icon={Wifi}
        />
      </div>

      {/* Network Fabric - Collapsible */}
      <Collapsible open={fabricOpen} onOpenChange={setFabricOpen}>
        <Card className="border-border/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold">Network Fabric</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {switches.length} switches
                  </Badge>
                </div>
                {fabricOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-4 mb-4 pb-4 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Type:</span>
                  <div className="flex gap-1">
                    {(['all', 'ToR', 'Spine', 'Leaf'] as SwitchType[]).map(type => (
                      <Button
                        key={type}
                        variant={typeFilter === type ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setTypeFilter(type)}
                      >
                        {type === 'all' ? 'All' : type}
                        <span className="ml-1 opacity-70">({typeCounts[type]})</span>
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <div className="flex gap-1">
                    {(['all', 'normal', 'warning', 'critical'] as StatusFilter[]).map(status => (
                      <Button
                        key={status}
                        variant={statusFilter === status ? 'default' : 'outline'}
                        size="sm"
                        className={`h-7 text-xs ${
                          statusFilter === status ? '' :
                          status === 'critical' ? 'border-red-500/30 text-red-500 hover:bg-red-500/10' :
                          status === 'warning' ? 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10' :
                          status === 'normal' ? 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10' : ''
                        }`}
                        onClick={() => setStatusFilter(status)}
                      >
                        {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                        {status !== 'all' && <span className="ml-1 opacity-70">({statusCounts[status]})</span>}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Switch Grid */}
              {switches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No switches match the current filters
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {switches.map((sw) => {
                    const portsUp = sw.ports.filter((p: any) => p.status === 'up').length;
                    
                    return (
                      <div 
                        key={sw.id} 
                        className={`p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors ${
                          sw.status === 'critical' ? 'border-red-500/30' :
                          sw.status === 'warning' ? 'border-amber-500/30' :
                          'border-border/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Network className={`h-4 w-4 ${getStatusColor(sw.status)}`} />
                            <span className="font-medium text-sm">{sw.name}</span>
                          </div>
                          {getStatusBadge(sw.type, sw.status)}
                        </div>
                        
                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">CPU Utilization</span>
                            <span className="font-medium">{sw.cpuUtilization.toFixed(0)}%</span>
                          </div>
                          <Progress 
                            value={sw.cpuUtilization} 
                            className={`h-1.5 ${
                              sw.cpuUtilization > 80 ? '[&>div]:bg-red-500' :
                              sw.cpuUtilization > 60 ? '[&>div]:bg-amber-500' :
                              '[&>div]:bg-emerald-500'
                            }`}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Memory</p>
                            <p className="font-medium">{sw.memoryUtilization.toFixed(0)}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Ports</p>
                            <p className="font-medium">{portsUp}/{sw.ports.length}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Temp</p>
                            <p className={`font-medium ${sw.temperature > 40 ? 'text-amber-500' : ''}`}>
                              {sw.temperature.toFixed(0)}°C
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Uptime</p>
                            <p className="font-medium">{getUptimeDisplay(sw.uptime)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Network Throughput - Collapsible */}
      <Collapsible open={throughputOpen} onOpenChange={setThroughputOpen}>
        <Card className="border-border/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Network Throughput</CardTitle>
                {throughputOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {facility.network.fabrics.map((fabric) => {
                const utilizationPct = (fabric.throughputGbps / fabric.maxThroughputGbps) * 100;
                
                return (
                  <div key={fabric.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium w-28">{fabric.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {fabric.type}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {fabric.throughputGbps.toFixed(0)} / {fabric.maxThroughputGbps} Gbps
                      </span>
                    </div>
                    <Progress 
                      value={utilizationPct} 
                      className={`h-2 ${
                        utilizationPct > 80 ? '[&>div]:bg-amber-500' :
                        '[&>div]:bg-blue-500'
                      }`}
                    />
                  </div>
                );
              })}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  status: 'good' | 'warning' | 'critical';
  icon: React.ElementType;
}

function SummaryCard({ title, value, status, icon: Icon }: SummaryCardProps) {
  const getStatusStyles = () => {
    switch (status) {
      case 'good': return { text: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
      case 'warning': return { text: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
      case 'critical': return { text: 'text-red-600', bg: 'bg-red-500/10', border: 'border-red-500/20' };
    }
  };

  const styles = getStatusStyles();

  return (
    <Card className={`border-border/50 ${styles.border}`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${styles.bg}`}>
            <Icon className={`h-5 w-5 ${styles.text}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className={`text-xl font-bold ${styles.text}`}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
