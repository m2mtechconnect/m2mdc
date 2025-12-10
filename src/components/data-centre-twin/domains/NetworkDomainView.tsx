/**
 * Network Domain View - Network monitoring
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Network, Activity, AlertTriangle, Wifi, ArrowUp, ArrowDown } from 'lucide-react';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

interface NetworkDomainViewProps {
  facility: DataCentreFacility;
}

// Generate more switches for demo
const generateSwitches = (baseSwitches: any[]) => {
  const switchTypes = ['ToR', 'Spine', 'Leaf'];
  const allSwitches = [...baseSwitches];
  
  // Add more switches to reach ~24 for a full grid
  for (let i = baseSwitches.length; i < 24; i++) {
    const type = switchTypes[i % 3];
    const hasWarning = Math.random() > 0.8;
    const hasCritical = Math.random() > 0.95;
    allSwitches.push({
      id: `sw-${i + 1}`,
      name: `${type} Switch ${i + 1}`,
      type,
      status: hasCritical ? 'critical' : hasWarning ? 'warning' : 'normal',
      cpuUtilization: Math.floor(Math.random() * 60) + 20,
      memoryUtilization: Math.floor(Math.random() * 50) + 30,
      temperature: Math.floor(Math.random() * 20) + 25,
      uptime: Math.floor(Math.random() * 86400) + 3600,
      ports: Array.from({ length: Math.floor(Math.random() * 24) + 24 }, (_, j) => ({
        id: `port-${j}`,
        status: Math.random() > 0.1 ? 'up' : 'down',
        utilizationPct: Math.random() * 100,
        packetErrors: Math.floor(Math.random() * 5),
        crcErrors: Math.floor(Math.random() * 2),
      })),
    });
  }
  return allSwitches;
};

export function NetworkDomainView({ facility }: NetworkDomainViewProps) {
  const baseSwitches = facility.network.switches;
  const switches = generateSwitches(baseSwitches);
  
  const avgPortUtil = switches.length > 0
    ? switches.reduce((acc, s) => acc + s.cpuUtilization, 0) / switches.length
    : 0;
  const totalErrors = switches.reduce((acc, s) => 
    acc + s.ports.reduce((sum, p) => sum + p.packetErrors + p.crcErrors, 0), 0);
  const avgLatency = facility.network.kpis.avgLatencyMs;
  
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
    <div className="space-y-6">
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
          value={`${switches.length}`}
          status="good"
          icon={Wifi}
        />
      </div>

      {/* Network Fabric */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Network Fabric</CardTitle>
        </CardHeader>
        <CardContent>
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
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Network className={`h-4 w-4 ${getStatusColor(sw.status)}`} />
                      <span className="font-medium text-sm">{sw.name}</span>
                    </div>
                    {getStatusBadge(sw.type, sw.status)}
                  </div>
                  
                  {/* CPU Progress */}
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
                  
                  {/* Metrics Grid */}
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
        </CardContent>
      </Card>

      {/* Network Throughput */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Network Throughput</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
      </Card>
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
