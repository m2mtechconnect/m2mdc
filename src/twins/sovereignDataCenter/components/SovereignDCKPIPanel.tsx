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
import { ProvenanceBadge } from '@/components/provenance/ProvenanceBadge';
import type { DataProvenance } from '@/lib/provenance/types';

interface SovereignDCKPIPanelProps {
  kpis: SovereignKpis;
  previousKpis?: SovereignKpis;
  isSimulating?: boolean;
}

interface KPICardProps {
  id: string;
  label: string;
  value: number;
  unit: string;
  previousValue?: number;
  direction: 'up' | 'down';
  icon: React.ReactNode;
  thresholds: { warning: number; critical: number };
  format?: (v: number) => string;
  provenance: DataProvenance;
  sourceName: string;
  modelVersion?: string;
}

function KPICard({ 
  id, label, value, unit, previousValue, direction, icon, thresholds, format,
  provenance, sourceName, modelVersion,
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
    )}
      data-testid={`sovereign-kpi-${id}`}
      data-provenance={provenance}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="p-2 rounded-lg bg-muted">
            {icon}
          </div>
          <div className="flex items-center gap-1">
            <ProvenanceBadge
              meta={{
                provenance,
                source: sourceName,
                note: modelVersion ? `model ${modelVersion}` : undefined,
              }}
              compact
            />
            <Badge variant={
              severity === 'critical' ? 'destructive' :
              severity === 'warning' ? 'secondary' :
              'outline'
            }>
              {severity === 'critical' ? '🔴' : severity === 'warning' ? '🟡' : '🟢'}
            </Badge>
          </div>
        </div>
        
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <div className="flex items-baseline gap-1" data-testid={`sovereign-kpi-${id}-value`}>
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
  // Phase 1A.1 §4: this panel renders scenario-estimator output. Values are
  // NOT physics-based, NOT DSX/Modulus/Cadence/Ansys — they are the AURA
  // demonstration estimator, so we tag every card as `simulated` when a run
  // is active and `demo` otherwise so users cannot mistake the baseline
  // fixture for live telemetry.
  const cardProvenance: DataProvenance = isSimulating ? 'simulated' : 'demo';
  const sourceName = isSimulating ? 'aura-estimator' : 'demo-fixture';
  const modelVersion = isSimulating ? 'aura-estimator@v0-demo' : undefined;
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
          id="sovereign-compute-ratio"
          label="Sovereign Compute Ratio"
          value={kpis.sovereignComputeRatioPct}
          unit="%"
          previousValue={previousKpis?.sovereignComputeRatioPct}
          direction="up"
          icon={<Shield className="h-4 w-4 text-primary" />}
          thresholds={{ warning: 80, critical: 60 }}
          provenance={cardProvenance}
          sourceName={sourceName}
          modelVersion={modelVersion}
        />
        
        <KPICard
          id="effective-ai-pue"
          label="Effective AI PUE"
          value={kpis.effectiveAiPue}
          unit=""
          previousValue={previousKpis?.effectiveAiPue}
          direction="down"
          icon={<Zap className="h-4 w-4 text-yellow-500" />}
          thresholds={{ warning: 1.4, critical: 1.6 }}
          format={(v) => v.toFixed(2)}
          provenance={cardProvenance}
          sourceName={sourceName}
          modelVersion={modelVersion}
        />
        
        <KPICard
          id="gco2-per-gpu-hour"
          label="gCO₂e per GPU-hour"
          value={kpis.gco2PerGpuHour}
          unit="g"
          previousValue={previousKpis?.gco2PerGpuHour}
          direction="down"
          icon={<Leaf className="h-4 w-4 text-green-500" />}
          thresholds={{ warning: 60, critical: 100 }}
          provenance={cardProvenance}
          sourceName={sourceName}
          modelVersion={modelVersion}
        />
        
        <KPICard
          id="sovereign-risk"
          label="Sovereign Risk Score"
          value={kpis.sovereignRiskScore}
          unit="/100"
          previousValue={previousKpis?.sovereignRiskScore}
          direction="down"
          icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
          thresholds={{ warning: 30, critical: 50 }}
          provenance={cardProvenance}
          sourceName={sourceName}
          modelVersion={modelVersion}
        />
        
        <KPICard
          id="economic-efficiency"
          label="Economic Efficiency"
          value={kpis.economicEfficiencyScore}
          unit="/100"
          previousValue={previousKpis?.economicEfficiencyScore}
          direction="up"
          icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
          thresholds={{ warning: 60, critical: 40 }}
          provenance={cardProvenance}
          sourceName={sourceName}
          modelVersion={modelVersion}
        />
      </div>
    </div>
  );
}
