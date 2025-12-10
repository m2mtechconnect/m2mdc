/**
 * Animated KPI Strip - Real-time animated KPIs during simulation
 * Shows PUE, GPU Utilization, Cooling Load, Carbon Intensity, Sovereign Compute
 */

import { memo, useMemo, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, Cpu, Wind, Leaf, Shield, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedKPIStripProps {
  kpis: Record<string, number>;
  baselineKpis: Record<string, number>;
  isRunning: boolean;
}

interface KPIConfig {
  id: string;
  label: string;
  unit: string;
  icon: React.ElementType;
  color: string;
  goodDirection: 'up' | 'down';
  format?: (v: number) => string;
}

const kpiConfigs: KPIConfig[] = [
  { 
    id: 'pue', 
    label: 'PUE', 
    unit: '', 
    icon: Zap, 
    color: 'text-warning',
    goodDirection: 'down',
    format: (v) => v.toFixed(2)
  },
  { 
    id: 'gpuUtilization', 
    label: 'GPU Util', 
    unit: '%', 
    icon: Cpu, 
    color: 'text-accent',
    goodDirection: 'up',
    format: (v) => Math.round(v).toString()
  },
  { 
    id: 'coolingLoad', 
    label: 'Cooling', 
    unit: '%', 
    icon: Wind, 
    color: 'text-info',
    goodDirection: 'down',
    format: (v) => Math.round(v).toString()
  },
  { 
    id: 'carbonIntensity', 
    label: 'Carbon', 
    unit: 'g/kWh', 
    icon: Leaf, 
    color: 'text-success',
    goodDirection: 'down',
    format: (v) => Math.round(v).toString()
  },
  { 
    id: 'sovereignty', 
    label: 'Sovereign', 
    unit: '%', 
    icon: Shield, 
    color: 'text-primary',
    goodDirection: 'up',
    format: (v) => Math.round(v).toString()
  },
];

const AnimatedKPICard = memo(function AnimatedKPICard({
  config,
  value,
  baseline,
  isRunning
}: {
  config: KPIConfig;
  value: number;
  baseline: number;
  isRunning: boolean;
}) {
  const [prevValue, setPrevValue] = useState(value);
  const [isChanging, setIsChanging] = useState(false);
  
  const delta = value - baseline;
  const deltaPercent = baseline !== 0 ? (delta / baseline) * 100 : 0;
  const isSignificantChange = Math.abs(deltaPercent) > 5;
  
  const isGood = config.goodDirection === 'up' ? delta > 0 : delta < 0;
  const TrendIcon = delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  
  // Detect value changes for pulse animation
  useEffect(() => {
    if (Math.abs(value - prevValue) > 0.1) {
      setIsChanging(true);
      const timeout = setTimeout(() => setIsChanging(false), 500);
      setPrevValue(value);
      return () => clearTimeout(timeout);
    }
  }, [value, prevValue]);

  const Icon = config.icon;

  return (
    <motion.div
      animate={{
        scale: isChanging && isSignificantChange ? [1, 1.05, 1] : 1,
      }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        'bg-card border-border transition-all duration-300',
        isSignificantChange && isRunning && 'ring-2',
        isSignificantChange && isGood && 'ring-success/30',
        isSignificantChange && !isGood && 'ring-destructive/30'
      )}>
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className={cn('p-1.5 rounded-lg bg-muted/50', config.color)}>
              <Icon className="h-4 w-4" />
            </div>
            {isRunning && delta !== 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Badge 
                  variant="outline" 
                  className={cn(
                    'text-[10px] gap-0.5',
                    isGood ? 'text-success border-success/30' : 'text-destructive border-destructive/30'
                  )}
                >
                  <TrendIcon className="h-2.5 w-2.5" />
                  {deltaPercent > 0 ? '+' : ''}{deltaPercent.toFixed(1)}%
                </Badge>
              </motion.div>
            )}
          </div>
          
          <motion.div
            key={value}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            className="space-y-0.5"
          >
            <span className={cn(
              'text-xl font-bold font-mono',
              isChanging && isSignificantChange && 'animate-pulse'
            )}>
              {config.format ? config.format(value) : value}
              <span className="text-xs text-muted-foreground ml-0.5">{config.unit}</span>
            </span>
            <p className="text-[10px] text-muted-foreground">{config.label}</p>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

export const AnimatedKPIStrip = memo(function AnimatedKPIStrip({
  kpis,
  baselineKpis,
  isRunning
}: AnimatedKPIStripProps) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {kpiConfigs.map((config) => (
        <AnimatedKPICard
          key={config.id}
          config={config}
          value={kpis[config.id] ?? baselineKpis[config.id] ?? 0}
          baseline={baselineKpis[config.id] ?? 0}
          isRunning={isRunning}
        />
      ))}
    </div>
  );
});
