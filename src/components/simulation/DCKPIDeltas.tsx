/**
 * DC KPI Deltas Component
 * Shows current KPI values with delta from baseline during simulation
 * Uses Studio design system tokens
 * OPTIMIZED: Memoized for performance during rapid simulation updates
 */

import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, TrendingDown, Minus, Activity,
  Zap, Cpu, Thermometer, Shield, Globe, Wind, DollarSign, Battery
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProvenanceBadge } from '@/components/provenance/ProvenanceBadge';

// Phase 1A.2 §4 — Simulation surface disclosure.
// The values rendered here come from the deterministic demonstration
// estimator (see `src/simulation/*`). Baseline is a demo fixture; current
// value is simulation output. Nothing on this card is a measurement.
const SIM_SOURCE = 'aura-estimator';
const SIM_MODEL = 'aura-estimator@v0-demo';

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

// Industry-accurate KPI definitions for Sovereign Green AI Data Centre
// Baselines from Uptime Institute, ASHRAE, NRCan, and Hydro-Québec data
const defaultKPIs: Omit<KPIDelta, 'value' | 'baseline'>[] = [
  // PUE: Uptime Institute best-in-class <1.2, industry avg 1.57
  { id: 'pue', label: 'PUE', unit: '', icon: Zap, format: (v) => v.toFixed(2), invertDelta: true },
  // GPU Utilization: Industry avg 40-60%, well-managed 70-85%
  { id: 'gpuUtilization', label: 'GPU Utilization', unit: '%', icon: Cpu },
  // Thermal Stability: ASHRAE A1 compliance (18-27°C inlet temp)
  { id: 'thermalStabilityScore', label: 'Thermal Stability', unit: '%', icon: Thermometer },
  // Power Reliability: Tier III = 99.982%, Tier IV = 99.995%
  { id: 'powerReliabilityScore', label: 'Power Reliability', unit: '%', icon: Battery },
  // Sovereignty: PIPEDA compliance, 100% = all compute in Canada
  { id: 'sovereignComplianceScore', label: 'Sovereignty', unit: '%', icon: Globe },
  // Emissions vs Target: negative = under target (good), based on Quebec hydro 1.2 gCO₂/kWh
  { id: 'emissionsVsTarget', label: 'Emissions vs Target', unit: '%', icon: Wind },
  // Cooling Efficiency: ASHRAE best practice 82-88%
  { id: 'coolingEfficiencyIndex', label: 'Cooling Efficiency', unit: '%', icon: Wind },
  // UPS Runtime: Tier III requires 15 min, typical 20-30 min
  { id: 'avgUpsRuntime', label: 'UPS Runtime', unit: 'min', icon: Battery },
  // Carbon Efficiency: Based on gCO₂/GPU-hour (Quebec ~28g vs Alberta ~180g)
  { id: 'carbonEfficiencyScore', label: 'Carbon Efficiency', unit: '%', icon: Wind },
  // Cost per GPU-hour: Quebec hydro $0.058/kWh enables $0.42/GPU-hr
  { id: 'costPerGpuHour', label: 'Cost/GPU-Hour', unit: '', icon: DollarSign, format: (v) => `$${v.toFixed(2)}`, invertDelta: true },
  // Financial Health: Combined OpEx/carbon/utilization efficiency
  { id: 'financialHealthScore', label: 'Financial Health', unit: '%', icon: DollarSign },
  // Daily Emissions: Quebec hydro enables ~85 kg/day for 5MW facility
  { id: 'dailyEmissionsKg', label: 'Daily Emissions', unit: 'kg', icon: Wind, invertDelta: true },
];

