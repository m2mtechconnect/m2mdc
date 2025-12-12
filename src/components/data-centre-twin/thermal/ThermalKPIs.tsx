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
  
  const glowColors = {
    Stable: '',
    Warning: 'shadow-[0_0_15px_-3px_hsl(var(--warning)/0.3)]',
    Critical: 'shadow-[0_0_20px_-3px_hsl(var(--destructive)/0.4)]',
  };
  
  const trendIcons = {
    up: TrendingUp,
    down: TrendingDown,
    stable: Minus,
  };
  const TrendIcon = trendIcons[kpi.trend];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
      }}
      transition={{ 
        delay: index * 0.1,
        type: "spring",
        stiffness: 300,
        damping: 25
      }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      className={`rounded-lg border p-4 ${statusColors[kpi.status]} ${glowColors[kpi.status]} transition-shadow duration-300 cursor-pointer`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <motion.div
            animate={kpi.status === 'Critical' ? { 
              scale: [1, 1.2, 1],
              rotate: [0, -5, 5, 0]
            } : {}}
            transition={{ 
              duration: 0.6, 
              repeat: kpi.status === 'Critical' ? Infinity : 0,
              repeatDelay: 2
            }}
          >
            <Icon className={`h-4 w-4 ${
              kpi.status === 'Critical' ? 'text-red-500' : 'text-muted-foreground'
            }`} />
          </motion.div>
          <span className="text-sm text-muted-foreground">{kpi.label}</span>
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.1 + 0.2, type: "spring", stiffness: 400 }}
        >
          <Badge className={`${statusBadgeColors[kpi.status]} ${
            kpi.status === 'Critical' ? 'animate-pulse' : ''
          }`}>
            {kpi.status}
          </Badge>
        </motion.div>
      </div>
      
      {/* Value with counting animation */}
      <div className="flex items-baseline gap-2 mb-3">
        <motion.span 
          className="text-2xl font-bold font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 + 0.15 }}
        >
          {kpi.value}
        </motion.span>
        <motion.span 
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 + 0.2 }}
        >
          {kpi.unit}
        </motion.span>
        <motion.div
          className="ml-auto"
          animate={kpi.trend === 'up' ? { 
            y: [0, -3, 0],
          } : kpi.trend === 'down' ? {
            y: [0, 3, 0],
          } : {}}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <TrendIcon className={`h-4 w-4 ${
            kpi.trend === 'up' ? 'text-red-500' : 
            kpi.trend === 'down' ? 'text-emerald-500' : 'text-muted-foreground'
          }`} />
        </motion.div>
      </div>
      
      {/* Animated Sparkline */}
      <div className="h-8 mb-3">
        <AnimatedSparkline data={kpi.sparkline} status={kpi.status} delay={index * 0.1} />
      </div>
      
      {/* AI Insight with fade-in */}
      {kpi.insight && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 + 0.4 }}
          className="text-xs text-muted-foreground bg-muted/50 rounded p-2 border border-border/50"
        >
          <motion.span
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            💡
          </motion.span>{' '}
          {kpi.insight}
        </motion.div>
      )}
    </motion.div>
  );
}

interface SparklineProps {
  data: number[];
  status: 'Stable' | 'Warning' | 'Critical';
  delay?: number;
}

function AnimatedSparkline({ data, status, delay = 0 }: SparklineProps) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const strokeColor = {
    Stable: 'stroke-emerald-500',
    Warning: 'stroke-amber-500',
    Critical: 'stroke-red-500',
  }[status];
  
  const fillColor = {
    Stable: 'fill-emerald-500/10',
    Warning: 'fill-amber-500/10',
    Critical: 'fill-red-500/10',
  }[status];
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');
  
  // Create area fill path
  const areaPath = `M 0,100 L ${data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(' L ')} L 100,100 Z`;
  
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
      {/* Gradient fill under the line */}
      <motion.path
        d={areaPath}
        className={fillColor}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.3, duration: 0.5 }}
      />
      {/* Animated line */}
      <motion.polyline
        points={points}
        fill="none"
        className={`${strokeColor} opacity-70`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.7 }}
        transition={{ 
          delay: delay + 0.2,
          duration: 0.8, 
          ease: "easeOut" 
        }}
      />
      {/* Animated end dot */}
      <motion.circle
        cx={(data.length - 1) / (data.length - 1) * 100}
        cy={100 - ((data[data.length - 1] - min) / range) * 80 - 10}
        r="3"
        className={strokeColor.replace('stroke-', 'fill-')}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: delay + 0.9, type: "spring", stiffness: 300 }}
      />
    </svg>
  );
}
