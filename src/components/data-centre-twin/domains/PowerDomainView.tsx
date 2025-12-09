/**
 * Power Domain View - Power & UPS monitoring
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Zap, Battery, AlertTriangle, Activity } from 'lucide-react';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

interface PowerDomainViewProps {
  facility: DataCentreFacility;
}

export function PowerDomainView({ facility }: PowerDomainViewProps) {
  const totalPowerDraw = facility.currentPowerDrawKw;
  const powerCapacity = facility.totalPowerCapacityKw;
  const utilizationPercent = (totalPowerDraw / powerCapacity) * 100;
  
  const avgUpsHealth = facility.upsBanks.reduce((acc, u) => acc + u.batteryHealthPercent, 0) / facility.upsBanks.length;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Power Draw"
          value={`${totalPowerDraw.toLocaleString()} kW`}
          subtitle={`${utilizationPercent.toFixed(1)}% of capacity`}
          status={utilizationPercent < 70 ? 'good' : utilizationPercent < 85 ? 'warning' : 'critical'}
          icon={Zap}
        />
        <MetricCard
          title="UPS Health"
          value={`${avgUpsHealth.toFixed(0)}%`}
          status={avgUpsHealth > 80 ? 'good' : avgUpsHealth > 60 ? 'warning' : 'critical'}
          icon={Battery}
        />
        <MetricCard
          title="Redundancy"
          value={facility.powerRedundancy}
          status={facility.powerRedundancy === '2N' ? 'good' : facility.powerRedundancy === 'N+1' ? 'warning' : 'critical'}
          icon={Activity}
        />
        <MetricCard
          title="Power Buses"
          value={`${facility.powerBuses.length}`}
          subtitle="Active feeds"
          status="good"
          icon={Zap}
        />
      </div>

      {/* Power Chain Diagram */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Power Distribution Chain</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg">
            {/* Grid Input */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-lg bg-green-500/20 border border-green-500/40 flex items-center justify-center mb-2">
                <Zap className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-xs font-medium">Grid</p>
              <p className="text-xs text-muted-foreground">{powerCapacity} kW</p>
            </div>
            
            <div className="flex-1 h-1 bg-green-500 rounded" />
            
            {/* UPS Banks */}
            <div className="text-center">
              <div className="flex gap-2">
                {facility.upsBanks.map((ups) => (
                  <div 
                    key={ups.id}
                    className={`w-12 h-16 rounded-lg ${ups.batteryHealthPercent > 80 ? 'bg-green-500/20 border-green-500/40' : 'bg-yellow-500/20 border-yellow-500/40'} border flex items-center justify-center`}
                  >
                    <Battery className={`h-6 w-6 ${ups.batteryHealthPercent > 80 ? 'text-green-500' : 'text-yellow-500'}`} />
                  </div>
                ))}
              </div>
              <p className="text-xs font-medium mt-2">UPS Banks</p>
              <p className="text-xs text-muted-foreground">{facility.upsBanks.length} units</p>
            </div>
            
            <div className="flex-1 h-1 bg-blue-500 rounded" />
            
            {/* PDUs / Buses */}
            <div className="text-center">
              <div className="grid grid-cols-3 gap-1">
                {facility.powerBuses.slice(0, 6).map((bus) => (
                  <div 
                    key={bus.id}
                    className="w-8 h-8 rounded bg-blue-500/20 border border-blue-500/40 flex items-center justify-center"
                  >
                    <span className="text-xs text-blue-500">{bus.loadPercent}%</span>
                  </div>
                ))}
              </div>
              <p className="text-xs font-medium mt-2">Power Buses</p>
              <p className="text-xs text-muted-foreground">{facility.powerBuses.length} feeds</p>
            </div>
            
            <div className="flex-1 h-1 bg-purple-500 rounded" />
            
            {/* Racks */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center mb-2">
                <span className="text-lg font-bold text-purple-500">{facility.racks.length}</span>
              </div>
              <p className="text-xs font-medium">Racks</p>
              <p className="text-xs text-muted-foreground">{totalPowerDraw.toLocaleString()} kW</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* UPS Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">UPS Bank Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {facility.upsBanks.map((ups) => (
              <div key={ups.id} className="p-4 rounded-lg bg-muted/30 border">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">{ups.id}</span>
                  <Badge variant={ups.batteryHealthPercent > 80 ? 'default' : 'secondary'}>
                    {ups.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Battery Health</span>
                      <span>{ups.batteryHealthPercent}%</span>
                    </div>
                    <Progress value={ups.batteryHealthPercent} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Load</span>
                      <span>{ups.loadPercent}%</span>
                    </div>
                    <Progress value={ups.loadPercent} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-3">
                    <div>Runtime: {ups.runtimeMinutes} min</div>
                    <div>Cycles: {ups.cycleCount}</div>
                    <div>Capacity: {ups.capacityKva} kVA</div>
                    <div>Internal Res: {ups.internalResistance}mΩ</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Power Buses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Power Bus Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {facility.powerBuses.map((bus) => (
              <div key={bus.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                <div className="w-32 font-mono text-sm">{bus.id}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{bus.currentAmps.toFixed(0)}A / {bus.voltageV}V</span>
                    <span className="text-sm text-muted-foreground">{bus.loadPercent}% load</span>
                  </div>
                  <Progress value={bus.loadPercent} className="h-2" />
                </div>
                <Badge variant={bus.loadPercent < 70 ? 'default' : bus.loadPercent < 85 ? 'secondary' : 'destructive'}>
                  {bus.phase}
                </Badge>
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
  subtitle?: string;
  status: 'good' | 'warning' | 'critical';
  icon: React.ElementType;
}

function MetricCard({ title, value, subtitle, status, icon: Icon }: MetricCardProps) {
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
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
