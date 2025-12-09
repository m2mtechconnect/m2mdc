/**
 * KPI Detail Modal
 * Full-screen modal with zoomable time-series, scenario overlays,
 * model breakdown, forecasts, and CoPilot insights
 */

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Area, AreaChart, ResponsiveContainer, ReferenceLine, 
  ReferenceArea, Tooltip, XAxis, YAxis, CartesianGrid,
  Legend, Line, LineChart, ComposedChart, Bar
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Minus, ZoomIn, ZoomOut, 
  Pin, Lightbulb, AlertTriangle, CheckCircle, Clock,
  Brain, BarChart2, Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KPIDataPoint, KPIThresholds } from './EnhancedKPITile';

interface KPIDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  data: KPIDataPoint[];
  thresholds?: KPIThresholds;
  unit?: string;
  scenario?: string;
  pinnedEvents?: Array<{ timestamp: number; label: string; type: string }>;
  onPinEvent?: (timestamp: number) => void;
}

export function KPIDetailModal({
  open,
  onOpenChange,
  label,
  data,
  thresholds,
  unit = '',
  scenario,
  pinnedEvents = [],
  onPinEvent
}: KPIDetailModalProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showBaseline, setShowBaseline] = useState(true);
  const [showForecast, setShowForecast] = useState(true);

  // Calculate domain based on zoom
  const displayData = useMemo(() => {
    const pointsToShow = Math.floor(data.length / zoomLevel);
    return data.slice(-pointsToShow);
  }, [data, zoomLevel]);

  // Generate forecast data (simulated)
  const forecastData = useMemo(() => {
    if (data.length < 2) return [];
    
    const lastValue = data[data.length - 1]?.value ?? 0;
    const trend = data.length > 5 
      ? (data[data.length - 1]?.value - data[data.length - 5]?.value) / 5 
      : 0;
    
    return Array.from({ length: 12 }, (_, i) => {
      const projected = lastValue + trend * (i + 1);
      const uncertainty = Math.abs(projected) * 0.05 * (i + 1);
      return {
        timestamp: `+${(i + 1) * 30}m`,
        predicted: projected,
        upperBound: projected + uncertainty,
        lowerBound: projected - uncertainty,
        isForecast: true
      };
    });
  }, [data]);

  // Model contribution breakdown (simulated)
  const modelBreakdown = useMemo(() => {
    return [
      { name: 'Historical Trend', contribution: 35, color: 'hsl(var(--primary))' },
      { name: 'Seasonal Pattern', contribution: 25, color: 'hsl(210, 80%, 60%)' },
      { name: 'Event Impact', contribution: 20, color: 'hsl(142, 76%, 36%)' },
      { name: 'External Factors', contribution: 15, color: 'hsl(38, 92%, 50%)' },
      { name: 'Noise/Random', contribution: 5, color: 'hsl(var(--muted-foreground))' }
    ];
  }, []);

  // CoPilot-generated insights (simulated)
  const insights = useMemo(() => {
    const current = data[data.length - 1]?.value ?? 0;
    const avg = data.reduce((sum, d) => sum + d.value, 0) / (data.length || 1);
    const isAboveAvg = current > avg * 1.1;
    const isBelowAvg = current < avg * 0.9;

    return {
      summary: `${label} is currently at ${current.toFixed(1)}${unit}, ${
        isAboveAvg ? 'above' : isBelowAvg ? 'below' : 'near'
      } the historical average of ${avg.toFixed(1)}${unit}.`,
      anomalies: isAboveAvg || isBelowAvg ? [
        `Unusual ${isAboveAvg ? 'spike' : 'drop'} detected in the last hour`,
        `This pattern correlates with ${scenario || 'current scenario'} conditions`
      ] : [],
      recommendations: [
        `Monitor closely for the next 30 minutes`,
        thresholds && current > thresholds.warning 
          ? `Consider activating contingency protocols` 
          : `Current trajectory suggests stable operation`,
        `Review correlated metrics for confirmation`
      ],
      severity: isAboveAvg || isBelowAvg ? 'warning' : 'normal'
    };
  }, [data, label, unit, scenario, thresholds]);

  // Y-axis domain
  const yDomain = useMemo(() => {
    const allValues = [
      ...displayData.map(d => d.value),
      ...displayData.filter(d => d.baseline).map(d => d.baseline!),
      ...forecastData.map(d => d.predicted),
      ...forecastData.map(d => d.upperBound),
      ...forecastData.map(d => d.lowerBound)
    ];
    
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const range = max - min;
    const padding = range * 0.1 || 10;
    
    return [Math.max(0, min - padding), max + padding];
  }, [displayData, forecastData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">{label}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                {scenario && <Badge variant="secondary">{scenario}</Badge>}
                <Badge variant="outline" className="font-mono">{unit}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setZoomLevel(z => Math.max(1, z - 0.5))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[4ch] text-center">
                {zoomLevel}x
              </span>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setZoomLevel(z => Math.min(4, z + 0.5))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Main Chart */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Time Series</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant={showBaseline ? "secondary" : "ghost"} 
                      size="sm"
                      onClick={() => setShowBaseline(!showBaseline)}
                    >
                      Baseline
                    </Button>
                    <Button 
                      variant={showForecast ? "secondary" : "ghost"} 
                      size="sm"
                      onClick={() => setShowForecast(!showForecast)}
                    >
                      Forecast
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart 
                      data={[...displayData, ...(showForecast ? forecastData : [])]}
                      margin={{ top: 10, right: 30, bottom: 30, left: 10 }}
                    >
                      <defs>
                        <linearGradient id="kpi-detail-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="forecast-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(210, 80%, 60%)" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="hsl(210, 80%, 60%)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis 
                        dataKey="timestamp" 
                        tick={{ fontSize: 10 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis 
                        domain={yDomain}
                        tick={{ fontSize: 10 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      
                      {/* Threshold zones */}
                      {thresholds && (
                        <>
                          <ReferenceArea 
                            y1={thresholds.critical} 
                            y2={yDomain[1]} 
                            fill="hsl(var(--destructive))" 
                            fillOpacity={0.1}
                          />
                          <ReferenceLine 
                            y={thresholds.target} 
                            stroke="hsl(142, 76%, 36%)" 
                            strokeDasharray="4 4"
                            label={{ value: 'Target', position: 'right', fontSize: 10 }}
                          />
                          <ReferenceLine 
                            y={thresholds.warning} 
                            stroke="hsl(38, 92%, 50%)" 
                            strokeDasharray="4 4"
                          />
                        </>
                      )}
                      
                      {/* Pinned events */}
                      {pinnedEvents.map((event, i) => (
                        <ReferenceLine 
                          key={i}
                          x={event.timestamp}
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          label={{ value: event.label, position: 'top', fontSize: 10 }}
                        />
                      ))}
                      
                      {/* Forecast confidence band */}
                      {showForecast && (
                        <>
                          <Area
                            type="monotone"
                            dataKey="upperBound"
                            stroke="none"
                            fill="url(#forecast-gradient)"
                            isAnimationActive={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="predicted"
                            stroke="hsl(210, 80%, 60%)"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                            isAnimationActive={false}
                          />
                        </>
                      )}
                      
                      {/* Baseline */}
                      {showBaseline && (
                        <Line
                          type="monotone"
                          dataKey="baseline"
                          stroke="hsl(var(--muted-foreground))"
                          strokeWidth={1.5}
                          strokeDasharray="3 3"
                          dot={false}
                          isAnimationActive={false}
                        />
                      )}
                      
                      {/* Main value */}
                      <Area
                        type="monotoneX"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#kpi-detail-gradient)"
                        dot={{ r: 2, fill: 'hsl(var(--primary))' }}
                        activeDot={{ r: 6, strokeWidth: 2, fill: 'hsl(var(--background))' }}
                      />
                      
                      <Tooltip 
                        contentStyle={{ 
                          background: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Insights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CoPilot Insights */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    What This Means
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{insights.summary}</p>
                  
                  {insights.anomalies.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm font-medium text-yellow-600">
                        <AlertTriangle className="h-4 w-4" />
                        Anomalies Detected
                      </div>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {insights.anomalies.map((a, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-yellow-500">•</span>
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recommended Actions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Recommended Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {insights.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Model Contribution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-primary" />
                    Model Contribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {modelBreakdown.map((item, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{item.name}</span>
                          <span className="font-medium">{item.contribution}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${item.contribution}%`,
                              backgroundColor: item.color
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Forecast Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    2-6 Hour Forecast
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    {[2, 4, 6].map(hours => {
                      const forecast = forecastData[hours * 2 - 1];
                      return (
                        <div key={hours} className="text-center p-2 rounded-lg bg-muted/50">
                          <div className="text-xs text-muted-foreground">+{hours}h</div>
                          <div className="text-lg font-bold">
                            {forecast?.predicted.toFixed(1) ?? '—'}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            ±{((forecast?.upperBound ?? 0) - (forecast?.predicted ?? 0)).toFixed(1)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
