/**
 * ScenarioSimulationPanel - Shared Scenario Simulation panel
 * Used in both:
 *  - DC Twin Simulation tab (full screen)
 *  - Dashboard first tab (compact view)
 *
 * Both must use the same hooks, same state, and same demo vs real twin data,
 * so numbers and status never drift between views.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  PlayCircle, Pause, RotateCcw, 
  Eye, Sparkles, FileText, ExternalLink,
  Clock, Info
} from 'lucide-react';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { useTwinContext } from '@/hooks/useTwinContext';
import { useSimulation } from '@/simulation/useSimulation';
import { useBlueprint } from '@/hooks/useBlueprint';
import { useSimulationSnapshotStore } from '@/stores/simulationSnapshotStore';
import { 
  SimulationStatusIndicator, 
  useSimulationFeedback, 
  showScenarioSelectedToast 
} from '@/components/simulation';
import { EnhancedSimulationControls } from './EnhancedSimulationControls';
import { DCKPIDeltas, defaultKPIs } from './DCKPIDeltas';
import { CoPilotModeHeader } from '@/components/copilot';
import { cn } from '@/lib/utils';

export type ScenarioSimulationPanelProps = {
  /** Layout mode - 'full' for simulation tab, 'compact' for dashboard */
  layout?: 'full' | 'compact';
  /** Additional CSS classes */
  className?: string;
  /** Show header section with twin name and badges */
  showHeader?: boolean;
  /** Show simulation controls (play/pause/reset) */
  showControls?: boolean;
  /** Show event timeline */
  showTimeline?: boolean;
  /** Twin ID for blueprint loading */
  twinId?: string;
  /** Callback when user wants to open full simulation */
  onOpenFullSimulation?: () => void;
};

// Status badge component for simulation state
function SimulationStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'outline' | 'default' | 'secondary'; className: string }> = {
    idle: { label: 'Ready', variant: 'outline', className: 'border-muted-foreground/30' },
    running: { label: 'Running', variant: 'default', className: 'bg-success text-success-foreground animate-pulse' },
    paused: { label: 'Paused', variant: 'secondary', className: 'bg-warning/10 text-warning border-warning/30' },
    completed: { label: 'Completed', variant: 'default', className: 'bg-primary' },
    error: { label: 'Error', variant: 'default', className: 'bg-destructive' },
  };
  
  const { label, variant, className } = config[status] || config.idle;
  
  return (
    <Badge variant={variant} className={cn('gap-1.5', className)}>
      <PlayCircle className="h-3 w-3" />
      {label}
    </Badge>
  );
}

