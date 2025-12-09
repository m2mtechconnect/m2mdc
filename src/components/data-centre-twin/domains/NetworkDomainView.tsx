/**
 * Network Domain View - Network monitoring
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Network, Activity, AlertTriangle, Wifi } from 'lucide-react';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

interface NetworkDomainViewProps {
  facility: DataCentreFacility;
}

export function NetworkDomainView({ facility }: NetworkDomainViewProps) {
  const switches = facility.network.switches;
  const avgPortUtil = switches.length > 0
    ? switches.reduce((acc, s) => acc + s.cpuUtilization, 0) / switches.length
    : 0;
  const totalErrors = switches.reduce((acc, s) => 
    acc + s.ports.reduce((sum, p) => sum + p.packetErrors + p.crcErrors, 0), 0);
  const avgLatency = facility.network.kpis.avgLatencyMs;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Network Integrity"
          value={`${facility.network.kpis.networkIntegrityScore.toFixed(0)}%`}
          status={facility.network.kpis.networkIntegrityScore > 90 ? 'good' : 'warning'}
          icon={Network}
        />
        <MetricCard
          title="Avg Latency"
          value={`${avgLatency.toFixed(2)}ms`}
          status={avgLatency < 1 ? 'good' : avgLatency < 5 ? 'warning' : 'critical'}
          icon={Activity}
        />
        <MetricCard
          title="Total Errors"
          value={`${totalErrors}`}
          status={totalErrors < 10 ? 'good' : totalErrors < 100 ? 'warning' : 'critical'}
          icon={AlertTriangle}
        />
        <MetricCard
          title="Active Switches"
          value={`${switches.length}`}
          status="good"
          icon={Wifi}
        />
      </div>

      {/* Network Topology */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Network Fabric</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {switches.map((sw) => (
              <div key={sw.id} className="p-4 rounded-lg bg-muted/30 border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Network className={`h-4 w-4 ${sw.status === 'normal' ? 'text-green-500' : 'text-yellow-500'}`} />
                    <span className="font-mono text-sm">{sw.name}</span>
                  </div>
                  <Badge variant={sw.status === 'normal' ? 'default' : 'secondary'}>
                    {sw.type}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>CPU Utilization</span>
                      <span>{sw.cpuUtilization.toFixed(0)}%</span>
                    </div>
                    <Progress value={sw.cpuUtilization} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-background">
                      <p className="text-muted-foreground">Memory</p>
                      <p className="font-medium">{sw.memoryUtilization.toFixed(0)}%</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="text-muted-foreground">Ports</p>
                      <p className="font-medium">{sw.ports.length}</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="text-muted-foreground">Temp</p>
                      <p className="font-medium">{sw.temperature.toFixed(0)}°C</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="text-muted-foreground">Uptime</p>
                      <p className="font-medium">{Math.round(sw.uptime / 3600)}h</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Throughput */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Network Throughput</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {facility.network.fabrics.map((fabric) => (
              <div key={fabric.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                <div className="w-32 font-mono text-sm">{fabric.name}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{fabric.type}</span>
                    <span className="text-sm text-muted-foreground">
                      {fabric.throughputGbps.toFixed(0)} / {fabric.maxThroughputGbps} Gbps
                    </span>
                  </div>
                  <Progress value={(fabric.throughputGbps / fabric.maxThroughputGbps) * 100} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  status: 'good' | 'warning' | 'critical';
  icon: React.ElementType;
}

function MetricCard({ title, value, status, icon: Icon }: MetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-destructive';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-muted ${getStatusColor()}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={`text-xl font-bold ${getStatusColor()}`}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
