/**
 * DC KPI Deltas Component
 * Shows current KPI values with delta from baseline during simulation
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, TrendingDown, Minus, Activity,
  Zap, Cpu, Thermometer, Shield, Globe, Wind, DollarSign, Battery
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPIDelta {
  id: string;
  label: string;
  value: number;
  baseline: number;
  unit: string;
  icon?: React.ElementType;
  format?: (value: number) => string;
  invertDelta?: boolean; // If true, negative delta is good (like PUE)
}

interface DCKPIDeltasProps {
  kpis: KPIDelta[];
  isRunning?: boolean;
  compact?: boolean;
}

const defaultKPIs: Omit<KPIDelta, 'value' | 'baseline'>[] = [
  { id: 'pue', label: 'PUE', unit: '', icon: Zap, format: (v) => v.toFixed(2), invertDelta: true },
  { id: 'gpuUtilization', label: 'GPU Utilization', unit: '%', icon: Cpu },
  { id: 'thermalStabilityScore', label: 'Thermal Stability', unit: '%', icon: Thermometer },
  { id: 'powerReliabilityScore', label: 'Power Reliability', unit: '%', icon: Battery },
  { id: 'sovereignComplianceScore', label: 'Sovereignty', unit: '%', icon: Globe },
  { id: 'emissionsVsTarget', label: 'Emissions vs Target', unit: '%', icon: Wind },
  { id: 'coolingEfficiencyIndex', label: 'Cooling Efficiency', unit: '%', icon: Wind },
  { id: 'avgUpsRuntime', label: 'UPS Runtime', unit: 'min', icon: Battery },
];

function KPICard({ 
  kpi, 
  isRunning,
  compact = false,
}: { 
  kpi: KPIDelta; 
  isRunning: boolean;
  compact: boolean;
}) {
  const Icon = kpi.icon || Activity;
  const delta = kpi.value - kpi.baseline;
  const deltaPercent = kpi.baseline !== 0 ? (delta / kpi.baseline) * 100 : 0;
  
  // Determine if delta is good or bad
  const isPositiveDelta = delta > 0;
  const isGoodDelta = kpi.invertDelta ? !isPositiveDelta : isPositiveDelta;
  const isNeutral = Math.abs(deltaPercent) < 0.5;
  
  const TrendIcon = isNeutral ? Minus : isPositiveDelta ? TrendingUp : TrendingDown;
  const trendColor = isNeutral 
    ? 'text-muted-foreground' 
    : isGoodDelta 
      ? 'text-dc-success' 
      : 'text-destructive';
  
  const formattedValue = kpi.format ? kpi.format(kpi.value) : kpi.value.toFixed(1);
  const formattedDelta = delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
  
  if (compact) {
    return (
      <div className={cn(
        'flex items-center justify-between p-2 rounded-lg bg-dc-surface border border-dc-border',
        isRunning && 'animate-pulse-subtle'
      )}>
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{kpi.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-medium">
            {formattedValue}{kpi.unit}
          </span>
          {!isNeutral && (
            <Badge variant="outline" className={cn('text-[10px] h-4 gap-0.5', trendColor)}>
              <TrendIcon className="h-2.5 w-2.5" />
              {Math.abs(deltaPercent).toFixed(1)}%
            </Badge>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <Card className={cn(
      'bg-dc-surface border-dc-border transition-all duration-300',
      isRunning && !isNeutral && 'border-dc-primary/50'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="p-2 rounded-lg bg-dc-primary/10">
            <Icon className="h-4 w-4 text-dc-primary" />
          </div>
          {!isNeutral && (
            <Badge 
              variant="outline" 
              className={cn(
                'text-xs gap-1',
                isGoodDelta 
                  ? 'bg-dc-success/10 text-dc-success border-dc-success/30' 
                  : 'bg-destructive/10 text-destructive border-destructive/30'
              )}
            >
              <TrendIcon className="h-3 w-3" />
              {formattedDelta}{kpi.unit}
            </Badge>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-2xl font-bold font-mono">
            {formattedValue}
            <span className="text-sm text-muted-foreground ml-1">{kpi.unit}</span>
          </p>
          <p className="text-xs text-muted-foreground">{kpi.label}</p>
        </div>
        
        {/* Baseline comparison */}
        <div className="mt-3 pt-3 border-t border-dc-border flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Baseline</span>
          <span className="font-mono">
            {kpi.format ? kpi.format(kpi.baseline) : kpi.baseline.toFixed(1)}{kpi.unit}
          </span>
        </div>
        
        {/* Delta bar */}
        {!isNeutral && (
          <div className="mt-2 h-1.5 bg-dc-border rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isGoodDelta ? 'bg-dc-success' : 'bg-destructive'
              )}
              style={{ 
                width: `${Math.min(100, Math.abs(deltaPercent))}%`,
                marginLeft: isPositiveDelta ? '50%' : `${50 - Math.min(50, Math.abs(deltaPercent))}%`
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DCKPIDeltas({
  kpis,
  isRunning = false,
  compact = false,
}: DCKPIDeltasProps) {
  if (compact) {
    return (
      <div className="space-y-2">
        {kpis.map((kpi) => (
          <KPICard key={kpi.id} kpi={kpi} isRunning={isRunning} compact />
        ))}
      </div>
    );
  }
  
  return (
    <Card className="bg-dc-surface border-dc-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-dc-primary" />
            KPI Impact
          </CardTitle>
          {isRunning && (
            <Badge variant="outline" className="text-[10px] animate-pulse bg-dc-success/10 text-dc-success">
              LIVE
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((kpi) => (
            <KPICard key={kpi.id} kpi={kpi} isRunning={isRunning} compact={false} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export { defaultKPIs };
