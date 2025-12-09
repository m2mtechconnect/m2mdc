/**
 * KPI Charts Panel - Animated Time-Series Charts
 * Displays 2x2 grid of small multiples showing key performance indicators
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPIChartsPanelProps {
  kpis: any[];
  data: any[];
  scenario: any;
  isRunning: boolean;
}

export function KPIChartsPanel({ kpis, data, scenario, isRunning }: KPIChartsPanelProps) {
  // Extract up to 4 KPIs for 2x2 grid
  const displayKPIs = kpis.slice(0, 4);

  // Safely derive available metrics from simulation data
  const firstDataMetrics = data.length > 0 ? data[0]?.metrics : null;
  const availableMetrics: string[] = Array.isArray(firstDataMetrics) 
    ? firstDataMetrics.map((m: any) => m.label || '')
    : [];

  // Check if configured KPIs match available metrics
  const configuredKPIsMatch = displayKPIs.length > 0 && availableMetrics.length > 0 && displayKPIs.some(kpi => {
    const kpiLabel = kpi.label || kpi.name || '';
    return availableMetrics.some((m: string) => 
      m === kpiLabel || 
      m.toLowerCase().replace(/\s+/g, '_') === kpiLabel.toLowerCase().replace(/\s+/g, '_')
    );
  });

  // Transform data for each KPI
  const getKPIChartData = (kpiLabel: string) => {
    if (data.length === 0) return [];
    
    return data.map(point => {
      const metric = point.metrics?.find((m: any) => 
        m.label === kpiLabel || 
        m.label.toLowerCase().replace(/\s+/g, '_') === kpiLabel.toLowerCase().replace(/\s+/g, '_')
      );
      return {
        timestamp: point.timestamp,
        value: metric?.value || 0,
        unit: metric?.unit || ''
      };
    }).slice(-20); // Show last 20 points
  };

  // Calculate Y-axis domain with proper padding for flat lines
  const getYAxisDomain = (chartData: { value: number }[]): [number, number] => {
    if (chartData.length === 0) return [0, 100];
    
    const values = chartData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // If all values are the same or very close, create artificial range
    const range = max - min;
    if (range < 0.1) {
      const padding = Math.max(Math.abs(max) * 0.2, 5);
      return [Math.max(0, min - padding), max + padding];
    }
    
    // Normal case: add 10% padding
    const padding = range * 0.15;
    return [Math.max(0, min - padding), max + padding];
  };

  // Get latest value and trend for a KPI
  const getKPIStats = (kpiLabel: string) => {
    const chartData = getKPIChartData(kpiLabel);
    
    if (chartData.length === 0) {
      return { latestValue: 0, trend: 'stable', unit: '' };
    }

    const latestValue = chartData[chartData.length - 1]?.value || 0;
    const previousValue = chartData[chartData.length - 2]?.value || latestValue;
    const trend = latestValue > previousValue ? 'up' : latestValue < previousValue ? 'down' : 'stable';
    const unit = chartData[chartData.length - 1]?.unit || '';

    return { latestValue, trend, unit };
  };

  // Fallback if no KPIs and no data
  if (displayKPIs.length === 0 && data.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center text-muted-foreground">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No KPIs configured for this simulation</p>
          <p className="text-xs mt-1">Click Run to start the simulation</p>
        </CardContent>
      </Card>
    );
  }

  // If we have data but no explicit KPIs configured, or configured KPIs don't match available metrics,
  // derive them from the simulation data instead
  const metricsToShow = (displayKPIs.length > 0 && configuredKPIsMatch)
    ? displayKPIs 
    : Array.isArray(firstDataMetrics) && firstDataMetrics.length > 0
      ? firstDataMetrics.slice(0, 4).map((m: any) => ({ 
          label: m.label, 
          name: m.label,
          target_value: null,
          direction: null
        }))
      : [];

  // Handle case where we still have no metrics to show
  if (metricsToShow.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center text-muted-foreground">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Waiting for simulation data...</p>
          <p className="text-xs mt-1">Metrics will appear when simulation runs</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Live Metrics</h3>
        {isRunning && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Updating...
          </div>
        )}
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        {metricsToShow.map((kpi, index) => {
          const kpiLabel = kpi.label || kpi.name;
          const chartData = getKPIChartData(kpiLabel);
          const { latestValue, trend, unit } = getKPIStats(kpiLabel);
          const yDomain = getYAxisDomain(chartData);
          
          // Determine if threshold is breached
          const threshold = kpi.target_value ? parseFloat(kpi.target_value) : null;
          const isAlert = threshold && (
            (kpi.direction === 'higher' && latestValue < threshold) ||
            (kpi.direction === 'lower' && latestValue > threshold)
          );

          return (
            <Card 
              key={index} 
              className={cn(
                "transition-all duration-300",
                isAlert && "border-destructive/50 bg-destructive/5"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-medium">
                    {kpiLabel}
                  </CardTitle>
                  {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                  {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                  {trend === 'stable' && <Minus className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {latestValue.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {unit}
                  </span>
                </div>
                {threshold && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Target:</span>
                    <span className={cn(
                      "font-medium",
                      isAlert ? "text-destructive" : "text-green-600"
                    )}>
                      {threshold} {unit}
                    </span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={100}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <defs>
                      <linearGradient id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="timestamp" 
                      hide 
                    />
                    <YAxis 
                      hide 
                      domain={yDomain} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: number) => [value.toFixed(2), kpiLabel]}
                    />
                    {threshold && (
                      <ReferenceLine 
                        y={threshold} 
                        stroke="hsl(var(--muted-foreground))" 
                        strokeDasharray="3 3"
                        strokeWidth={1}
                      />
                    )}
                    <Area
                      type="monotoneX"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      fill={`url(#gradient-${index})`}
                      animationDuration={500}
                      animationEasing="ease-out"
                      isAnimationActive={true}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--background))' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
