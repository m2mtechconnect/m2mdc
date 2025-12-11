/**
 * What-If Controls Panel
 * Interactive sliders for real-time simulation parameter adjustment
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  SlidersHorizontal, 
  Cpu, 
  Thermometer, 
  Leaf, 
  Server,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Minus,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { WhatIfParameter, KPISnapshot } from '@/simulation/types';
import { DEFAULT_KPI_CONFIGS } from '@/engines/kpi/KPIOverlayEngine';

interface WhatIfControlsProps {
  onParameterChange?: (parameterId: string, value: number) => void;
  onApplyScenario?: (parameters: Record<string, number>) => void;
  onReset?: () => void;
  baselineKpis?: Record<string, number>;
  className?: string;
}

// Default What-If Parameters
const DEFAULT_PARAMETERS: WhatIfParameter[] = [
  {
    id: 'gpuLoad',
    name: 'GPU Load',
    description: 'Overall GPU compute utilization',
    currentValue: 75,
    min: 0,
    max: 100,
    step: 5,
    unit: '%',
    affectedKpis: ['gpuUtilization', 'thermalStabilityScore', 'pue'],
    impactFunction: 'linear',
  },
  {
    id: 'coolingEfficiency',
    name: 'Cooling Efficiency',
    description: 'CRAH/CRAC cooling system efficiency',
    currentValue: 85,
    min: 50,
    max: 100,
    step: 5,
    unit: '%',
    affectedKpis: ['coolingEfficiencyIndex', 'thermalStabilityScore', 'pue'],
    impactFunction: 'linear',
  },
  {
    id: 'renewableEnergy',
    name: 'Renewable Energy',
    description: 'Percentage of power from renewable sources',
    currentValue: 80,
    min: 0,
    max: 100,
    step: 5,
    unit: '%',
    affectedKpis: ['emissionsVsTarget'],
    impactFunction: 'linear',
  },
  {
    id: 'rackDensity',
    name: 'Rack Density',
    description: 'Average power density per rack',
    currentValue: 15,
    min: 5,
    max: 40,
    step: 1,
    unit: 'kW',
    affectedKpis: ['thermalStabilityScore', 'coolingEfficiencyIndex', 'pue'],
    impactFunction: 'exponential',
  },
];

const PARAMETER_ICONS: Record<string, React.ElementType> = {
  gpuLoad: Cpu,
  coolingEfficiency: Thermometer,
  renewableEnergy: Leaf,
  rackDensity: Server,
};

export function WhatIfControls({
  onParameterChange,
  onApplyScenario,
  onReset,
  baselineKpis,
  className,
}: WhatIfControlsProps) {
  const [parameters, setParameters] = useState<Record<string, number>>(
    DEFAULT_PARAMETERS.reduce((acc, p) => ({ ...acc, [p.id]: p.currentValue }), {})
  );
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Calculate predicted KPIs based on parameter changes
  const predictedKpis = useMemo(() => {
    const predictions: Record<string, { value: number; delta: number; isImprovement: boolean }> = {};
    
    const kpiIds = Object.keys(DEFAULT_KPI_CONFIGS);
    for (const kpiId of kpiIds) {
      const config = DEFAULT_KPI_CONFIGS[kpiId];
      const baseline = baselineKpis?.[kpiId] ?? config.target;
      
      // Simple prediction model based on affected parameters
      let impact = 0;
      
      if (kpiId === 'gpuUtilization') {
        impact = (parameters.gpuLoad - 75) * 0.8;
      } else if (kpiId === 'thermalStabilityScore') {
        impact = (parameters.coolingEfficiency - 85) * 0.5 - (parameters.gpuLoad - 75) * 0.3 - (parameters.rackDensity - 15) * 0.8;
      } else if (kpiId === 'pue') {
        impact = -(parameters.coolingEfficiency - 85) * 0.01 + (parameters.gpuLoad - 75) * 0.005 + (parameters.rackDensity - 15) * 0.01;
      } else if (kpiId === 'coolingEfficiencyIndex') {
        impact = (parameters.coolingEfficiency - 85) * 0.8 - (parameters.rackDensity - 15) * 0.5;
      } else if (kpiId === 'emissionsVsTarget') {
        impact = -(parameters.renewableEnergy - 80) * 0.8;
      }

      const predictedValue = baseline + impact;
      const delta = predictedValue - baseline;
      const isImprovement = config.lowerIsBetter ? delta < 0 : delta > 0;

      predictions[kpiId] = {
        value: predictedValue,
        delta,
        isImprovement,
      };
    }

    return predictions;
  }, [parameters, baselineKpis]);

  const handleParameterChange = useCallback((id: string, value: number) => {
    setParameters(prev => ({ ...prev, [id]: value }));
    setHasChanges(true);
    
    if (autoUpdate) {
      onParameterChange?.(id, value);
    }
  }, [autoUpdate, onParameterChange]);

  const handleReset = useCallback(() => {
    setParameters(DEFAULT_PARAMETERS.reduce((acc, p) => ({ ...acc, [p.id]: p.currentValue }), {}));
    setHasChanges(false);
    onReset?.();
  }, [onReset]);

  const handleApply = useCallback(() => {
    onApplyScenario?.(parameters);
    setHasChanges(false);
  }, [parameters, onApplyScenario]);

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            What-If Controls
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Live Update</span>
              <Switch 
                checked={autoUpdate} 
                onCheckedChange={setAutoUpdate}
                className="scale-75"
              />
            </div>
            {hasChanges && (
              <Badge variant="outline" className="text-xs text-warning border-warning/30">
                Unsaved
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <ScrollArea className="h-[280px] pr-4">
          <div className="space-y-6">
            {DEFAULT_PARAMETERS.map((param, i) => {
              const Icon = PARAMETER_ICONS[param.id] || SlidersHorizontal;
              const value = parameters[param.id];
              const isDefault = value === param.currentValue;

              return (
                <motion.div
                  key={param.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-muted">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="text-sm font-medium">{param.name}</span>
                        <p className="text-[10px] text-muted-foreground">{param.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={value}
                          initial={{ scale: 1.2, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={cn(
                            "text-lg font-bold font-mono tabular-nums",
                            !isDefault && "text-primary"
                          )}
                        >
                          {value}{param.unit}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  </div>

                  <Slider
                    value={[value]}
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    onValueChange={([v]) => handleParameterChange(param.id, v)}
                    className={cn(!isDefault && "[&_[role=slider]]:bg-primary")}
                  />

                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{param.min}{param.unit}</span>
                    <span>Default: {param.currentValue}{param.unit}</span>
                    <span>{param.max}{param.unit}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>

        <Separator />

        {/* Predicted KPI Impact */}
        <div>
          <h4 className="text-sm font-medium mb-3">Predicted Impact</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(predictedKpis).slice(0, 6).map(([kpiId, { value, delta, isImprovement }]) => {
              const config = DEFAULT_KPI_CONFIGS[kpiId];
              const isNeutral = Math.abs(delta) < 0.5;
              
              const TrendIcon = isNeutral ? Minus : isImprovement ? TrendingUp : TrendingDown;
              const trendColor = isNeutral 
                ? 'text-muted-foreground' 
                : isImprovement 
                  ? 'text-success' 
                  : 'text-destructive';

              return (
                <div 
                  key={kpiId}
                  className="p-2 rounded bg-muted/50 border border-border"
                >
                  <span className="text-[10px] text-muted-foreground block truncate">
                    {config?.name}
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-sm">
                      {value.toFixed(1)}{config?.unit}
                    </span>
                    {!isNeutral && (
                      <Badge variant="outline" className={cn("text-[10px] h-4 gap-0.5", trendColor)}>
                        <TrendIcon className="h-2.5 w-2.5" />
                        {Math.abs(delta).toFixed(1)}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="flex-1 gap-2"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={!hasChanges || autoUpdate}
            className="flex-1 gap-2"
          >
            <Play className="h-3.5 w-3.5" />
            Apply Scenario
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
