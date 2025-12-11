/**
 * Enterprise KPI Card with Live State
 * Shows current value, delta, severity, target distance, and "why it matters"
 */

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Minus, Target, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { KPISnapshot } from '@/simulation/types';
import { DEFAULT_KPI_CONFIGS, getThresholdZoneForValue, getDistanceToTarget } from '@/engines/kpi/KPIOverlayEngine';

interface EnterpriseKPICardProps {
  kpiId: string;
  currentValue: number;
  previousValue?: number;
  baseline?: number;
  isLive?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

export function EnterpriseKPICard({
  kpiId,
  currentValue,
  previousValue,
  baseline,
  isLive = false,
  compact = false,
  onClick,
}: EnterpriseKPICardProps) {
  const config = DEFAULT_KPI_CONFIGS[kpiId];
  
  if (!config) {
    return null;
  }

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

  const TrendIcon = isNeutral ? Minus : isImproving ? TrendingUp : TrendingDown;
  const trendColor = isNeutral 
    ? 'text-muted-foreground' 
    : isImproving 
      ? 'text-success' 
      : 'text-destructive';

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
          severityColor
        )}
        onClick={onClick}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium truncate">{config.name}</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={currentValue}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-lg font-bold font-mono"
            >
              {currentValue.toFixed(config.unit === '%' ? 0 : 2)}{config.unit}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="flex items-center justify-between mt-1">
          <Badge variant="outline" className={cn("text-[10px] h-4", trendColor)}>
            <TrendIcon className="h-2.5 w-2.5 mr-0.5" />
            {Math.abs(deltaPercent).toFixed(1)}%
          </Badge>
          {zone && (
            <Badge 
              variant="outline" 
              className="text-[10px] h-4"
              style={{ borderColor: zone.color, color: zone.color }}
            >
              {zone.label}
            </Badge>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-lg",
            severityColor,
            isLive && "ring-1 ring-primary/30"
          )}
          onClick={onClick}
        >
          <CardContent className="p-4">
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
              {isLive && (
                <Badge variant="outline" className="text-[10px] animate-pulse bg-success/10 text-success shrink-0">
                  LIVE
                </Badge>
              )}
            </div>

            {/* Value */}
            <div className="flex items-end justify-between mb-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentValue}
                  initial={{ scale: 1.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-2xl font-bold font-mono"
                >
                  {currentValue.toFixed(config.unit === '%' ? 0 : 2)}
                  <span className="text-sm text-muted-foreground ml-1">{config.unit}</span>
                </motion.div>
              </AnimatePresence>
              
              {!isNeutral && (
                <Badge variant="outline" className={cn("gap-1", trendColor)}>
                  <TrendIcon className="h-3 w-3" />
                  <span>{Math.abs(deltaPercent).toFixed(1)}%</span>
                </Badge>
              )}
            </div>

            {/* Target & Severity */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Target className="h-3.5 w-3.5" />
                <span>Target: {config.target}{config.unit}</span>
                {distanceToTarget > 0 && (
                  <span className={cn(
                    "ml-1",
                    isImproving ? "text-success" : "text-destructive"
                  )}>
                    ({distanceToTarget.toFixed(1)} away)
                  </span>
                )}
              </div>
              
              {zone && (
                <Badge 
                  variant="outline" 
                  className="text-[10px]"
                  style={{ borderColor: zone.color, color: zone.color }}
                >
                  {zone.severity === 'critical' && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {zone.label}
                </Badge>
              )}
            </div>

            {/* Threshold Bar */}
            <div className="mt-3 h-2 rounded-full overflow-hidden bg-muted flex">
              {config.thresholds.bands.map((band, i) => {
                const width = ((band.max - band.min) / (config.thresholds.bands[config.thresholds.bands.length - 1].max - config.thresholds.bands[0].min)) * 100;
                return (
                  <div
                    key={i}
                    className="h-full transition-all"
                    style={{ 
                      width: `${width}%`,
                      backgroundColor: band.color,
                      opacity: zone?.severity === band.severity ? 1 : 0.3
                    }}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
}

// Grid of KPI Cards
interface EnterpriseKPICardGridProps {
  snapshots: KPISnapshot[];
  isLive?: boolean;
  onKpiClick?: (kpiId: string) => void;
}

export function EnterpriseKPICardGrid({ snapshots, isLive, onKpiClick }: EnterpriseKPICardGridProps) {
  const currentSnapshot = snapshots[snapshots.length - 1];
  const previousSnapshot = snapshots[snapshots.length - 2];
  const baselineSnapshot = snapshots[0];

  const kpiIds = Object.keys(DEFAULT_KPI_CONFIGS);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpiIds.map((kpiId, i) => (
        <motion.div
          key={kpiId}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <EnterpriseKPICard
            kpiId={kpiId}
            currentValue={currentSnapshot?.[kpiId] ?? 0}
            previousValue={previousSnapshot?.[kpiId]}
            baseline={baselineSnapshot?.[kpiId]}
            isLive={isLive}
            compact
            onClick={() => onKpiClick?.(kpiId)}
          />
        </motion.div>
      ))}
    </div>
  );
}
