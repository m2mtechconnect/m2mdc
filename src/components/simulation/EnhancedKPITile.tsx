/**
 * Enhanced KPI Tile Component
 * Enterprise-grade KPI visualization with severity indicators, sparklines, 
 * baseline overlays, prediction cones, and threshold zones
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Area, AreaChart, ResponsiveContainer, ReferenceLine, 
  ReferenceArea, Tooltip, XAxis, YAxis 
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Maximize2, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KPIDataPoint {
  timestamp: number | string;
  value: number;
  baseline?: number;
  predicted?: number;
  upperBound?: number;
  lowerBound?: number;
}

export interface KPIThresholds {
  critical: number;
  warning: number;
  target: number;
  direction: 'higher' | 'lower'; // higher is better vs lower is better
}

export interface EnhancedKPITileProps {
  label: string;
  data: KPIDataPoint[];
  thresholds?: KPIThresholds;
  unit?: string;
  scenario?: string;
  isRunning?: boolean;
  lastUpdated?: Date;
  onClick?: () => void;
  className?: string;
}

type SeverityLevel = 'critical' | 'warning' | 'normal' | 'optimal';

export function EnhancedKPITile({
  label,
  data,
  thresholds,
  unit = '',
  scenario,
  isRunning = false,
  lastUpdated,
  onClick,
  className
}: EnhancedKPITileProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Calculate statistics
  const stats = useMemo(() => {
    if (data.length === 0) {
      return { 
        current: 0, 
        previous: 0, 
        trend: 'stable' as const, 
        percentChange: 0,
        severity: 'normal' as SeverityLevel,
        sparkline: []
      };
    }

    const current = data[data.length - 1]?.value ?? 0;
    const previous = data.length > 1 ? data[data.length - 2]?.value ?? current : current;
    const trend = current > previous ? 'up' : current < previous ? 'down' : 'stable';
    const percentChange = previous !== 0 ? ((current - previous) / previous) * 100 : 0;

    // Calculate severity based on thresholds
    let severity: SeverityLevel = 'normal';
    if (thresholds) {
      const { critical, warning, target, direction } = thresholds;
      if (direction === 'higher') {
        if (current >= target) severity = 'optimal';
        else if (current >= warning) severity = 'normal';
        else if (current >= critical) severity = 'warning';
        else severity = 'critical';
      } else {
        if (current <= target) severity = 'optimal';
        else if (current <= warning) severity = 'normal';
        else if (current <= critical) severity = 'warning';
        else severity = 'critical';
      }
    }

    // Get last 10 points for sparkline
    const sparkline = data.slice(-10).map((d, i) => ({ 
      idx: i, 
      value: d.value 
    }));

    return { current, previous, trend, percentChange, severity, sparkline };
  }, [data, thresholds]);

  // Y-axis domain calculation
  const yDomain = useMemo(() => {
    if (data.length === 0) return [0, 100];
    
    const values = data.flatMap(d => [
      d.value, 
      d.baseline ?? d.value,
      d.upperBound ?? d.value,
      d.lowerBound ?? d.value
    ]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    if (range < 0.1) {
      const padding = Math.max(Math.abs(max) * 0.2, 5);
      return [Math.max(0, min - padding), max + padding];
    }
    
    const padding = range * 0.15;
    return [Math.max(0, min - padding), max + padding];
  }, [data]);

  // Severity colors and icons
  const severityConfig = {
    critical: { color: 'text-red-500', bg: 'bg-red-500', icon: '🔴', border: 'border-red-500/50' },
    warning: { color: 'text-yellow-500', bg: 'bg-yellow-500', icon: '🟡', border: 'border-yellow-500/50' },
    normal: { color: 'text-blue-500', bg: 'bg-blue-500', icon: '🔵', border: 'border-border' },
    optimal: { color: 'text-green-500', bg: 'bg-green-500', icon: '🟢', border: 'border-green-500/50' }
  };

  const config = severityConfig[stats.severity];
  
  // Format last updated
  const lastUpdatedText = useMemo(() => {
    if (!lastUpdated) return null;
    const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  }, [lastUpdated]);

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-300 cursor-pointer group",
        config.border,
        isHovered && "shadow-lg scale-[1.02]",
        stats.severity === 'critical' && "bg-red-500/5",
        stats.severity === 'warning' && "bg-yellow-500/5",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Header with sparkline */}
      <CardHeader className="pb-2 space-y-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base">{config.icon}</span>
              <h4 className="text-sm font-semibold truncate">{label}</h4>
            </div>
            {scenario && (
              <Badge variant="secondary" className="mt-1 text-[10px]">
                {scenario}
              </Badge>
            )}
          </div>
          
          {/* Sparkline in header */}
          <div className="w-16 h-6 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.sparkline} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Current value with trend */}
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums">
              {stats.current.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </span>
            <span className="text-sm text-muted-foreground">{unit}</span>
          </div>
          
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium",
            stats.trend === 'up' && thresholds?.direction === 'higher' && "text-green-500",
            stats.trend === 'up' && thresholds?.direction === 'lower' && "text-red-500",
            stats.trend === 'down' && thresholds?.direction === 'lower' && "text-green-500",
            stats.trend === 'down' && thresholds?.direction === 'higher' && "text-red-500",
            stats.trend === 'stable' && "text-muted-foreground"
          )}>
            {stats.trend === 'up' && <TrendingUp className="h-4 w-4" />}
            {stats.trend === 'down' && <TrendingDown className="h-4 w-4" />}
            {stats.trend === 'stable' && <Minus className="h-4 w-4" />}
            <span>
              {stats.percentChange > 0 ? '+' : ''}
              {stats.percentChange.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Main chart with baseline, prediction cone, and threshold zones */}
        <div className="h-24 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <defs>
                <linearGradient id={`kpi-gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id={`prediction-gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              
              <XAxis dataKey="timestamp" hide />
              <YAxis hide domain={yDomain} />
              
              {/* Threshold zones */}
              {thresholds && (
                <>
                  {thresholds.direction === 'lower' ? (
                    <>
                      <ReferenceArea 
                        y1={thresholds.critical} 
                        y2={yDomain[1]} 
                        fill="hsl(var(--destructive))" 
                        fillOpacity={0.1} 
                      />
                      <ReferenceArea 
                        y1={thresholds.warning} 
                        y2={thresholds.critical} 
                        fill="hsl(38, 92%, 50%)" 
                        fillOpacity={0.1} 
                      />
                      <ReferenceArea 
                        y1={yDomain[0]} 
                        y2={thresholds.target} 
                        fill="hsl(142, 76%, 36%)" 
                        fillOpacity={0.1} 
                      />
                    </>
                  ) : (
                    <>
                      <ReferenceArea 
                        y1={yDomain[0]} 
                        y2={thresholds.critical} 
                        fill="hsl(var(--destructive))" 
                        fillOpacity={0.1} 
                      />
                      <ReferenceArea 
                        y1={thresholds.critical} 
                        y2={thresholds.warning} 
                        fill="hsl(38, 92%, 50%)" 
                        fillOpacity={0.1} 
                      />
                      <ReferenceArea 
                        y1={thresholds.target} 
                        y2={yDomain[1]} 
                        fill="hsl(142, 76%, 36%)" 
                        fillOpacity={0.1} 
                      />
                    </>
                  )}
                  <ReferenceLine 
                    y={thresholds.target} 
                    stroke="hsl(142, 76%, 36%)" 
                    strokeDasharray="4 4" 
                    strokeWidth={1}
                  />
                </>
              )}

              {/* Prediction cone (confidence band) */}
              {data.some(d => d.upperBound !== undefined) && (
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  stroke="none"
                  fill={`url(#prediction-gradient-${label})`}
                  isAnimationActive={false}
                />
              )}
              {data.some(d => d.lowerBound !== undefined) && (
                <Area
                  type="monotone"
                  dataKey="lowerBound"
                  stroke="none"
                  fill="transparent"
                  isAnimationActive={false}
                />
              )}

              {/* Baseline overlay (faint grey) */}
              {data.some(d => d.baseline !== undefined) && (
                <Area
                  type="monotone"
                  dataKey="baseline"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  fill="none"
                  isAnimationActive={false}
                />
              )}

              {/* Main value line */}
              <Area
                type="monotoneX"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill={`url(#kpi-gradient-${label})`}
                animationDuration={500}
                animationEasing="ease-out"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--background))' }}
              />

              <Tooltip 
                contentStyle={{ 
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number, name: string) => {
                  const displayName = name === 'value' ? label : name === 'baseline' ? 'Baseline' : name;
                  return [value.toFixed(2) + ' ' + unit, displayName];
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Footer with timestamp and expand icon */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {isRunning && (
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3 animate-pulse text-primary" />
                <span>Simulation</span>
              </div>
            )}
            {lastUpdatedText && (
              <span>Updated: {lastUpdatedText}</span>
            )}
          </div>
          
          <Maximize2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </CardContent>
    </Card>
  );
}
