/**
 * Animated KPI Chart Component
 * Live-updating time-series chart for simulation KPIs
 * Uses Recharts with smooth animations
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KPISnapshot } from '@/simulation/types';
import { motion } from 'framer-motion';

interface AnimatedKPIChartProps {
  title: string;
  kpiKey: string;
  snapshots: KPISnapshot[];
  baseline?: number;
  unit?: string;
  color?: string;
  isRunning?: boolean;
  invertTrend?: boolean; // If true, lower is better (like PUE)
}

export function AnimatedKPIChart({
  title,
  kpiKey,
  snapshots,
  baseline,
  unit = '',
  color = 'hsl(var(--primary))',
  isRunning = false,
  invertTrend = false,
}: AnimatedKPIChartProps) {
  const chartData = useMemo(() => {
    return snapshots.map(s => ({
      time: s.timestamp,
      value: s[kpiKey] ?? 0,
      timeLabel: formatTime(s.timestamp),
    }));
  }, [snapshots, kpiKey]);

  const currentValue = chartData.length > 0 ? chartData[chartData.length - 1].value : baseline ?? 0;
  const delta = baseline ? currentValue - baseline : 0;
  const isImprovement = invertTrend ? delta < 0 : delta > 0;
  const isNeutral = Math.abs(delta) < 0.5;

  const TrendIcon = isNeutral ? Minus : isImprovement ? TrendingUp : TrendingDown;
  const trendColor = isNeutral 
    ? 'text-muted-foreground' 
    : isImprovement 
      ? 'text-success' 
      : 'text-destructive';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        'bg-card border-border transition-all duration-300',
        isRunning && 'ring-1 ring-primary/30'
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {title}
            </CardTitle>
            <div className="flex items-center gap-2">
              {isRunning && (
                <Badge variant="outline" className="text-[10px] animate-pulse bg-success/10 text-success">
                  LIVE
                </Badge>
              )}
              <motion.div
                key={currentValue}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1"
              >
                <span className="text-lg font-bold font-mono">
                  {currentValue.toFixed(2)}{unit}
                </span>
                {!isNeutral && (
                  <Badge variant="outline" className={cn('text-xs gap-0.5', trendColor)}>
                    <TrendIcon className="h-3 w-3" />
                    {Math.abs(delta).toFixed(1)}
                  </Badge>
                )}
              </motion.div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[150px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis
                  dataKey="timeLabel"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  width={40}
                  domain={['dataMin - 5', 'dataMax + 5']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                  formatter={(value: number) => [`${value.toFixed(2)}${unit}`, title]}
                />
                {baseline !== undefined && (
                  <ReferenceLine
                    y={baseline}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="3 3"
                    label={{ value: 'Baseline', position: 'right', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: color }}
                  isAnimationActive={true}
                  animationDuration={300}
                  animationEasing="ease-out"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {baseline !== undefined && (
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Baseline: {baseline.toFixed(2)}{unit}</span>
              <span>Current: {currentValue.toFixed(2)}{unit}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Multi-chart grid for displaying multiple KPIs
interface AnimatedKPIChartGridProps {
  snapshots: KPISnapshot[];
  baselineKpis: Record<string, number>;
  isRunning: boolean;
}

export function AnimatedKPIChartGrid({ snapshots, baselineKpis, isRunning }: AnimatedKPIChartGridProps) {
  const kpiConfigs = [
    { key: 'pue', title: 'PUE', unit: '', color: 'hsl(var(--warning))', invertTrend: true },
    { key: 'thermalStabilityScore', title: 'Thermal Stability', unit: '%', color: 'hsl(var(--destructive))' },
    { key: 'gpuUtilization', title: 'GPU Utilization', unit: '%', color: 'hsl(var(--primary))' },
    { key: 'emissionsVsTarget', title: 'Carbon vs Target', unit: '%', color: 'hsl(var(--success))' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {kpiConfigs.map((config, index) => (
        <motion.div
          key={config.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <AnimatedKPIChart
            title={config.title}
            kpiKey={config.key}
            snapshots={snapshots}
            baseline={baselineKpis[config.key]}
            unit={config.unit}
            color={config.color}
            isRunning={isRunning}
            invertTrend={config.invertTrend}
          />
        </motion.div>
      ))}
    </div>
  );
}
