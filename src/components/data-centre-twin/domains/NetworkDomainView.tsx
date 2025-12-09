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
  const avgPortUtil = facility.networkSwitches.reduce((acc, s) => acc + s.portUtilizationPercent, 0) / facility.networkSwitches.length;
  const totalErrors = facility.networkSwitches.reduce((acc, s) => acc + s.packetErrorsPerSec + s.crcErrorsPerHour, 0);
  const avgLatency = facility.networkSwitches.reduce((acc, s) => acc + s.latencyMs, 0) / facility.networkSwitches.length;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Port Utilization"
          value={`${avgPortUtil.toFixed(0)}%`}
          status={avgPortUtil < 60 ? 'good' : avgPortUtil < 80 ? 'warning' : 'critical'}
          icon={Network}
        />
        <MetricCard
          title="Avg Latency"
          value={`${avgLatency.toFixed(2)}ms`}
          status={avgLatency < 1 ? 'good' : avgLatency < 5 ? 'warning' : 'critical'}
          icon={Activity}
        />
        <MetricCard
          title="Total Errors/hr"
          value={`${totalErrors.toFixed(0)}`}
          status={totalErrors < 10 ? 'good' : totalErrors < 100 ? 'warning' : 'critical'}
          icon={AlertTriangle}
        />
        <MetricCard
          title="Active Switches"
          value={`${facility.networkSwitches.length}`}
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
            {facility.networkSwitches.map((sw) => (
              <div key={sw.id} className="p-4 rounded-lg bg-muted/30 border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Network className={`h-4 w-4 ${sw.status === 'active' ? 'text-green-500' : 'text-yellow-500'}`} />
                    <span className="font-mono text-sm">{sw.id}</span>
                  </div>
                  <Badge variant={sw.status === 'active' ? 'default' : 'secondary'}>
                    {sw.type}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Port Utilization</span>
                      <span>{sw.portUtilizationPercent}%</span>
                    </div>
                    <Progress 
                      value={sw.portUtilizationPercent} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-background">
                      <p className="text-muted-foreground">Latency</p>
                      <p className="font-medium">{sw.latencyMs.toFixed(2)}ms</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="text-muted-foreground">Throughput</p>
                      <p className="font-medium">{sw.throughputGbps.toFixed(1)} Gbps</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="text-muted-foreground">Pkt Errors/s</p>
                      <p className="font-medium">{sw.packetErrorsPerSec}</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="text-muted-foreground">CRC/hr</p>
                      <p className="font-medium">{sw.crcErrorsPerHour}</p>
                    </div>
                  </div>
                  
                  {sw.linkFlapsLast24h > 0 && (
                    <div className="flex items-center gap-2 p-2 rounded bg-yellow-500/10 text-yellow-600 text-xs">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{sw.linkFlapsLast24h} link flaps (24h)</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bandwidth Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bandwidth Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {facility.networkSwitches.map((sw) => (
              <div key={sw.id} className="flex items-center gap-4">
                <div className="w-32 text-sm font-mono">{sw.id}</div>
                <div className="flex-1">
                  <Progress value={(sw.throughputGbps / 100) * 100} className="h-4" />
                </div>
                <div className="w-24 text-right text-sm">
                  {sw.throughputGbps.toFixed(1)} Gbps
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
