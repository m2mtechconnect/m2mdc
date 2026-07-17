/**
 * Enterprise KPI Card with Live State
 * Shows current value, delta, severity, target distance, and "why it matters"
 * Enhanced with enterprise-grade animations
 * 
 * Integrates with TwinOverlayContext to filter KPIs by active overlay domain
 */

import { useMemo, useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Minus, Target, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import type { KPISnapshot } from '@/simulation/types';
import { DEFAULT_KPI_CONFIGS, getThresholdZoneForValue, getDistanceToTarget } from '@/engines/kpi/KPIOverlayEngine';
import { useTwinOverlaySafe, isKpiDomainMatchingOverlay } from '@/context/TwinOverlayContext';
import { ProvenanceBadge } from '@/components/provenance/ProvenanceBadge';
import type { DataProvenance } from '@/lib/provenance/types';

// Animated number component with smooth counting
function AnimatedNumber({ 
  value, 
  decimals = 2,
  duration = 0.5 
}: { 
  value: number; 
  decimals?: number;
  duration?: number;
}) {
  const spring = useSpring(value, { 
    stiffness: 100, 
    damping: 30,
    duration: duration * 1000
  });
  const display = useTransform(spring, (v) => v.toFixed(decimals));
  const [displayValue, setDisplayValue] = useState(value.toFixed(decimals));

  useEffect(() => {
    spring.set(value);
    const unsubscribe = display.on('change', (v) => setDisplayValue(v));
    return () => unsubscribe();
  }, [value, spring, display]);

  return <span>{displayValue}</span>;
}

// Sparkline mini chart
function MiniSparkline({ 
  values, 
  color = 'currentColor',
  height = 20,
  width = 60 
}: { 
  values: number[]; 
  color?: string;
  height?: number;
  width?: number;
}) {
  if (values.length < 2) return null;
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <motion.polyline
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {/* Current value dot */}
      <motion.circle
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.6, type: "spring" }}
        cx={width}
        cy={height - ((values[values.length - 1] - min) / range) * height}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

interface EnterpriseKPICardProps {
  kpiId: string;
  currentValue: number;
  previousValue?: number;
  baseline?: number;
  history?: number[];
  /**
   * @deprecated (Phase 1A.3.b) — use `provenance` instead. When both are
   * omitted the card defaults to `demo`. When only `isLive` is provided the
   * card infers `simulated` (true) or `demo` (false); a `LIVE` label is
   * never rendered because the value is not sourced from validated
   * telemetry.
   */
  isLive?: boolean;
  /**
   * Explicit provenance for this KPI. `simulated` is correct while a
   * simulation run is active; `demo` when the value came from a fixture;
   * `derived` / `live` only when the value truly came from a validated
   * source. Never pass `live` for values produced by `useSimulation`.
   */
  provenance?: DataProvenance;
  /**
   * Human-readable source identifier for the provenance badge tooltip
   * (e.g. scenario id, "sovereignDataCenter/simulationEngine").
   */
  provenanceSource?: string;
  provenanceAt?: Date;
  compact?: boolean;
  onClick?: () => void;
}

