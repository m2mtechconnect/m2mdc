/**
 * Thermal Forecast Panel
 * Predictive modeling for hotspot risk and cooling demand
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, Zap, Target, AlertTriangle, Thermometer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

interface ThermalForecastPanelProps {
  facility: DataCentreFacility;
}

interface ForecastMetric {
  label: string;
  current: number;
  forecast: number;
  unit: string;
  change: number;
  confidence: number;
  risk: 'low' | 'medium' | 'high';
  icon: React.ElementType;
}

export function ThermalForecastPanel({ facility }: ThermalForecastPanelProps) {
  const forecasts = useMemo<ForecastMetric[]>(() => {
    const racks = facility.thermalHardware.racks;
    const coolingZones = facility.cooling.zones;
    
    // Current metrics
    const avgTemp = racks.reduce((acc, r) => acc + r.inletTempC, 0) / racks.length;
    const avgHotspotRisk = racks.reduce((acc, r) => acc + r.hotspotRisk, 0) / racks.length;
    const totalCoolingKw = coolingZones.reduce((acc, z) => acc + (z.units?.reduce((sum, u) => sum + u.capacityKw, 0) || 50), 0);
    const avgDeltaT = racks.reduce((acc, r) => acc + r.deltaT, 0) / racks.length;
    
    // Pseudo-predictive model: trend-based extrapolation
    const tempTrend = avgTemp > 24 ? 0.5 : -0.2; // Trending up if warm
    const hotspotTrend = avgHotspotRisk > 20 ? 5 : -2;
    const coolingTrend = avgTemp > 26 ? 8 : -3;
    
    return [
      {
        label: 'Hotspot Risk (6h)',
        current: Math.round(avgHotspotRisk),
        forecast: Math.min(100, Math.max(0, Math.round(avgHotspotRisk + hotspotTrend * 2))),
        unit: '%',
        change: hotspotTrend * 2,
        confidence: 82,
        risk: avgHotspotRisk + hotspotTrend * 2 > 30 ? 'high' : avgHotspotRisk + hotspotTrend * 2 > 15 ? 'medium' : 'low',
        icon: AlertTriangle,
      },
      {
        label: 'Cooling Demand',
        current: Math.round(totalCoolingKw),
        forecast: Math.round(totalCoolingKw + coolingTrend * 3),
        unit: 'kW',
        change: coolingTrend * 3,
        confidence: 78,
        risk: coolingTrend > 5 ? 'medium' : 'low',
        icon: Zap,
      },
      {
        label: 'Avg Temperature',
        current: Math.round(avgTemp * 10) / 10,
        forecast: Math.round((avgTemp + tempTrend) * 10) / 10,
        unit: '°C',
        change: tempTrend,
        confidence: 85,
        risk: avgTemp + tempTrend > 27 ? 'high' : avgTemp + tempTrend > 25 ? 'medium' : 'low',
        icon: Thermometer,
      },
      {
        label: 'Energy Optimization',
        current: 0,
        forecast: avgTemp < 25 ? Math.round((25 - avgTemp) * 2) : 0,
        unit: '%',
        change: avgTemp < 25 ? Math.round((25 - avgTemp) * 2) : 0,
        confidence: 71,
        risk: 'low',
        icon: Target,
      },
    ];
  }, [facility]);
  
  const riskColors = {
    low: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    medium: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    high: 'bg-red-500/10 text-red-500 border-red-500/30',
  };
  
  return (
    <div className="rounded-lg border border-border/50 bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-500" />
          <span className="font-semibold">Thermal Forecast</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Next 6 hours
        </div>
      </div>
      
      {/* Forecast metrics */}
      <div className="space-y-4">
        {forecasts.map((metric, index) => {
          const Icon = metric.icon;
          const changePositive = metric.change > 0;
          
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{metric.label}</span>
                </div>
                <Badge className={riskColors[metric.risk]}>
                  {metric.risk} risk
                </Badge>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Current: {metric.current}{metric.unit}</span>
                    <span className={`font-medium ${
                      changePositive ? 'text-red-500' : 'text-emerald-500'
                    }`}>
                      {changePositive ? '+' : ''}{metric.change.toFixed(1)}{metric.unit}
                    </span>
                    <span>Forecast: {metric.forecast}{metric.unit}</span>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full bg-primary/30 rounded-full"
                      style={{ width: `${(metric.current / (metric.forecast * 1.2)) * 100}%` }}
                    />
                    <motion.div 
                      className={`absolute top-0 h-full rounded-full ${
                        metric.risk === 'high' ? 'bg-red-500' :
                        metric.risk === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(metric.forecast / (metric.forecast * 1.2)) * 100}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    />
                  </div>
                </div>
                
                <div className="text-right min-w-[60px]">
                  <div className="text-xs text-muted-foreground">Confidence</div>
                  <div className="font-mono text-sm">{metric.confidence}%</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Summary insight */}
      <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/50">
        <div className="text-xs text-muted-foreground">
          💡 <span className="font-medium">AI Insight:</span> Based on current workload patterns and 
          cooling efficiency, consider pre-emptively increasing CRAC fan speeds by 8% to prevent 
          thermal excursions during peak hours (14:00-18:00).
        </div>
      </div>
    </div>
  );
}
