/**
 * Animated KPI Strip - Real-time animated KPIs during simulation
 * Uses centralized KPI catalog for consistent definitions
 */

import { memo, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, Cpu, Wind, Leaf, Shield, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { KPI_CATALOG, KPIKey, type KPIDefinition } from '@/domain/greenDc/kpiCatalog';
import { ProvenanceBadge } from '@/components/provenance/ProvenanceBadge';
import type { DataProvenance } from '@/lib/provenance/types';

interface AnimatedKPIStripProps {
  kpis: Record<string, number>;
  baselineKpis: Record<string, number>;
  isRunning: boolean;
  /**
   * Explicit provenance for the strip. When omitted the strip renders
   * `simulated` while a run is active and `demo` otherwise. `live` is not
   * a supported value here — the underlying KPIs come from `useSimulation`,
   * not validated telemetry.
   */
  provenance?: Extract<DataProvenance, 'simulated' | 'demo'>;
  /** Optional scenario id for the badge tooltip. */
  scenarioId?: string;
}

interface KPIConfig {
  id: string;
  label: string;
  unit: string;
  icon: React.ElementType;
  color: string;
  goodDirection: 'up' | 'down';
  format?: (v: number) => string;
}

// Map KPIKey to icons and colors
const kpiIconMap: Record<string, { icon: React.ElementType; color: string }> = {
  [KPIKey.PUE]: { icon: Zap, color: 'text-warning' },
  [KPIKey.GPU_UTILIZATION]: { icon: Cpu, color: 'text-accent' },
  [KPIKey.COOLING_EFFICIENCY]: { icon: Wind, color: 'text-info' },
  [KPIKey.CARBON_INTENSITY]: { icon: Leaf, color: 'text-success' },
  [KPIKey.SOVEREIGN_COMPLIANCE]: { icon: Shield, color: 'text-primary' },
};

// Core simulation KPIs to display
const simulationKpiKeys: KPIKey[] = [
  KPIKey.PUE,
  KPIKey.GPU_UTILIZATION,
  KPIKey.COOLING_EFFICIENCY,
  KPIKey.CARBON_INTENSITY,
  KPIKey.SOVEREIGN_COMPLIANCE,
];

// Build KPI configs from catalog
const kpiConfigs: KPIConfig[] = simulationKpiKeys.map(key => {
  const def = KPI_CATALOG[key];
  const iconConfig = kpiIconMap[key] || { icon: Zap, color: 'text-muted-foreground' };
  
  return {
    id: key,
    label: def?.label || key,
    unit: def?.unit || '',
    icon: iconConfig.icon,
    color: iconConfig.color,
    goodDirection: def?.direction === 'higher_is_better' ? 'up' : 'down',
    format: def?.unit === '' ? (v: number) => v.toFixed(2) : (v: number) => Math.round(v).toString(),
  };
});

const AnimatedKPICard = memo(function AnimatedKPICard({
  config,
  value,
  baseline,
  isRunning,
  provenance,
  scenarioId,
}: {
  config: KPIConfig;
  value: number;
  baseline: number;
  isRunning: boolean;
  provenance: Extract<DataProvenance, 'simulated' | 'demo'>;
  scenarioId?: string;
}) {
  const [prevValue, setPrevValue] = useState(value);
  const [isChanging, setIsChanging] = useState(false);
  
  const delta = value - baseline;
  const deltaPercent = baseline !== 0 ? (delta / baseline) * 100 : 0;
  const isSignificantChange = Math.abs(deltaPercent) > 5;
  
  const isGood = config.goodDirection === 'up' ? delta > 0 : delta < 0;
  const TrendIcon = delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  
  // Detect value changes for pulse animation
  useEffect(() => {
    if (Math.abs(value - prevValue) > 0.1) {
      setIsChanging(true);
      const timeout = setTimeout(() => setIsChanging(false), 500);
      setPrevValue(value);
      return () => clearTimeout(timeout);
    }
  }, [value, prevValue]);

  const Icon = config.icon;

  const meta = {
    provenance,
    source: provenance === 'simulated'
      ? (scenarioId ?? 'sovereignDataCenter/simulationEngine')
      : 'demo-fixture',
    stale: false,
    note: config.label,
  };

  return (
    <motion.div
      animate={{
        scale: isChanging && isSignificantChange ? [1, 1.05, 1] : 1,
      }}
      transition={{ duration: 0.3 }}
      data-testid={`metric-strip-${config.id}`}
      data-provenance={provenance}
    >
      <Card className={cn(
        'bg-card border-border transition-all duration-300',
        isSignificantChange && isRunning && 'ring-2',
        isSignificantChange && isGood && 'ring-success/30',
        isSignificantChange && !isGood && 'ring-destructive/30'
      )}>
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className={cn('p-1.5 rounded-lg bg-muted/50', config.color)}>
              <Icon className="h-4 w-4" />
            </div>
            <ProvenanceBadge meta={meta} compact className="ml-auto" />
          </div>
          <div className="flex items-center justify-end mb-1 min-h-[16px]">
            {isRunning && delta !== 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Badge 
                  variant="outline" 
                  className={cn(
                    'text-[10px] gap-0.5',
                    isGood ? 'text-success border-success/30' : 'text-destructive border-destructive/30'
                  )}
                >
                  <TrendIcon className="h-2.5 w-2.5" />
                  {deltaPercent > 0 ? '+' : ''}{deltaPercent.toFixed(1)}%
                </Badge>
              </motion.div>
            )}
          </div>
          
          <motion.div
            key={value}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            className="space-y-0.5"
          >
            <span className={cn(
              'text-xl font-bold font-mono',
              isChanging && isSignificantChange && 'animate-pulse'
            )}>
              {config.format ? config.format(value) : value}
              <span className="text-xs text-muted-foreground ml-0.5">{config.unit}</span>
            </span>
            <p className="text-[10px] text-muted-foreground">{config.label}</p>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

export const AnimatedKPIStrip = memo(function AnimatedKPIStrip({
  kpis,
  baselineKpis,
  isRunning,
  provenance,
  scenarioId,
}: AnimatedKPIStripProps) {
  const resolvedProvenance: Extract<DataProvenance, 'simulated' | 'demo'> =
    provenance ?? (isRunning ? 'simulated' : 'demo');
  return (
    <div className="grid grid-cols-5 gap-3" data-provenance={resolvedProvenance}>
      {kpiConfigs.map((config) => (
        <AnimatedKPICard
          key={config.id}
          config={config}
          value={kpis[config.id] ?? baselineKpis[config.id] ?? 0}
          baseline={baselineKpis[config.id] ?? 0}
          isRunning={isRunning}
          provenance={resolvedProvenance}
          scenarioId={scenarioId}
        />
      ))}
    </div>
  );
});