export function EnterpriseKPICard({
  kpiId,
  currentValue,
  previousValue,
  baseline,
  history = [],
  isLive = false,
  provenance,
  provenanceSource,
  provenanceAt,
  compact = false,
  onClick,
}: EnterpriseKPICardProps) {
  const config = DEFAULT_KPI_CONFIGS[kpiId];
  const [hasChanged, setHasChanged] = useState(false);
  const prevValueRef = useRef(currentValue);
  
  if (!config) {
    return null;
  }

  // Detect significant value changes for pulse animation
  useEffect(() => {
    const changePercent = Math.abs((currentValue - prevValueRef.current) / prevValueRef.current) * 100;
    if (changePercent > 2) {
      setHasChanged(true);
      const timer = setTimeout(() => setHasChanged(false), 600);
      return () => clearTimeout(timer);
    }
    prevValueRef.current = currentValue;
  }, [currentValue]);

  // Resolve provenance: explicit prop wins; else infer from legacy isLive.
  // Simulation output is `simulated`, never `live` — the value is not a
  // validated telemetry reading.
  const resolvedProvenance: DataProvenance =
    provenance ?? (isLive ? 'simulated' : 'demo');
  const provenanceMeta = {
    provenance: resolvedProvenance,
    source: provenanceSource ?? (resolvedProvenance === 'simulated'
      ? 'sovereignDataCenter/simulationEngine'
      : 'demo-fixture'),
    at: provenanceAt,
    stale: false,
    note: config.description,
  };
  const testId = `metric-kpi-${kpiId}`;

  const zone = getThresholdZoneForValue(kpiId, currentValue);
  const distanceToTarget = getDistanceToTarget(kpiId, currentValue);
  
  const delta = previousValue !== undefined ? currentValue - previousValue : 0;
  const deltaPercent = previousValue ? ((delta / previousValue) * 100) : 0;
  
  const isImproving = config.lowerIsBetter 
    ? delta < 0 
    : delta > 0;
  
  const isNeutral = Math.abs(deltaPercent) < 0.5;

  const severityColor = zone?.severity === 'critical' 
    ? 'border-destructive bg-destructive/5' 
    : zone?.severity === 'warning' 
      ? 'border-warning bg-warning/5' 
      : 'border-success/30 bg-success/5';

  const glowColor = zone?.severity === 'critical'
    ? 'shadow-[0_0_15px_-3px_hsl(var(--destructive)/0.4)]'
    : zone?.severity === 'warning'
      ? 'shadow-[0_0_15px_-3px_hsl(var(--warning)/0.4)]'
      : resolvedProvenance === 'live' || resolvedProvenance === 'derived'
        ? 'shadow-[0_0_15px_-3px_hsl(var(--success)/0.3)]'
        : '';

  const TrendIcon = isNeutral ? Minus : isImproving ? TrendingUp : TrendingDown;
  const trendColor = isNeutral 
    ? 'text-muted-foreground' 
    : isImproving 
      ? 'text-success' 
      : 'text-destructive';

  const sparklineColor = zone?.severity === 'critical' 
    ? 'hsl(var(--destructive))' 
    : zone?.severity === 'warning' 
      ? 'hsl(var(--warning))' 
      : 'hsl(var(--success))';

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ 
          opacity: 1, 
          scale: hasChanged ? [1, 1.03, 1] : 1,
        }}
        transition={{ 
          duration: 0.3,
          scale: { duration: 0.4, ease: "easeOut" }
        }}
        className={cn(
          "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md overflow-hidden",
          severityColor,
          (resolvedProvenance === 'live' || resolvedProvenance === 'derived') && glowColor
        )}
        onClick={onClick}
        data-testid={testId}
        data-provenance={resolvedProvenance}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium truncate">{config.name}</span>
            <ProvenanceBadge meta={provenanceMeta} compact />
          </div>
        </div>
        
        <div className="flex items-end justify-between mt-2">
          <motion.span
            key={`value-${kpiId}`}
            animate={{ 
              color: hasChanged 
                ? [undefined, isImproving ? 'hsl(var(--success))' : 'hsl(var(--destructive))', undefined]
                : undefined
            }}
            transition={{ duration: 0.4 }}
            className="text-xl font-bold font-mono"
          >
            <AnimatedNumber 
              value={currentValue} 
              decimals={config.unit === '%' ? 0 : 2}
            />
            <span className="text-xs text-muted-foreground ml-0.5">{config.unit}</span>
          </motion.span>
          
          {history.length > 2 && (
            <MiniSparkline 
              values={history.slice(-10)} 
              color={sparklineColor}
              height={16}
              width={40}
            />
          )}
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <motion.div
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Badge variant="outline" className={cn("text-[10px] h-4 gap-0.5", trendColor)}>
              <TrendIcon className="h-2.5 w-2.5" />
              {Math.abs(deltaPercent).toFixed(1)}%
            </Badge>
          </motion.div>
          {zone && (
            <motion.div
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Badge 
                variant="outline" 
                className="text-[10px] h-4"
                style={{ borderColor: zone.color, color: zone.color }}
              >
                {zone.label}
              </Badge>
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          scale: hasChanged ? [1, 1.02, 1] : 1
        }}
        transition={{ duration: 0.3 }}
      >
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-lg overflow-hidden",
            severityColor,
            (resolvedProvenance === 'live' || resolvedProvenance === 'derived') && "ring-1 ring-primary/30",
            (resolvedProvenance === 'live' || resolvedProvenance === 'derived') && glowColor
          )}
          onClick={onClick}
          data-testid={testId}
          data-provenance={resolvedProvenance}
        >
          <CardContent className="p-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm truncate">{config.name}</h4>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px]">
                      <p className="font-medium mb-1">Why this matters</p>
                      <p className="text-xs text-muted-foreground">{config.whyItMatters}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {config.description}
                </p>
              </div>
              <ProvenanceBadge meta={provenanceMeta} />
            </div>

            {/* Value with animated number */}
            <div className="flex items-end justify-between mb-3">
              <motion.div
                animate={{ 
                  color: hasChanged 
                    ? [undefined, isImproving ? 'hsl(var(--success))' : 'hsl(var(--destructive))', undefined]
                    : undefined
                }}
                transition={{ duration: 0.5 }}
                className="text-2xl font-bold font-mono"
              >
                <AnimatedNumber 
                  value={currentValue} 
                  decimals={config.unit === '%' ? 0 : 2}
                />
                <span className="text-sm text-muted-foreground ml-1">{config.unit}</span>
              </motion.div>
              
              <AnimatePresence mode="wait">
                {!isNeutral && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  >
                    <Badge variant="outline" className={cn("gap-1", trendColor)}>
                      <TrendIcon className="h-3 w-3" />
                      <span>{Math.abs(deltaPercent).toFixed(1)}%</span>
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sparkline */}
            {history.length > 2 && (
              <div className="mb-3">
                <MiniSparkline 
                  values={history.slice(-15)} 
                  color={sparklineColor}
                  height={24}
                  width={200}
                />
              </div>
            )}

            {/* Target & Severity */}
            <div className="flex items-center justify-between text-xs overflow-hidden">
              <div className="flex items-center gap-1.5 text-muted-foreground min-w-0 flex-1 truncate">
                <Target className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Target: {config.target}{config.unit}</span>
                {distanceToTarget > 0 && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn(
                      "ml-1 shrink-0",
                      isImproving ? "text-success" : "text-destructive"
                    )}
                  >
                    ({distanceToTarget.toFixed(1)} away)
                  </motion.span>
                )}
              </div>
              
              {zone && (
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ 
                    scale: zone.severity === 'critical' ? [1, 1.05, 1] : 1 
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: zone.severity === 'critical' ? Infinity : 0 
                  }}
                >
                  <Badge 
                    variant="outline" 
                    className="text-[10px]"
                    style={{ borderColor: zone.color, color: zone.color }}
                  >
                    {zone.severity === 'critical' && <AlertTriangle className="h-3 w-3 mr-1" />}
                    {zone.label}
                  </Badge>
                </motion.div>
              )}
            </div>

            {/* Animated Threshold Bar */}
            <div className="mt-3 h-2 rounded-full overflow-hidden bg-muted flex relative">
              {config.thresholds.bands.map((band, i) => {
                const width = ((band.max - band.min) / (config.thresholds.bands[config.thresholds.bands.length - 1].max - config.thresholds.bands[0].min)) * 100;
                return (
                  <motion.div
                    key={i}
                    initial={{ width: 0 }}
                    animate={{ width: `${width}%` }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="h-full"
                    style={{ 
                      backgroundColor: band.color,
                      opacity: zone?.severity === band.severity ? 1 : 0.3
                    }}
                  />
                );
              })}
              {/* Current value indicator */}
              <motion.div
                className="absolute top-0 bottom-0 w-0.5 bg-foreground/80"
                initial={{ left: '0%' }}
                animate={{ 
                  left: `${Math.min(100, Math.max(0, ((currentValue - config.thresholds.bands[0].min) / (config.thresholds.bands[config.thresholds.bands.length - 1].max - config.thresholds.bands[0].min)) * 100))}%`
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
}

// Grid of KPI Cards with stagger animation
interface EnterpriseKPICardGridProps {
  snapshots: KPISnapshot[];
  isLive?: boolean;
  onKpiClick?: (kpiId: string) => void;
}

export function EnterpriseKPICardGrid({ snapshots, isLive, onKpiClick }: EnterpriseKPICardGridProps) {
  const currentSnapshot = snapshots[snapshots.length - 1];
  const previousSnapshot = snapshots[snapshots.length - 2];
  const baselineSnapshot = snapshots[0];
  
  // Filter KPIs based on active overlay
  const { activeOverlay } = useTwinOverlaySafe();

  const kpiIds = useMemo(() => {
    const allKpiIds = Object.keys(DEFAULT_KPI_CONFIGS);
    // Filter KPIs to show only those matching the active overlay domain
    return allKpiIds.filter(kpiId => {
      const config = DEFAULT_KPI_CONFIGS[kpiId];
      return isKpiDomainMatchingOverlay(config?.domain || '', activeOverlay);
    });
  }, [activeOverlay]);

  // Build history for each KPI
  const kpiHistories = useMemo(() => {
    const histories: Record<string, number[]> = {};
    for (const kpiId of kpiIds) {
      histories[kpiId] = snapshots.slice(-15).map(s => s[kpiId] ?? 0);
    }
    return histories;
  }, [snapshots, kpiIds]);

  return (
    <motion.div 
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.06 }
        }
      }}
    >
      {kpiIds.map((kpiId) => (
        <motion.div
          key={kpiId}
          variants={{
            hidden: { opacity: 0, y: 20, scale: 0.95 },
            visible: { 
              opacity: 1, 
              y: 0, 
              scale: 1,
              transition: { type: "spring", stiffness: 300, damping: 25 }
            }
          }}
        >
          <EnterpriseKPICard
            kpiId={kpiId}
            currentValue={currentSnapshot?.[kpiId] ?? 0}
            previousValue={previousSnapshot?.[kpiId]}
            baseline={baselineSnapshot?.[kpiId]}
            history={kpiHistories[kpiId]}
            provenance={isLive ? 'simulated' : 'demo'}
            compact
            onClick={() => onKpiClick?.(kpiId)}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
