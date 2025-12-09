/**
 * Simulation Preview Modal
 * Quick simulation preview for Blueprint and other contexts
 */

import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, Activity, ArrowRight, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { useSimulation } from '@/simulation/useSimulation';
import { DCKPIDeltas, defaultKPIs } from './DCKPIDeltas';
import { PRESET_SCENARIOS } from '@/simulation/scenarioRegistry';

interface SimulationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseInDeployment?: () => void;
  title?: string;
}

export function SimulationPreviewModal({ 
  isOpen, 
  onClose, 
  onUseInDeployment,
  title = 'Simulation Preview' 
}: SimulationPreviewModalProps) {
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [previewComplete, setPreviewComplete] = useState(false);
  
  const {
    status,
    currentKpis,
    baselineKpis,
    startScenario,
    pause,
    reset,
    progress,
    elapsedTime,
    activeScenario,
  } = useSimulation();
  
  const isRunning = status === 'running';
  
  const handleRunPreview = useCallback(() => {
    if (selectedScenario) {
      setPreviewComplete(false);
      startScenario(selectedScenario);
      
      // Auto-complete after preview duration
      setTimeout(() => {
        pause();
        setPreviewComplete(true);
      }, 15000); // 15 second preview
    }
  }, [selectedScenario, startScenario, pause]);
  
  const handleReset = useCallback(() => {
    reset();
    setPreviewComplete(false);
  }, [reset]);
  
  const kpiDeltas = defaultKPIs.slice(0, 4).map(kpiDef => ({
    ...kpiDef,
    value: currentKpis[kpiDef.id] ?? baselineKpis[kpiDef.id] ?? 0,
    baseline: baselineKpis[kpiDef.id] ?? 0,
  }));

  // Calculate impact summary
  const impactItems = kpiDeltas.filter(kpi => {
    const delta = kpi.value - kpi.baseline;
    return Math.abs(delta) > 0.1;
  }).map(kpi => {
    const delta = kpi.value - kpi.baseline;
    // For most DC KPIs, lower is better (PUE, temps), except utilization
    const invertDelta = kpi.invertDelta ?? false;
    return {
      label: kpi.label,
      delta,
      isPositive: invertDelta ? delta < 0 : delta > 0,
    };
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Run a quick simulation preview to see potential KPI impacts
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Scenario Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Scenario</label>
            <Select value={selectedScenario} onValueChange={setSelectedScenario}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a scenario to preview..." />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                {PRESET_SCENARIOS.map((scenario) => (
                  <SelectItem key={scenario.id} value={scenario.id}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {scenario.category}
                      </Badge>
                      <span>{scenario.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Preview Controls */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRunPreview}
              disabled={!selectedScenario || isRunning}
              className="gap-2"
            >
              <PlayCircle className="h-4 w-4" />
              Run Preview (15s)
            </Button>
            {(isRunning || previewComplete) && (
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
            )}
            {isRunning && (
              <Badge variant="outline" className="gap-1 animate-pulse">
                <Clock className="h-3 w-3" />
                {Math.round(progress)}%
              </Badge>
            )}
          </div>
          
          {/* KPI Deltas */}
          {(isRunning || previewComplete) && (
            <div className="space-y-3">
              <div className="text-sm font-medium">KPI Impacts</div>
              <DCKPIDeltas 
                kpis={kpiDeltas} 
                isRunning={isRunning} 
                compact 
              />
            </div>
          )}
          
          {/* Impact Summary */}
          {previewComplete && impactItems.length > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
              <div className="text-sm font-medium">Impact Summary</div>
              <div className="space-y-1">
                {impactItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <div className={`flex items-center gap-1 ${
                      item.isPositive ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {item.isPositive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>{item.delta > 0 ? '+' : ''}{item.delta.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Actions */}
          {previewComplete && onUseInDeployment && (
            <Button 
              className="w-full gap-2" 
              onClick={onUseInDeployment}
            >
              Use in Deployment Planner
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
