/**
 * DCSimulationTab - Dedicated Simulation Tab with 3D Digital Twin
 * 
 * This is the "war room" for scenario simulation:
 * - 3D Digital Twin front and center with domain overlays
 * - Full scenario engine controls
 * - KPI deltas and baseline vs current comparison
 * - Event timeline and AI recommendations
 * 
 * Uses the same useSimulation hook as Overview so state never drifts.
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  PlayCircle, Pause, RotateCcw, 
  Thermometer, Zap, Wind, Cpu, Shield, Leaf, Network,
  Clock, AlertTriangle, Sparkles, ChevronRight,
  Info, Activity, CheckCircle2, TrendingUp, TrendingDown
} from 'lucide-react';
import { useSimulation } from '@/simulation/useSimulation';
import { useTwinContext } from '@/hooks/useTwinContext';
import { useBlueprint } from '@/hooks/useBlueprint';
import { TwinVisualizationLayout } from '@/components/twin-visualization/TwinVisualizationLayout';
import { showScenarioSelectedToast, useSimulationFeedback } from '@/components/simulation';
import { getKpiValue } from '@/lib/kpiKeyMap';
import { cn } from '@/lib/utils';
import type { DataCentreFacility } from '@/types/dataCenterTwin';
import type { OverlayDomain } from '@/components/twin-visualization/DataCenter3DScene';

interface DCSimulationTabProps {
  facility: DataCentreFacility;
  twinId?: string;
}

// Scenario category badges with colors
const categoryColors: Record<string, string> = {
  thermal: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  power: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  cooling: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
  workload: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  network: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  sovereignty: 'bg-green-500/10 text-green-500 border-green-500/30',
  carbon: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  financial: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
};

// KPI definitions for the comparison panel
const kpiDefinitions = [
  { id: 'pue', label: 'PUE', unit: '', format: (v: number) => v.toFixed(2), invertDelta: true },
  { id: 'gpuUtilization', label: 'GPU Utilization', unit: '%', format: (v: number) => v.toFixed(0) },
  { id: 'thermalStabilityScore', label: 'Thermal Stability', unit: '%', format: (v: number) => v.toFixed(0) },
  { id: 'carbonIntensity', label: 'Carbon Intensity', unit: 'g/kWh', format: (v: number) => v.toFixed(0), invertDelta: true },
  { id: 'sovereignComplianceScore', label: 'Sovereignty', unit: '%', format: (v: number) => v.toFixed(0) },
  { id: 'coolingEfficiencyIndex', label: 'Cooling Efficiency', unit: '%', format: (v: number) => v.toFixed(0) },
];

export function DCSimulationTab({ facility, twinId = 'default' }: DCSimulationTabProps) {
  const { activeTwin, recommendation } = useTwinContext();
  const { blueprint } = useBlueprint(twinId);
  
  // Active overlay for 3D view
  const [activeOverlay, setActiveOverlay] = useState<OverlayDomain>('thermal');
  
  // Use shared simulation hook - single source of truth
  const {
    status,
    currentTime,
    timeScale,
    activeScenarioId,
    events,
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
    blueprintScenarios: blueprint?.simulationScenarios,
    twinId 
  });
  
  const { notifyStatusChange, reset: resetFeedback } = useSimulationFeedback();
  
  // All scenarios combined
  const allScenarios = useMemo(() => {
    const combined = [...presetScenarios, ...blueprintScenarios];
    const uniqueMap = new Map(combined.map(s => [s.id, s]));
    return Array.from(uniqueMap.values());
  }, [presetScenarios, blueprintScenarios]);
  
  // Twin info for header
  const twinName = activeTwin?.name || recommendation?.companyName || facility.name || 'Sovereign AI Data Centre';
  const twinLocation = activeTwin?.city || facility.location.city || 'Montreal';
  
  // Handlers
  const handleSelectScenario = useCallback((scenarioId: string) => {
    const scenario = allScenarios.find(s => s.id === scenarioId);
    if (scenario) {
      showScenarioSelectedToast(scenario.name);
    }
    startScenario(scenarioId);
  }, [allScenarios, startScenario]);
  
  const handlePlay = useCallback(() => {
    if (status === 'paused') {
      resume();
      notifyStatusChange('running', activeScenario?.name);
    } else if (activeScenarioId) {
      startScenario(activeScenarioId);
      notifyStatusChange('running', activeScenario?.name);
    }
  }, [status, activeScenarioId, activeScenario, resume, startScenario, notifyStatusChange]);
  
  const handlePause = useCallback(() => {
    pause();
    notifyStatusChange('paused');
  }, [pause, notifyStatusChange]);
  
  const handleReset = useCallback(() => {
    reset();
    resetFeedback();
  }, [reset, resetFeedback]);
  
  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Calculate KPI delta percentage
  const getKpiDelta = (kpiId: string): number | null => {
    const current = getKpiValue(currentKpis, kpiId);
    const baseline = getKpiValue(baselineKpis, kpiId);
    if (!baseline || baseline === 0) return null;
    return ((current - baseline) / baseline) * 100;
  };
  
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isCompleted = status === 'completed';
  const isActive = isRunning || isPaused || isCompleted;
  
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Scenario Simulation</h2>
              <p className="text-sm text-muted-foreground">
                {twinName} • {twinLocation}
              </p>
            </div>
          </div>
        </div>
        
        {/* Status & Mode Badges */}
        <div className="flex items-center gap-2">
          <Badge 
            variant={isRunning ? 'default' : 'outline'} 
            className={cn(
              'gap-1.5',
              isRunning && 'bg-success text-success-foreground animate-pulse',
              isPaused && 'bg-warning/10 text-warning border-warning/30',
              isCompleted && 'bg-primary'
            )}
          >
            {isRunning ? <Activity className="h-3 w-3" /> : 
             isCompleted ? <CheckCircle2 className="h-3 w-3" /> :
             <PlayCircle className="h-3 w-3" />}
            {isRunning ? 'Running' : isPaused ? 'Paused' : isCompleted ? 'Completed' : 'Ready'}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Simulation Mode
          </Badge>
        </div>
      </div>
      
      {/* Main Layout: 3D Twin + Controls */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left: 3D Digital Twin */}
        <div className="space-y-4">
          {/* Overlay Domain Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground mr-1">Overlay:</span>
            {[
              { id: 'thermal', label: 'Thermal', icon: Thermometer },
              { id: 'power', label: 'Power', icon: Zap },
              { id: 'cooling', label: 'Cooling', icon: Wind },
              { id: 'gpu', label: 'Workload', icon: Cpu },
              { id: 'sovereignty', label: 'Sovereignty', icon: Shield },
              { id: 'carbon', label: 'Carbon', icon: Leaf },
            ].map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={activeOverlay === id ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 gap-1"
                onClick={() => setActiveOverlay(activeOverlay === id ? 'none' : id as OverlayDomain)}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Button>
            ))}
          </div>
          
          {/* 3D Twin Visualization */}
          <Card className={cn(
            'overflow-hidden relative transition-all duration-300',
            isRunning && 'ring-2 ring-success/30 shadow-lg shadow-success/10'
          )}>
            {/* Live Simulation Badge */}
            {isRunning && (
              <div className="absolute top-4 left-4 z-10">
                <Badge className="bg-success text-success-foreground gap-1.5 shadow-lg animate-pulse">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-foreground opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success-foreground" />
                  </span>
                  Live Simulation
                </Badge>
              </div>
            )}
            <TwinVisualizationLayout
              mode="simulation"
              showTimeline
              initialOverlay={activeOverlay}
              className="min-h-[400px]"
            />
          </Card>
          
          {/* KPI Baseline vs Current Comparison */}
          <Card className={cn(
            'transition-all duration-300',
            isRunning && 'ring-1 ring-primary/20 shadow-lg shadow-primary/5'
          )}>
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className={cn(
                  'h-4 w-4 transition-colors duration-300',
                  isRunning ? 'text-success animate-pulse' : 'text-primary'
                )} />
                KPI Impact Analysis
                {isActive && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      'ml-2 text-xs transition-all duration-300',
                      isRunning && 'bg-success/10 text-success border-success/30 animate-pulse'
                    )}
                  >
                    {Math.round(progress)}% Complete
                  </Badge>
                )}
                {isRunning && (
                  <Badge variant="outline" className="ml-auto text-[10px] bg-primary/10 text-primary animate-pulse">
                    <Activity className="h-3 w-3 mr-1" />
                    LIVE
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {kpiDefinitions.map(kpi => {
                  const current = getKpiValue(currentKpis, kpi.id);
                  const baseline = getKpiValue(baselineKpis, kpi.id);
                  const delta = getKpiDelta(kpi.id);
                  const isImproved = delta !== null && (kpi.invertDelta ? delta < 0 : delta > 0);
                  const hasDelta = delta !== null && Math.abs(delta) >= 0.1;
                  
                  return (
                    <div 
                      key={kpi.id} 
                      className={cn(
                        'text-center space-y-1 p-2 rounded-lg transition-all duration-300',
                        isRunning && 'bg-accent/30',
                        isRunning && hasDelta && isImproved && 'bg-success/10 ring-1 ring-success/20',
                        isRunning && hasDelta && !isImproved && 'bg-destructive/10 ring-1 ring-destructive/20'
                      )}
                    >
                      <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
                      <p className={cn(
                        'text-lg font-bold tabular-nums transition-transform duration-300',
                        isRunning && 'scale-105'
                      )}>
                        {kpi.format(current || baseline)}
                        <span className="text-xs text-muted-foreground ml-0.5">{kpi.unit}</span>
                      </p>
                      {hasDelta && (
                        <p className={cn(
                          'text-xs flex items-center justify-center gap-0.5 transition-all duration-300',
                          isImproved ? 'text-success' : 'text-destructive',
                          isRunning && 'animate-pulse font-medium'
                        )}>
                          {isImproved ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                        </p>
                      )}
                      {!hasDelta && isRunning && (
                        <p className="text-xs text-muted-foreground animate-pulse">—</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right: Scenario Controls & Timeline */}
        <div className="space-y-4">
          {/* Simulation Controls */}
          <Card>
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-medium">Simulation Controls</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Play/Pause/Reset Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePlay}
                  disabled={isRunning || !activeScenarioId}
                  className="gap-2 flex-1"
                >
                  <PlayCircle className="h-4 w-4" />
                  {isPaused ? 'Resume' : 'Run'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePause}
                  disabled={!isRunning}
                  className="gap-2"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleReset}
                  disabled={status === 'idle'}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Progress Bar */}
              {isActive && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className={cn(isRunning && 'text-primary font-medium')}>{formatTime(elapsedTime)}</span>
                    <span>-{formatTime(remainingTime)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden relative">
                    {/* Animated background shimmer when running */}
                    {isRunning && (
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"
                        style={{ backgroundSize: '200% 100%' }}
                      />
                    )}
                    <div 
                      className={cn(
                        'h-full rounded-full transition-all duration-300 relative',
                        isRunning ? 'bg-success' : 'bg-primary'
                      )}
                      style={{ width: `${progress}%` }}
                    >
                      {/* Glow effect when running */}
                      {isRunning && (
                        <div className="absolute inset-0 rounded-full bg-success/50 blur-sm animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Speed Control */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Speed:</span>
                {[1, 2, 5, 10].map(speed => (
                  <Button
                    key={speed}
                    variant={timeScale === speed ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setTimeScale(speed as 1 | 2 | 5 | 10)}
                  >
                    {speed}x
                  </Button>
                ))}
              </div>
              
              {/* Active Scenario Display */}
              {activeScenario && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={categoryColors[activeScenario.category] || 'border-muted-foreground/30'}
                    >
                      {activeScenario.category}
                    </Badge>
                    <span className="text-sm font-medium truncate flex-1">{activeScenario.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {activeScenario.description}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.floor(activeScenario.durationSeconds / 60)}m
                    </span>
                    <Badge variant="outline" className="text-[10px] h-5">
                      {activeScenario.severity}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Scenario Picker */}
          <Card>
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Select Scenario</span>
                <Badge variant="secondary" className="text-[10px]">
                  {allScenarios.length} available
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[260px]">
                <div className="p-2 space-y-1">
                  {allScenarios.map(scenario => (
                    <button
                      key={scenario.id}
                      onClick={() => handleSelectScenario(scenario.id)}
                      disabled={isRunning}
                      className={cn(
                        'w-full text-left p-3 rounded-lg transition-colors',
                        'hover:bg-accent/50 disabled:opacity-50',
                        activeScenarioId === scenario.id && 'bg-primary/10 border border-primary/30'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{scenario.name}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'text-[10px] h-5',
                            categoryColors[scenario.category] || 'border-muted-foreground/30'
                          )}
                        >
                          {scenario.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {Math.floor(scenario.durationSeconds / 60)}m
                        </span>
                        <Badge variant="outline" className="text-[10px] h-5">
                          {scenario.severity}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          
          {/* Event Timeline */}
          <Card>
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Simulation Events
                {events.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {events.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[180px]">
                {events.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No events yet</p>
                    <p className="text-xs">Run a scenario to see events</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {events.slice(-10).reverse().map((event, idx) => {
                      const severityClass = 
                        event.severity === 'critical' ? 'bg-destructive/5 border-destructive/30' :
                        event.severity === 'high' ? 'bg-warning/5 border-warning/30' :
                        'bg-info/5 border-info/30';
                      
                      const isRecent = idx === 0 && isRunning;
                      
                      return (
                        <div
                          key={event.id || idx}
                          className={cn(
                            'p-2 rounded-lg border text-sm transition-all duration-300', 
                            severityClass,
                            isRecent && 'ring-1 ring-primary/30 scale-[1.02] shadow-sm animate-fade-in'
                          )}
                        >
                        <div className="flex items-start justify-between gap-2">
                          <span className={cn(
                            'font-medium truncate',
                            isRecent && 'text-primary'
                          )}>{event.title}</span>
                          <span className={cn(
                            'text-xs shrink-0',
                            isRecent ? 'text-primary font-medium' : 'text-muted-foreground'
                          )}>
                            {formatTime(event.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {event.description}
                        </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
