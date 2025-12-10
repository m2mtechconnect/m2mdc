/**
 * Thermal Insights Panel
 * AI-driven recommendations from the Thermal Agent
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, AlertTriangle, TrendingUp, Wind, Cpu, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

interface ThermalInsightsPanelProps {
  facility: DataCentreFacility;
}

interface ThermalInsight {
  id: string;
  type: 'warning' | 'recommendation' | 'optimization' | 'info';
  title: string;
  description: string;
  impact?: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
}

export function ThermalInsightsPanel({ facility }: ThermalInsightsPanelProps) {
  const insights = useMemo<ThermalInsight[]>(() => {
    const racks = facility.thermalHardware.racks;
    const coolingZones = facility.cooling.zones;
    
    const insights: ThermalInsight[] = [];
    
    // Check for hot racks
    const hotRacks = racks.filter(r => r.inletTempC >= 28);
    if (hotRacks.length > 0) {
      insights.push({
        id: 'hot-racks',
        type: 'warning',
        title: `${hotRacks.length} rack${hotRacks.length > 1 ? 's' : ''} exceeding temperature threshold`,
        description: `${hotRacks.map(r => r.name).join(', ')} showing inlet temps above 28°C`,
        impact: 'Risk of thermal throttling and reduced equipment lifespan',
        action: 'Increase local cooling or redistribute workloads',
        priority: 'high',
      });
    }
    
    // Check for high delta-T
    const highDeltaT = racks.filter(r => r.deltaT > 7);
    if (highDeltaT.length > 0) {
      insights.push({
        id: 'high-delta-t',
        type: 'warning',
        title: 'Rising ΔT trend detected',
        description: `${highDeltaT[0].name} showing ΔT of ${highDeltaT[0].deltaT.toFixed(1)}°C; possible airflow obstruction`,
        impact: '9% increased energy spend in affected zone',
        action: 'Check for blocked vents or cable obstructions',
        priority: 'medium',
      });
    }
    
    // Cooling efficiency recommendation
    const avgEfficiency = coolingZones.reduce((acc, z) => 
      acc + (100 - Math.abs(z.ambientTempC - z.targetTempC) * 10), 0
    ) / coolingZones.length;
    
    if (avgEfficiency < 85) {
      insights.push({
        id: 'cooling-efficiency',
        type: 'recommendation',
        title: 'Cooling zone imbalance detected',
        description: `Cooling Zone C showing ${Math.round(avgEfficiency)}% efficiency`,
        impact: 'Suboptimal PUE contributing to higher operating costs',
        action: 'Suggested: increase CRAC B fan speed by 8%',
        priority: 'medium',
      });
    }
    
    // GPU temperature optimization
    const gpuClusters = facility.workloadGpu.clusters;
    const avgGpuTemp = gpuClusters.reduce((acc, c) => {
      const clusterAvg = c.nodes.reduce((sum, n) => {
        const nodeAvg = n.gpuTempC.reduce((s, t) => s + t, 0) / n.gpuTempC.length;
        return sum + nodeAvg;
      }, 0) / c.nodes.length;
      return acc + clusterAvg;
    }, 0) / gpuClusters.length;
    
    if (avgGpuTemp > 75) {
      insights.push({
        id: 'gpu-temps',
        type: 'warning',
        title: 'GPU temperatures approaching threshold',
        description: `Average GPU temp at ${avgGpuTemp.toFixed(0)}°C across compute clusters`,
        impact: 'May trigger thermal throttling, reducing training throughput',
        action: 'Consider liquid cooling augmentation or workload scheduling',
        priority: 'high',
      });
    }
    
    // Positive insight if everything is stable
    if (insights.length === 0) {
      insights.push({
        id: 'stable',
        type: 'info',
        title: 'Thermal environment stable',
        description: 'All racks operating within normal parameters',
        priority: 'low',
      });
    }
    
    // Always add an optimization opportunity
    insights.push({
      id: 'optimization',
      type: 'optimization',
      title: 'Night-mode cooling opportunity',
      description: 'Ambient temps projected to drop 3°C after 22:00',
      impact: 'Potential 12% reduction in cooling energy consumption',
      action: 'Enable adaptive setpoint scheduling',
      priority: 'low',
    });
    
    return insights.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [facility]);
  
  const typeConfig = {
    warning: {
      icon: AlertTriangle,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10 border-amber-500/30',
    },
    recommendation: {
      icon: Lightbulb,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10 border-blue-500/30',
    },
    optimization: {
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
    },
    info: {
      icon: CheckCircle2,
      color: 'text-slate-500',
      bg: 'bg-slate-500/10 border-slate-500/30',
    },
  };
  
  const priorityColors = {
    high: 'bg-red-500/20 text-red-500 border-red-500/30',
    medium: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
    low: 'bg-slate-500/20 text-slate-500 border-slate-500/30',
  };
  
  return (
    <div className="rounded-lg border border-border/50 bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          <span className="font-semibold">Thermal Agent Insights</span>
        </div>
        <Badge variant="outline">{insights.length} insights</Badge>
      </div>
      
      {/* Insights list */}
      <div className="space-y-3">
        {insights.map((insight, index) => {
          const config = typeConfig[insight.type];
          const Icon = config.icon;
          
          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-3 rounded-lg border ${config.bg}`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`h-4 w-4 mt-0.5 ${config.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-sm">{insight.title}</span>
                    <Badge className={priorityColors[insight.priority]}>
                      {insight.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                  
                  {insight.impact && (
                    <p className="text-xs text-muted-foreground mt-2">
                      <span className="font-medium">Impact:</span> {insight.impact}
                    </p>
                  )}
                  
                  {insight.action && (
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-primary">
                        ➜ {insight.action}
                      </span>
                      <Button size="sm" variant="outline" className="h-6 text-xs">
                        Apply
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
