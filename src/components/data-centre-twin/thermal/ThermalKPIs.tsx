/**
 * Thermal KPI Strip
 * Enhanced KPIs with sparklines, condition tags, and AI micro-insights
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Thermometer, AlertTriangle, Cpu, Fan, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { DataCentreFacility } from '@/types/dataCenterTwin';
import { generateSparklineData, getTempStatus } from './ThermalHeatmapUtils';

interface ThermalKPIsProps {
  facility: DataCentreFacility;
}

interface KPIData {
  label: string;
  value: string;
  unit: string;
  status: 'Stable' | 'Warning' | 'Critical';
  trend: 'up' | 'down' | 'stable';
  sparkline: number[];
  insight?: string;
  icon: React.ElementType;
}

export function ThermalKPIs({ facility }: ThermalKPIsProps) {
  const kpis = useMemo<KPIData[]>(() => {
    const racks = facility.thermalHardware.racks;
    const coolingZones = facility.cooling.zones;
    
    // Calculate metrics
    const avgInletTemp = racks.reduce((acc, r) => acc + r.inletTempC, 0) / racks.length;
    const hotRacks = racks.filter(r => r.inletTempC >= 28);
    const avgDeltaT = racks.reduce((acc, r) => acc + r.deltaT, 0) / racks.length;
    
    const gpuClusters = facility.workloadGpu.clusters;
    const avgGpuTemp = gpuClusters.reduce((acc, c) => {
      const clusterAvg = c.nodes.reduce((sum, n) => {
        const nodeAvg = n.gpuTempC.reduce((s, t) => s + t, 0) / n.gpuTempC.length;
        return sum + nodeAvg;
      }, 0) / c.nodes.length;
      return acc + clusterAvg;
    }, 0) / gpuClusters.length;
    
    const coolingEfficiency = coolingZones.reduce((acc, z) => 
      acc + (100 - Math.abs(z.ambientTempC - z.targetTempC) * 10), 0
    ) / coolingZones.length;
    
    return [
      {
        label: 'Avg Inlet Temp',
        value: avgInletTemp.toFixed(1),
        unit: '°C',
        status: getTempStatus(avgInletTemp),
        trend: avgInletTemp > 24 ? 'up' : 'stable',
        sparkline: generateSparklineData(avgInletTemp, 12, 0.05),
        insight: avgInletTemp > 26 ? 'Cooling imbalance detected in Hot Aisle 1' : undefined,
        icon: Thermometer,
      },
      {
        label: 'Hot Racks',
        value: String(hotRacks.length),
        unit: `of ${racks.length}`,
        status: hotRacks.length === 0 ? 'Stable' : hotRacks.length < 3 ? 'Warning' : 'Critical',
        trend: hotRacks.length > 2 ? 'up' : 'stable',
        sparkline: generateSparklineData(hotRacks.length, 12, 0.2),
        insight: hotRacks.length > 2 ? 'ΔT rising past recommended threshold' : undefined,
        icon: AlertTriangle,
      },
      {
        label: 'GPU Temps',
        value: avgGpuTemp.toFixed(0),
        unit: '°C',
        status: avgGpuTemp < 75 ? 'Stable' : avgGpuTemp < 85 ? 'Warning' : 'Critical',
        trend: avgGpuTemp > 80 ? 'up' : 'stable',
        sparkline: generateSparklineData(avgGpuTemp, 12, 0.08),
        icon: Cpu,
      },
      {
        label: 'Avg ΔT',
        value: avgDeltaT.toFixed(1),
        unit: '°C',
        status: avgDeltaT < 6 ? 'Stable' : avgDeltaT < 8 ? 'Warning' : 'Critical',
        trend: avgDeltaT > 7 ? 'up' : 'down',
        sparkline: generateSparklineData(avgDeltaT, 12, 0.1),
        insight: avgDeltaT > 7 ? 'Consider increasing CRAC fan speed' : undefined,
        icon: Fan,
      },
    ];
  }, [facility]);
  
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {kpis.map((kpi, index) => (
        <KPICard key={kpi.label} kpi={kpi} index={index} />
      ))}
    </div>
  );
}

interface KPICardProps {
  kpi: KPIData;
  index: number;
}

function KPICard({ kpi, index }: KPICardProps) {
  const Icon = kpi.icon;
  
  const statusColors = {
    Stable: 'bg-emerald-500/10 border-emerald-500/30',
    Warning: 'bg-amber-500/10 border-amber-500/30',
    Critical: 'bg-red-500/10 border-red-500/30',
  };
  
  const statusBadgeColors = {
    Stable: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
    Warning: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
    Critical: 'bg-red-500/20 text-red-500 border-red-500/30',
  };
  
  const trendIcons = {
    up: TrendingUp,
    down: TrendingDown,
    stable: Minus,
  };
  const TrendIcon = trendIcons[kpi.trend];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`rounded-lg border p-4 ${statusColors[kpi.status]}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{kpi.label}</span>
        </div>
        <Badge className={statusBadgeColors[kpi.status]}>{kpi.status}</Badge>
      </div>
      
      {/* Value */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-bold">{kpi.value}</span>
        <span className="text-sm text-muted-foreground">{kpi.unit}</span>
        <TrendIcon className={`h-4 w-4 ml-auto ${
          kpi.trend === 'up' ? 'text-red-500' : 
          kpi.trend === 'down' ? 'text-emerald-500' : 'text-muted-foreground'
        }`} />
      </div>
      
      {/* Sparkline */}
      <div className="h-8 mb-3">
        <Sparkline data={kpi.sparkline} status={kpi.status} />
      </div>
      
      {/* AI Insight */}
      {kpi.insight && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 border border-border/50">
          💡 {kpi.insight}
        </div>
      )}
    </motion.div>
  );
}

interface SparklineProps {
  data: number[];
  status: 'Stable' | 'Warning' | 'Critical';
}

function Sparkline({ data, status }: SparklineProps) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const strokeColor = {
    Stable: 'stroke-emerald-500',
    Warning: 'stroke-amber-500',
    Critical: 'stroke-red-500',
  }[status];
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        className={`${strokeColor} opacity-60`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