export function ScenarioSimulationPanel({
  layout = 'full',
  className,
  showHeader = true,
  showControls = true,
  showTimeline = true,
  twinId = 'default',
  onOpenFullSimulation,
}: ScenarioSimulationPanelProps) {
  const navigate = useNavigate();
  const isCompact = layout === 'compact';
  
  // CRITICAL: Use useTwinContext() to prioritize active twin over builder store
  const { activeTwin, isPreviewMode, recommendation } = useTwinContext();
  const builderStore = useDCTwinBuilderStore();
  
  // Priority: activeTwin (header) → preview recommendation → builder store fallback
  const overview = useMemo(() => ({
    ...builderStore.overview,
    twinName: activeTwin?.name || recommendation?.companyName || builderStore.overview.twinName || 'Sovereign AI Data Centre',
    facilityLocation: activeTwin?.city || recommendation?.regions?.[0] || builderStore.overview.facilityLocation || 'Montreal',
    regionCode: activeTwin?.region_code || builderStore.overview.regionCode || 'ca-central-1',
    capacityKw: activeTwin?.capacity_kw || builderStore.overview.capacityKw || 10000000,
    renewablePercent: activeTwin?.renewable_target_pct || recommendation?.kpiTargets?.renewableShareTargetPct || builderStore.overview.renewablePercent || 95,
  }), [activeTwin, recommendation, builderStore.overview]);
  
  // Get Blueprint for scenarios
  const { blueprint } = useBlueprint(twinId);
  
  // Snapshot store
  const { captureSnapshot, currentSnapshot } = useSimulationSnapshotStore();
  
  // Use shared simulation hook - this is the single source of truth
  const {
    status,
    currentTime,
    timeScale,
    activeScenarioId,
    events,
    kpiSnapshots,
    currentKpis,
    baselineKpis,
    presetScenarios,
    blueprintScenarios,
    activeScenario,
    startScenario,
    pause,
    resume,
    reset,
    setTimeScale,
    progress,
    remainingTime,
    elapsedTime,
  } = useSimulation({ 
    blueprintScenarios: blueprint?.simulationScenarios 
  });
  
  // Feedback notifications
  const { notifyStatusChange, reset: resetFeedback } = useSimulationFeedback();
  
  // Build KPI deltas from current state
  // Map alternate KPI IDs to their canonical forms for display
  const kpiDeltas = useMemo(() => {
    // Debug: Log the raw KPI values to trace the issue
    if (status === 'running') {
      console.log('[ScenarioSimulationPanel] KPI Debug:', {
        status,
        currentKpis: { ...currentKpis },
        baselineKpis: { ...baselineKpis },
        effectivePue: currentKpis.effectivePue,
        pue: currentKpis.pue,
      });
    }
    
    // Use the current values directly - the simulation engine should have updated them
    // We merge alternate keys to handle both naming conventions
    const getValue = (keys: string[]) => {
      for (const key of keys) {
        if (currentKpis[key] !== undefined) return currentKpis[key];
      }
      for (const key of keys) {
        if (baselineKpis[key] !== undefined) return baselineKpis[key];
      }
      return 0;
    };
    
    const getBaseline = (keys: string[]) => {
      for (const key of keys) {
        if (baselineKpis[key] !== undefined) return baselineKpis[key];
      }
      return 0;
    };
    
    // Build KPIs with mapped values
    return defaultKPIs.map(kpiDef => {
      let value: number;
      let baseline: number;
      
      switch (kpiDef.id) {
        case 'pue':
          value = getValue(['pue', 'effectivePue']);
          baseline = getBaseline(['pue', 'effectivePue']);
          break;
        case 'gpuUtilization':
          value = getValue(['gpuUtilization', 'avgGpuUtilization']);
          baseline = getBaseline(['gpuUtilization', 'avgGpuUtilization']);
          break;
        case 'thermalStabilityScore':
          value = getValue(['thermalStabilityScore']);
          baseline = getBaseline(['thermalStabilityScore']);
          break;
        default:
          value = currentKpis[kpiDef.id] ?? baselineKpis[kpiDef.id] ?? 0;
          baseline = baselineKpis[kpiDef.id] ?? 0;
      }
      
      return {
        ...kpiDef,
        value,
        baseline,
      };
    });
  }, [currentKpis, baselineKpis, status]);
  
  // How many KPIs to show based on layout
  const displayKpis = isCompact ? kpiDeltas.slice(0, 3) : kpiDeltas.slice(0, 6);
  
  // Handlers
  const handleSelectScenario = useCallback((scenarioId: string) => {
    if (status === 'running') {
      pause();
    }
    
    // Capture blueprint snapshot when scenario is selected
    if (blueprint) {
      const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      captureSnapshot(blueprint, runId, {
        activeScenarioIds: [scenarioId],
        activeAgentIds: blueprint.agents.map(a => a.id),
        activeKpiIds: blueprint.kpis.slice(0, 12).map(k => k.id),
      });
    }
    
    const scenario = [...presetScenarios, ...blueprintScenarios].find(s => s.id === scenarioId);
    if (scenario) {
      showScenarioSelectedToast(scenario.name);
    }
    
    startScenario(scenarioId);
  }, [status, pause, blueprint, captureSnapshot, presetScenarios, blueprintScenarios, startScenario]);
  
  const handlePlay = useCallback(() => {
    if (activeScenarioId) {
      notifyStatusChange('running', activeScenario?.name);
      startScenario(activeScenarioId);
    }
  }, [activeScenarioId, activeScenario, notifyStatusChange, startScenario]);
  
  const handlePause = useCallback(() => {
    pause();
    notifyStatusChange('paused');
  }, [pause, notifyStatusChange]);
  
  const handleReset = useCallback(() => {
    reset();
    resetFeedback();
  }, [reset, resetFeedback]);
  
  const handleOpenBlueprint = useCallback(() => {
    navigate(`/blueprint/${twinId}`);
  }, [navigate, twinId]);
  
  // Format display values
  const displayCapacity = overview.capacityKw >= 1000000 
    ? `${(overview.capacityKw / 1000000).toLocaleString()}M kW`
    : `${overview.capacityKw.toLocaleString()} kW`;
  
  return (
    <Card className={cn(
      'bg-gradient-to-br from-primary/5 via-background to-background border-primary/20',
      isCompact ? 'p-4' : 'p-6',
      className
    )}>
      <div className={cn('space-y-4', isCompact && 'space-y-3')}>
        {/* Header Section */}
        {showHeader && (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              {/* Icon */}
              <div className={cn(
                'rounded-full bg-primary/10 flex items-center justify-center shrink-0',
                isCompact ? 'p-2' : 'p-3'
              )}>
                <PlayCircle className={cn(
                  'text-primary',
                  isCompact ? 'h-5 w-5' : 'h-6 w-6'
                )} />
              </div>
              
              {/* Title & Location */}
              <div className="min-w-0 flex-1">
                <h3 className={cn(
                  'font-semibold tracking-tight truncate',
                  isCompact ? 'text-base' : 'text-xl'
                )}>
                  Scenario Simulation
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {overview.twinName}
                </p>
                
                {/* Mode Badges */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="default" className="bg-primary/10 text-primary border-primary/30 gap-1 shrink-0">
                    <Sparkles className="h-3 w-3" />
                    Simulation Mode
                  </Badge>
                  <Badge variant="outline" className="gap-1 shrink-0">
                    <Eye className="h-3 w-3" />
                    Design Snapshot
                  </Badge>
                  {!isCompact && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Running simulations against your design blueprint</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right side: Status + Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <SimulationStatusBadge status={status} />
              
              {!isCompact && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => console.log('Run Analyst')}
                    className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Run Analyst
                  </Button>
                  <CoPilotModeHeader mode="simulation" />
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Assistant
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Facility Info Row */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
          <span className="font-medium">{overview.facilityLocation}</span>
          <span>•</span>
          <span>{overview.renewablePercent}% Renewable</span>
          <span>•</span>
          <span className="truncate">{displayCapacity}</span>
        </div>
        
        {/* Design Snapshot Info */}
        {!isCompact && currentSnapshot && (
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border border-border">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Design Snapshot</p>
              <p className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                v1.0
                <span className="text-muted-foreground">•</span>
                <Clock className="h-3.5 w-3.5" />
                {new Date().toLocaleDateString()}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenBlueprint}
              className="ml-auto gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Blueprint Designer
            </Button>
          </div>
        )}
        
        {/* Simulation Controls */}
        {showControls && (
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              size={isCompact ? 'sm' : 'default'}
              onClick={handlePlay}
              disabled={status === 'running' || !activeScenarioId}
              className="gap-2"
            >
              <PlayCircle className="h-4 w-4" />
              {status === 'paused' ? 'Resume' : 'Run Simulation'}
            </Button>
            <Button
              variant="outline"
              size={isCompact ? 'sm' : 'default'}
              onClick={handlePause}
              disabled={status !== 'running'}
              className="gap-2"
            >
              <Pause className="h-4 w-4" />
              Pause
            </Button>
            <Button
              variant="ghost"
              size={isCompact ? 'sm' : 'default'}
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            
            {/* Progress indicator when running */}
            {status === 'running' && (
              <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="tabular-nums">{Math.round(progress)}%</span>
              </div>
            )}
            
            {/* Expand to full view button in compact mode */}
            {isCompact && onOpenFullSimulation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenFullSimulation}
                className="ml-auto gap-1.5 text-primary"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Full View
              </Button>
            )}
          </div>
        )}
        
        {/* KPI Strip */}
        <div className={cn(
          'grid gap-3',
          isCompact ? 'grid-cols-3' : 'grid-cols-3 md:grid-cols-6'
        )}>
        {displayKpis.map((kpi) => (
            <Card key={kpi.id} className="bg-card/50 border-border overflow-hidden">
              <CardContent className="p-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground truncate" title={kpi.label}>
                    {kpi.label}
                  </p>
                  <p className="text-lg font-bold tabular-nums truncate">
                    {kpi.format 
                      ? kpi.format(kpi.value) 
                      : typeof kpi.value === 'number' 
                        ? kpi.value.toFixed(1) 
                        : kpi.value}
                    <span className="text-xs text-muted-foreground ml-1">{kpi.unit}</span>
                  </p>
                  {kpi.baseline !== undefined && kpi.baseline !== 0 && (
                    <p className={cn(
                      'text-xs',
                      kpi.invertDelta
                        ? (kpi.value > kpi.baseline ? 'text-destructive' : 'text-success')
                        : (kpi.value > kpi.baseline ? 'text-success' : 'text-destructive')
                    )}>
                      {kpi.value > kpi.baseline ? '+' : ''}
                      {(((kpi.value - kpi.baseline) / kpi.baseline) * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Scenario Selector - Always show when no active scenario */}
        {!activeScenarioId && (
          <div className="pt-2">
            <p className="text-sm text-muted-foreground mb-3">
              Select a scenario to simulate:
            </p>
            <div className={cn(
              'grid gap-2',
              isCompact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'
            )}>
              {[...presetScenarios, ...blueprintScenarios].slice(0, isCompact ? 4 : 8).map((scenario) => (
                <Button
                  key={scenario.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectScenario(scenario.id)}
                  className="justify-start truncate"
                >
                  <span className="truncate">{scenario.name}</span>
                </Button>
              ))}
            </div>
            {[...presetScenarios, ...blueprintScenarios].length > (isCompact ? 4 : 8) && (
              <p className="text-xs text-muted-foreground mt-2">
                +{[...presetScenarios, ...blueprintScenarios].length - (isCompact ? 4 : 8)} more scenarios available
              </p>
            )}
          </div>
        )}
        
        {/* Active Scenario Info */}
        {activeScenario && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
            <Badge variant="secondary" className="shrink-0">
              {activeScenario.category}
            </Badge>
            <span className="text-sm font-medium truncate">{activeScenario.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {Math.floor(activeScenario.durationSeconds / 60)}m
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
