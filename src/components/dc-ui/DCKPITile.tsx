/**
 * Data Centre KPI Tile Component
 * Enterprise-grade metric display with sparkline, threshold indicator, and delta
 */

import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type KPIStatus = 'normal' | 'warning' | 'critical' | 'info';
export type KPITrend = 'up' | 'down' | 'stable';

export interface DCKPITileProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string | number;
  trend?: KPITrend;
  status?: KPIStatus;
  threshold?: {
    value: number;
    max: number;
    showBar?: boolean;
  };
  thresholdValue?: number;
  sparklineData?: number[];
  icon?: ReactNode;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function DCKPITile({
  label,
  value,
  unit,
  delta,
  trend = 'stable',
  status = 'normal',
  threshold,
  thresholdValue,
  sparklineData,
  icon,
  subtitle,
  onClick,
  className,
  compact = false,
  size = 'md',
}: DCKPITileProps) {
  const statusColors = {
    normal: 'border-l-dc-green',
    warning: 'border-l-dc-amber',
    critical: 'border-l-dc-red',
    info: 'border-l-dc-blue',
  };

  const valueColors = {
    normal: 'text-foreground',
    warning: 'text-dc-amber',
    critical: 'text-dc-red',
    info: 'text-dc-blue',
  };

  const deltaColors = {
    up: 'text-dc-green',
    down: 'text-dc-red',
    stable: 'text-muted-foreground',
  };

  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  };

  const valueSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  // Calculate threshold percentage from either threshold object or thresholdValue prop
  const thresholdPercentage = thresholdValue !== undefined 
    ? Math.min(thresholdValue, 100)
    : threshold 
      ? Math.min((threshold.value / threshold.max) * 100, 100) 
      : 0;

  const thresholdColor = thresholdPercentage > 90 
    ? 'bg-dc-red' 
    : thresholdPercentage > 70 
      ? 'bg-dc-amber' 
      : 'bg-dc-green';

  return (
    <div
      onClick={onClick}
      className={cn(
        'noc-card border-l-4 transition-all',
        statusColors[status],
        onClick && 'cursor-pointer hover:border-l-primary',
        compact ? 'p-2' : sizeClasses[size],
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="kpi-label truncate text-xs">{label}</span>
        {icon && (
          <div className={cn('flex-shrink-0', valueColors[status])}>
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1 mb-1">
        <span className={cn('kpi-value font-bold', valueColors[status], compact ? 'text-lg' : valueSizes[size])}>
          {value}
        </span>
        {unit && (
          <span className="text-sm text-muted-foreground font-medium">{unit}</span>
        )}
        {status === 'critical' && (
          <AlertTriangle className="h-4 w-4 text-dc-red ml-1 animate-pulse-glow" />
        )}
      </div>

      {/* Delta */}
      {delta !== undefined && (
        <div className={cn('kpi-delta flex items-center gap-1 text-xs', deltaColors[trend])}>
          <TrendIcon className="h-3 w-3" />
          <span>{typeof delta === 'number' ? `${delta > 0 ? '+' : ''}${delta}%` : delta}</span>
        </div>
      )}

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}

      {/* Threshold Bar */}
      {(threshold?.showBar || thresholdValue !== undefined) && (
        <div className="mt-3">
          {threshold?.showBar && (
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{threshold.value}</span>
              <span>{threshold.max}</span>
            </div>
          )}
          <div className="h-1.5 bg-noc-surface-elevated rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', thresholdColor)}
              style={{ width: `${thresholdPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 0 && !compact && (
        <div className="mt-3 h-8">
          <Sparkline data={sparklineData} status={status} />
        </div>
      )}
    </div>
  );
}

interface SparklineProps {
  data: number[];
  status: KPIStatus;
}

function Sparkline({ data, status }: SparklineProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  const strokeColor = {
    normal: 'hsl(var(--dc-green))',
    warning: 'hsl(var(--dc-amber))',
    critical: 'hsl(var(--dc-red))',
    info: 'hsl(var(--dc-cyan))',
  }[status];

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default DCKPITile;
