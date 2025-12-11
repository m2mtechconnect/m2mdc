/**
 * Enterprise KPI Chart with Threshold Zones, Anomalies, Forecast, and Event Markers
 * Matches capabilities of Nvidia Omniverse, AWS CloudWatch, Siemens Digital Twins
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Dot,
} from 'recharts';
import { Activity, TrendingUp, TrendingDown, Minus, AlertTriangle, Zap, Info, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { KPISnapshot, KPIAnomaly, SimulationEvent } from '@/simulation/types';
import { 
  DEFAULT_KPI_CONFIGS, 
  detectAnomalies, 
  generateForecast,
  generateHoverInsight,
  getThresholdZoneForValue,
} from '@/engines/kpi/KPIOverlayEngine';

interface EnterpriseKPIChartProps {
  kpiId: string;
  snapshots: KPISnapshot[];
  events?: SimulationEvent[];
  baseline?: number;
  isRunning?: boolean;
  showThresholdZones?: boolean;
  showAnomalies?: boolean;
  showForecast?: boolean;
  showEventMarkers?: boolean;
  onTimeClick?: (timestamp: number) => void;
  className?: string;
}

export function EnterpriseKPIChart({
  kpiId,
  snapshots,
  events = [],
  baseline,
  isRunning = false,
  showThresholdZones = true,
  showAnomalies = true,
  showForecast = true,
  showEventMarkers = true,
  onTimeClick,
  className,
}: EnterpriseKPIChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ value: number; timestamp: number } | null>(null);
  const [visibleLayers, setVisibleLayers] = useState({
    thresholds: showThresholdZones,
    anomalies: showAnomalies,
    forecast: showForecast,
    events: showEventMarkers,
  });

  const config = DEFAULT_KPI_CONFIGS[kpiId];

  // Prepare chart data - must be called before any early returns
  const chartData = useMemo(() => {
    if (!config) return [];
    return snapshots.map(s => ({
      time: s.timestamp,
      value: s[kpiId] ?? 0,
      timeLabel: formatTime(s.timestamp),
    }));
  }, [snapshots, kpiId, config]);

  // Detect anomalies
  const anomalies = useMemo(() => {
    if (!visibleLayers.anomalies || !config) return [];
    return detectAnomalies(snapshots, kpiId, config.anomalySensitivity);
  }, [snapshots, kpiId, config, visibleLayers.anomalies]);

  // Generate forecast
  const forecast = useMemo(() => {
    if (!visibleLayers.forecast || !config?.forecastEnabled) return null;
    return generateForecast(snapshots, kpiId, config.forecastHorizonMinutes);
  }, [snapshots, kpiId, config, visibleLayers.forecast]);

  // Find related events
  const relatedEvents = useMemo(() => {
    if (!visibleLayers.events || !config) return [];
    return events.filter(
      e => e.affectedKpis?.includes(kpiId) || e.domain === config.domain
    );
  }, [events, kpiId, config, visibleLayers.events]);

  // Combined chart data with forecast
  const fullChartData = useMemo(() => {
    if (!forecast?.predictions.length) return chartData;
    
    const forecastData = forecast.predictions.map(p => ({
      time: p.timestamp,
      value: null, // Don't show solid line
      forecastValue: p.value,
      forecastUpper: p.upperBound,
      forecastLower: p.lowerBound,
      timeLabel: formatTime(p.timestamp),
      isForecast: true,
    }));

    return [...chartData, ...forecastData];
  }, [chartData, forecast]);

  // Hover insight
  const hoverInsight = useMemo(() => {
    if (!hoveredPoint) return null;
    return generateHoverInsight(kpiId, hoveredPoint.value, hoveredPoint.timestamp, snapshots, events);
  }, [hoveredPoint, kpiId, snapshots, events]);

  // Early return AFTER all hooks
  if (!config) return null;

  // Current values - these can be computed after the early return since they don't use hooks
  const currentValue = chartData.length > 0 ? chartData[chartData.length - 1].value : baseline ?? 0;
  const delta = baseline ? currentValue - baseline : 0;
  const isImprovement = config.lowerIsBetter ? delta < 0 : delta > 0;
  const isNeutral = Math.abs(delta) < 0.5;
  const zone = getThresholdZoneForValue(kpiId, currentValue);

  const TrendIcon = isNeutral ? Minus : isImprovement ? TrendingUp : TrendingDown;
  const trendColor = isNeutral ? 'text-muted-foreground' : isImprovement ? 'text-success' : 'text-destructive';

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.[0]) return null;

    const value = payload[0].value;
    const timestamp = payload[0].payload.time;
    const zone = getThresholdZoneForValue(kpiId, value);
    const anomaly = anomalies.find(a => a.timestamp === timestamp);
    const event = relatedEvents.find(e => Math.abs(e.timestamp - timestamp) <= 10);

    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg max-w-[280px]">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">{config.name}</span>
          {zone && (
            <Badge 
              variant="outline" 
              className="text-[10px]"
              style={{ borderColor: zone.color, color: zone.color }}
            >
              {zone.label}
            </Badge>
          )}
        </div>
        
        <div className="text-2xl font-bold font-mono mb-2">
          {value?.toFixed(2)}{config.unit}
        </div>

        {anomaly && (
          <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs mb-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{anomaly.description}</span>
          </div>
        )}

        {event && (
          <div className="flex items-start gap-2 p-2 rounded bg-warning/10 text-warning text-xs mb-2">
            <Zap className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{event.title}</span>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p className="mb-1">{config.whyItMatters}</p>
          <p className="font-mono">{formatTime(timestamp)}</p>
        </div>
      </div>
    );
  };

  // Anomaly dot renderer
  const renderAnomalyDot = (props: any) => {
    const { cx, cy, payload } = props;
    const anomaly = anomalies.find(a => a.timestamp === payload.time);
    
    if (anomaly) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={6} fill="hsl(var(--destructive))" stroke="white" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={10} fill="hsl(var(--destructive))" opacity={0.3}>
            <animate attributeName="r" from="6" to="14" dur="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.5" to="0" dur="1s" repeatCount="indefinite" />
          </circle>
        </g>
      );
    }

    return <circle cx={cx} cy={cy} r={0} />;
  };

  const toggleLayer = (layer: keyof typeof visibleLayers) => {
    setVisibleLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn("bg-card border-border", className, isRunning && "ring-1 ring-primary/30")}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">{config.name}</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[200px]">
                    <p className="text-xs">{config.whyItMatters}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Layer toggles */}
              <div className="flex gap-1">
                {[
                  { key: 'thresholds', label: 'Zones', icon: '🎯' },
                  { key: 'anomalies', label: 'Anomalies', icon: '⚠️' },
                  { key: 'forecast', label: 'Forecast', icon: '📈' },
                  { key: 'events', label: 'Events', icon: '⚡' },
                ].map(({ key, label, icon }) => (
                  <Button
                    key={key}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-6 px-2 text-[10px]",
                      visibleLayers[key as keyof typeof visibleLayers] 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground"
                    )}
                    onClick={() => toggleLayer(key as keyof typeof visibleLayers)}
                  >
                    {icon}
                  </Button>
                ))}
              </div>

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
                  {currentValue.toFixed(2)}{config.unit}
                </span>
                {!isNeutral && (
                  <Badge variant="outline" className={cn("text-xs gap-0.5", trendColor)}>
                    <TrendIcon className="h-3 w-3" />
                    {Math.abs(delta).toFixed(1)}
                  </Badge>
                )}
              </motion.div>
            </div>
          </div>

          {/* Anomaly & Forecast Summary */}
          {(anomalies.length > 0 || forecast?.trend !== 'stable') && (
            <div className="flex gap-2 mt-2">
              {anomalies.length > 0 && (
                <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 bg-destructive/5">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {anomalies.length} anomalies detected
                </Badge>
              )}
              {forecast && forecast.trend !== 'stable' && (
                <Badge variant="outline" className={cn(
                  "text-[10px]",
                  forecast.trend === 'improving' ? "text-success border-success/30" : "text-warning border-warning/30"
                )}>
                  {forecast.trend === 'improving' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  Forecast: {forecast.trend} ({forecast.trendConfidence.toFixed(0)}% conf)
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={fullChartData} 
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                onMouseMove={(e) => {
                  if (e.activePayload?.[0]) {
                    const payload = e.activePayload[0].payload;
                    setHoveredPoint({ value: payload.value, timestamp: payload.time });
                  }
                }}
                onMouseLeave={() => setHoveredPoint(null)}
                onClick={(e) => {
                  if (e.activePayload?.[0] && onTimeClick) {
                    onTimeClick(e.activePayload[0].payload.time);
                  }
                }}
              >
                {/* Threshold zones */}
                {visibleLayers.thresholds && config.thresholds.bands.map((band, i) => (
                  <ReferenceArea
                    key={i}
                    y1={band.min}
                    y2={band.max}
                    fill={band.color}
                    fillOpacity={0.1}
                    stroke={band.color}
                    strokeOpacity={0.3}
                    strokeDasharray="3 3"
                  />
                ))}

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
                
                <RechartsTooltip content={<CustomTooltip />} />
                
                {/* Target line */}
                <ReferenceLine
                  y={config.target}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{ 
                    value: `Target: ${config.target}`, 
                    position: 'right', 
                    fontSize: 10, 
                    fill: 'hsl(var(--primary))' 
                  }}
                />

                {/* Event markers as vertical lines */}
                {visibleLayers.events && relatedEvents.map(event => (
                  <ReferenceLine
                    key={event.id}
                    x={formatTime(event.timestamp)}
                    stroke={event.severity === 'critical' ? 'hsl(var(--destructive))' : 'hsl(var(--warning))'}
                    strokeDasharray="2 2"
                    strokeWidth={1}
                  />
                ))}

                {/* Forecast confidence area */}
                {visibleLayers.forecast && forecast && (
                  <Line
                    type="monotone"
                    dataKey="forecastValue"
                    stroke={config.color}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    connectNulls={false}
                  />
                )}

                {/* Main data line */}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={config.color}
                  strokeWidth={2}
                  dot={visibleLayers.anomalies ? renderAnomalyDot : false}
                  activeDot={{ r: 6, fill: config.color, stroke: 'white', strokeWidth: 2 }}
                  isAnimationActive={true}
                  animationDuration={300}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Footer stats */}
          <div className="flex justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
            <span>Baseline: {baseline?.toFixed(2) ?? 'N/A'}{config.unit}</span>
            <span>Target: {config.target}{config.unit}</span>
            <span>Current: {currentValue.toFixed(2)}{config.unit}</span>
          </div>
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