const KPICard = memo(function KPICard({ 
  kpi, 
  isRunning,
  compact = false,
}: { 
  kpi: KPIDelta; 
  isRunning: boolean;
  compact: boolean;
}) {
  const Icon = kpi.icon || Activity;
  
  // Memoize expensive calculations
  const { delta, deltaPercent, isPositiveDelta, isGoodDelta, isNeutral, formattedValue, formattedDelta } = useMemo(() => {
    const d = kpi.value - kpi.baseline;
    const dPercent = kpi.baseline !== 0 ? (d / kpi.baseline) * 100 : 0;
    const isPos = d > 0;
    const isGood = kpi.invertDelta ? !isPos : isPos;
    const isNeut = Math.abs(dPercent) < 0.5;
    const fValue = kpi.format ? kpi.format(kpi.value) : kpi.value.toFixed(1);
    const fDelta = d >= 0 ? `+${d.toFixed(1)}` : d.toFixed(1);
    return { delta: d, deltaPercent: dPercent, isPositiveDelta: isPos, isGoodDelta: isGood, isNeutral: isNeut, formattedValue: fValue, formattedDelta: fDelta };
  }, [kpi.value, kpi.baseline, kpi.format, kpi.invertDelta]);
  
  const TrendIcon = isNeutral ? Minus : isPositiveDelta ? TrendingUp : TrendingDown;
  const trendColor = isNeutral 
    ? 'text-muted-foreground' 
    : isGoodDelta 
      ? 'text-success' 
      : 'text-destructive';
  
  if (compact) {
    return (
      <div
        data-testid={`sim-kpi-${kpi.id}`}
        data-provenance={isRunning ? 'simulated' : 'demo'}
        className={cn(
        'flex items-center justify-between p-2 rounded-lg bg-card border border-border transition-all duration-300',
        isRunning && 'ring-1 ring-primary/30 shadow-sm shadow-primary/10'
      )}>
        <div className="flex items-center gap-2">
          <Icon className={cn(
            'h-3.5 w-3.5 transition-colors duration-300',
            isRunning ? 'text-primary animate-pulse' : 'text-muted-foreground'
          )} />
          <span className="text-xs text-muted-foreground">{kpi.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-sm font-mono font-medium text-card-foreground transition-all duration-300',
            isRunning && !isNeutral && 'scale-105'
          )}>
            {formattedValue}{kpi.unit}
          </span>
          {!isNeutral && (
            <Badge variant="outline" className={cn(
              'text-[10px] h-4 gap-0.5 transition-all duration-300',
              trendColor,
              isRunning && 'animate-pulse'
            )}>
              <TrendIcon className="h-2.5 w-2.5" />
              {Math.abs(deltaPercent).toFixed(1)}%
            </Badge>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <Card
      data-testid={`sim-kpi-${kpi.id}`}
      data-provenance={isRunning ? 'simulated' : 'demo'}
      className={cn(
      'bg-card border-border transition-all duration-300 overflow-hidden relative',
      isRunning && !isNeutral && 'border-primary/50 shadow-lg shadow-primary/5',
      isRunning && isGoodDelta && 'border-success/50',
      isRunning && !isGoodDelta && !isNeutral && 'border-destructive/50'
    )}>
      {/* Live indicator pulse ring */}
      {isRunning && (
        <div className="absolute inset-0 pointer-events-none">
          <div className={cn(
            'absolute inset-0 rounded-lg animate-ping opacity-10',
            isGoodDelta ? 'bg-success' : isNeutral ? 'bg-primary' : 'bg-destructive'
          )} style={{ animationDuration: '2s' }} />
        </div>
      )}
      
      <CardContent className="p-4 min-w-0 relative">
        <div className="flex items-start justify-between mb-2">
          <div className={cn(
            'p-2 rounded-lg transition-all duration-300',
            isRunning ? 'bg-primary/20 scale-110' : 'bg-primary/10'
          )}>
            <Icon className={cn(
              'h-4 w-4 transition-all duration-300',
              isRunning ? 'text-primary animate-pulse' : 'text-primary'
            )} />
          </div>
          {!isNeutral && (
            <Badge 
              variant="outline" 
              className={cn(
                'text-xs gap-1 transition-all duration-300',
                isGoodDelta 
                  ? 'bg-success/10 text-success border-success/30' 
                  : 'bg-destructive/10 text-destructive border-destructive/30',
                isRunning && 'animate-pulse scale-105'
              )}
            >
              <TrendIcon className="h-3 w-3" />
              {formattedDelta}{kpi.unit}
            </Badge>
          )}
          {isNeutral && isRunning && (
            <Badge variant="outline" className="text-[10px] h-5 animate-pulse bg-primary/10 text-primary border-primary/30">
              <Activity className="h-3 w-3 mr-1" />
              LIVE
            </Badge>
          )}
        </div>
        
        <div className="space-y-1 min-w-0">
          <p className={cn(
            'text-2xl font-bold font-mono text-card-foreground truncate transition-all duration-300',
            isRunning && !isNeutral && 'scale-105 origin-left'
          )}>
            {formattedValue}
            <span className="text-sm text-muted-foreground ml-1">{kpi.unit}</span>
          </p>
          <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
        </div>
        
        {/* Baseline comparison */}
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Baseline</span>
          <span className="font-mono text-card-foreground">
            {kpi.format ? kpi.format(kpi.baseline) : kpi.baseline.toFixed(1)}{kpi.unit}
          </span>
        </div>
        
        {/* Delta bar with animation */}
        {!isNeutral && (
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isGoodDelta ? 'bg-success' : 'bg-destructive',
                isRunning && 'animate-pulse'
              )}
              style={{ 
                width: `${Math.min(100, Math.abs(deltaPercent))}%`,
                marginLeft: isPositiveDelta ? '50%' : `${50 - Math.min(50, Math.abs(deltaPercent))}%`
              }}
            />
          </div>
        )}
        
        {/* Neutral delta bar with animation when running */}
        {isNeutral && isRunning && (
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full bg-primary/50 animate-pulse"
              style={{ width: '50%', marginLeft: '25%' }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export const DCKPIDeltas = memo(function DCKPIDeltas({
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
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            KPI Impact
          </CardTitle>
          {isRunning && (
            <Badge variant="outline" className="text-[10px] animate-pulse bg-success/10 text-success">
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
});

export { defaultKPIs };
