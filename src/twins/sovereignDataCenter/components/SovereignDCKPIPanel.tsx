/**
 * Sovereign DC KPI Panel - Displays key metrics for data centre twin
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Zap, Thermometer, Shield, TrendingUp, TrendingDown, 
  Leaf, Server, AlertTriangle, CheckCircle 
} from 'lucide-react';
import type { SovereignKpis } from '@/types/sovereignDataCenterTwin';
import { cn } from '@/lib/utils';

interface SovereignDCKPIPanelProps {
  kpis: SovereignKpis;
  previousKpis?: SovereignKpis;
  isSimulating?: boolean;
}

interface KPICardProps {
  label: string;
  value: number;
  unit: string;
  previousValue?: number;
  direction: 'up' | 'down';
  icon: React.ReactNode;
  thresholds: { warning: number; critical: number };
  format?: (v: number) => string;
}

function KPICard({ 
  label, value, unit, previousValue, direction, icon, thresholds, format 
}: KPICardProps) {
  const delta = previousValue !== undefined ? value - previousValue : 0;
  const deltaPercent = previousValue ? ((delta / previousValue) * 100).toFixed(1) : '0';
  const isImproved = direction === 'up' ? delta > 0 : delta < 0;
  const isWorsened = direction === 'up' ? delta < 0 : delta > 0;
  
  // Determine severity
  let severity: 'normal' | 'warning' | 'critical' = 'normal';
  if (direction === 'up') {
    if (value < thresholds.critical) severity = 'critical';
    else if (value < thresholds.warning) severity = 'warning';
  } else {
    if (value > thresholds.critical) severity = 'critical';
    else if (value > thresholds.warning) severity = 'warning';
  }

  const formattedValue = format ? format(value) : value.toFixed(1);

  return (
    <Card className={cn(
      "transition-all duration-300",
      severity === 'critical' && "border-destructive/50 bg-destructive/5",
      severity === 'warning' && "border-yellow-500/50 bg-yellow-500/5"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="p-2 rounded-lg bg-muted">
            {icon}
          </div>
          <Badge variant={
            severity === 'critical' ? 'destructive' : 
            severity === 'warning' ? 'secondary' : 
            'outline'
          }>
            {severity === 'critical' ? '🔴' : severity === 'warning' ? '🟡' : '🟢'}
          </Badge>
        </div>
        
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{formattedValue}</span>
            <span className="text-sm text-muted-foreground">{unit}</span>
          </div>
          
          {delta !== 0 && (
            <div className={cn(
              "flex items-center gap-1 text-xs",
              isImproved && "text-green-600",
              isWorsened && "text-red-600",
              !isImproved && !isWorsened && "text-muted-foreground"
            )}>
              {isImproved ? <TrendingUp className="h-3 w-3" /> : 
               isWorsened ? <TrendingDown className="h-3 w-3" /> : null}
              <span>{delta > 0 ? '+' : ''}{deltaPercent}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SovereignDCKPIPanel({ kpis, previousKpis, isSimulating }: SovereignDCKPIPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Key Performance Indicators</h3>
        {isSimulating && (
          <Badge variant="secondary" className="animate-pulse">
            Simulating...
          </Badge>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard
          label="Sovereign Compute Ratio"
          value={kpis.sovereignComputeRatioPct}
          unit="%"
          previousValue={previousKpis?.sovereignComputeRatioPct}
          direction="up"
          icon={<Shield className="h-4 w-4 text-primary" />}
          thresholds={{ warning: 80, critical: 60 }}
        />
        
        <KPICard
          label="Effective AI PUE"
          value={kpis.effectiveAiPue}
          unit=""
          previousValue={previousKpis?.effectiveAiPue}
          direction="down"
          icon={<Zap className="h-4 w-4 text-yellow-500" />}
          thresholds={{ warning: 1.4, critical: 1.6 }}
          format={(v) => v.toFixed(2)}
        />
        
        <KPICard
          label="gCO₂e per GPU-hour"
          value={kpis.gco2PerGpuHour}
          unit="g"
          previousValue={previousKpis?.gco2PerGpuHour}
          direction="down"
          icon={<Leaf className="h-4 w-4 text-green-500" />}
          thresholds={{ warning: 60, critical: 100 }}
        />
        
        <KPICard
          label="Sovereign Risk Score"
          value={kpis.sovereignRiskScore}
          unit="/100"
          previousValue={previousKpis?.sovereignRiskScore}
          direction="down"
          icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
          thresholds={{ warning: 30, critical: 50 }}
        />
        
        <KPICard
          label="Economic Efficiency"
          value={kpis.economicEfficiencyScore}
          unit="/100"
          previousValue={previousKpis?.economicEfficiencyScore}
          direction="up"
          icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
          thresholds={{ warning: 60, critical: 40 }}
        />
      </div>
    </div>
  );
}
