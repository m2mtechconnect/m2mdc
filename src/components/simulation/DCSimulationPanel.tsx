/**
 * DC Simulation Panel Component
 * Main simulation interface combining all simulation components
 * Uses Studio design system tokens
 * Now wired to Blueprint for scenarios
 * Integrated with Blueprint Snapshot system for simulation traceability
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity, Clock, Sparkles, BarChart3, Grid3X3, FileText, Info } from 'lucide-react';
import { useSimulation } from '@/simulation/useSimulation';
import { useBlueprint } from '@/hooks/useBlueprint';
import { useSimulationSnapshotStore } from '@/stores/simulationSnapshotStore';
import { DCScenarioSelector } from './DCScenarioSelector';
import { EnhancedSimulationControls } from './EnhancedSimulationControls';
import { DCEventTimeline } from './DCEventTimeline';
import { DCKPIDeltas, defaultKPIs } from './DCKPIDeltas';
import { CustomScenarioBuilder } from './CustomScenarioBuilder';
import { SimulationResultPanel } from './SimulationResultPanel';
import { SimulationBlueprintSnapshotPanel } from './SimulationBlueprintSnapshotPanel';
import { AnimatedKPIChartGrid } from './AnimatedKPIChart';
import { AnimatedRackHeatmap } from './AnimatedRackHeatmap';
import { ScenarioContextSidebar } from './ScenarioContextSidebar';
import { createCustomScenario } from '@/simulation/customScenarioBuilder';
import { generateSimulationResult, generateRackMetrics } from '@/simulation/generateSimulationResult';
import { DcToolsRow } from '@/components/dc-tools';
import type { CustomScenarioConfig, SimulationResultSummary, RackMetrics } from '@/simulation/types';
import { AnimatePresence, motion } from 'framer-motion';

interface DCSimulationPanelProps {
  compact?: boolean;
  twinId?: string;
}

// Generate base rack data
function generateBaseRacks(count: number = 20): RackMetrics[] {
  return Array.from({ length: count }, (_, i) => ({
    rackId: `Rack-${String(i + 1).padStart(2, '0')}`,
    tempC: 22 + Math.random() * 6,
    powerKw: 8 + Math.random() * 4,
    gpuUtilPct: 60 + Math.random() * 30,
    alertLevel: 'normal' as const,
  }));
}

export function DCSimulationPanel({ compact = false, twinId = 'default' }: DCSimulationPanelProps) {
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [activeTab, setActiveTab] = useState<'scenarios' | 'timeline' | 'kpis' | 'heatmap'>('scenarios');
  const [simulationResult, setSimulationResult] = useState<SimulationResultSummary | null>(null);
  const [baseRacks] = useState<RackMetrics[]>(() => generateBaseRacks(20));
  const [liveRackMetrics, setLiveRackMetrics] = useState<RackMetrics[]>(baseRacks);
  const runIdRef = useRef<string>('');
  
  // Get Blueprint scenarios
  const { blueprint } = useBlueprint(twinId);
  
  // Snapshot store for Blueprint Snapshot feature
  const { 
    captureSnapshot, 
    clearCurrentSnapshot, 
    setSnapshotPanelOpen,
    currentSnapshot 
  } = useSimulationSnapshotStore();
  
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
    customScenarios,
    allScenarios,
    activeScenario,
    startScenario,
    pause,
    resume,
    reset,
    setTimeScale,
    addCustomScenario,
    progress,
    remainingTime,
    elapsedTime,
  } = useSimulation({ 
    blueprintScenarios: blueprint?.simulationScenarios 
  });
  
  // Update rack metrics during simulation
  useEffect(() => {
    if (status === 'running') {
      const updatedRacks = generateRackMetrics(baseRacks, events, currentTime);
      setLiveRackMetrics(updatedRacks);
    } else if (status === 'idle') {
      setLiveRackMetrics(baseRacks);
    }
  }, [status, events, currentTime, baseRacks]);
  
  // Generate result when simulation completes
  useEffect(() => {
    if (status === 'completed' && activeScenario) {
      const result = generateSimulationResult(
        activeScenario,
        events,
        baselineKpis,
        currentKpis,
        elapsedTime
      );
      setSimulationResult(result);
    } else if (status === 'idle' || status === 'running') {
      setSimulationResult(null);
    }
  }, [status, activeScenario, events, baselineKpis, currentKpis, elapsedTime]);
  
  // Build KPI deltas from current state
  const kpiDeltas = useMemo(() => {
    return defaultKPIs.map(kpiDef => ({
      ...kpiDef,
      value: currentKpis[kpiDef.id] ?? baselineKpis[kpiDef.id] ?? 0,
      baseline: baselineKpis[kpiDef.id] ?? 0,
    }));
  }, [currentKpis, baselineKpis]);
  
  const handleSelectScenario = useCallback((scenarioId: string) => {
    if (status === 'running') {
      pause();
    }
    setSimulationResult(null);
    
    // Generate a unique run ID and capture blueprint snapshot
    if (blueprint) {
      const newRunId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      runIdRef.current = newRunId;
      captureSnapshot(blueprint, newRunId, {
        activeScenarioIds: [scenarioId],
        // Include all agents and KPIs for now; could be filtered per scenario
        activeAgentIds: blueprint.agents.map(a => a.id),
        activeKpiIds: blueprint.kpis.slice(0, 12).map(k => k.id),
      });
    }
    
    startScenario(scenarioId);
  }, [status, pause, startScenario, blueprint, captureSnapshot]);
  
  const handlePlay = useCallback(() => {
    if (activeScenarioId) {
      startScenario(activeScenarioId);
    }
  }, [activeScenarioId, startScenario]);
  
  const handleReset = useCallback(() => {
    setSimulationResult(null);
    clearCurrentSnapshot();
    reset();
  }, [reset, clearCurrentSnapshot]);
  
  const handleViewBlueprintSnapshot = useCallback(() => {
    setSnapshotPanelOpen(true);
  }, [setSnapshotPanelOpen]);
  
  const handleCreateCustomScenario = useCallback((config: CustomScenarioConfig) => {
    const scenario = createCustomScenario(config);
    addCustomScenario(scenario);
    setShowCustomBuilder(false);
    startScenario(scenario.id);
  }, [addCustomScenario, startScenario]);
  
  if (compact) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Simulation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <EnhancedSimulationControls
            status={status}
            timeScale={timeScale}
            progress={progress}
            elapsedTime={elapsedTime}
            remainingTime={remainingTime}
            scenarioName={activeScenario?.name}
            onPlay={handlePlay}
            onPause={pause}
            onResume={resume}
            onReset={handleReset}
            onTimeScaleChange={setTimeScale}
            disabled={!activeScenarioId}
          />
          
          <DCKPIDeltas 
            kpis={kpiDeltas.slice(0, 4)} 
            isRunning={status === 'running'} 
            compact 
          />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Controls Header with Snapshot Button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <EnhancedSimulationControls
            status={status}
            timeScale={timeScale}
            progress={progress}
            elapsedTime={elapsedTime}
            remainingTime={remainingTime}
            scenarioName={activeScenario?.name}
            onPlay={handlePlay}
            onPause={pause}
            onResume={resume}
            onReset={handleReset}
            onTimeScaleChange={setTimeScale}
            disabled={!activeScenarioId}
          />
        </div>
        
        {/* View Blueprint Snapshot Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewBlueprintSnapshot}
              disabled={!currentSnapshot}
              className="gap-2 shrink-0"
            >
              <FileText className="h-4 w-4" />
              View Blueprint Snapshot
              <Info className="h-3 w-3 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p>View the exact blueprint configuration used for this simulation run (read-only snapshot).</p>
          </TooltipContent>
        </Tooltip>
      </div>
      
      {/* Main layout with sidebar */}
      <div className="flex gap-6">
        {/* Main content tabs */}
        <div className="flex-1 min-w-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList>
              <TabsTrigger value="scenarios" className="gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Scenarios
              </TabsTrigger>
              <TabsTrigger value="heatmap" className="gap-1">
                <Grid3X3 className="h-3.5 w-3.5" />
                Rack Map
              </TabsTrigger>
              <TabsTrigger value="timeline" className="gap-1">
                <Clock className="h-3.5 w-3.5" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="kpis" className="gap-1">
                <BarChart3 className="h-3.5 w-3.5" />
                KPI Charts
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="scenarios" className="mt-4">
              <DCScenarioSelector
                presetScenarios={[...presetScenarios, ...blueprintScenarios]}
                customScenarios={customScenarios}
                activeScenarioId={activeScenarioId}
                onSelectScenario={handleSelectScenario}
                onCreateCustom={() => setShowCustomBuilder(true)}
                isRunning={status === 'running'}
              />
            </TabsContent>
            
            <TabsContent value="heatmap" className="mt-4">
              <AnimatedRackHeatmap
                rackMetrics={liveRackMetrics}
                isRunning={status === 'running'}
              />
            </TabsContent>
            
            <TabsContent value="timeline" className="mt-4">
              <DCEventTimeline
                events={events}
                maxHeight="400px"
                autoScroll={status === 'running'}
              />
            </TabsContent>
            
            <TabsContent value="kpis" className="mt-4">
              <AnimatedKPIChartGrid
                snapshots={kpiSnapshots}
                baselineKpis={baselineKpis}
                isRunning={status === 'running'}
              />
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Scenario Context Sidebar - only show when scenario is selected */}
        <AnimatePresence>
          {activeScenario && (
            <motion.div
              initial={{ opacity: 0, x: 20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 320 }}
              exit={{ opacity: 0, x: 20, width: 0 }}
              className="flex-shrink-0"
            >
              <ScenarioContextSidebar
                scenario={activeScenario}
                result={simulationResult || undefined}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Simulation Result Panel - appears on completion */}
      <AnimatePresence>
        {status === 'completed' && simulationResult && (
          <SimulationResultPanel
            result={simulationResult}
            onClose={() => setSimulationResult(null)}
          />
        )}
      </AnimatePresence>
      
      {/* Tools for this Simulation */}
      <DcToolsRow
        twinId={twinId}
        title="Tools for this Simulation"
        subtitle="Launch domain-specific views with simulation context"
        simulationMode
        simulationContext={{
          scenarioId: activeScenarioId || undefined,
          currentTime,
        }}
        compact
      />
      
      {/* Custom Scenario Builder Dialog */}
      <Dialog open={showCustomBuilder} onOpenChange={setShowCustomBuilder}>
        <DialogContent className="max-w-2xl p-0 bg-transparent border-none">
          <CustomScenarioBuilder
            onSave={handleCreateCustomScenario}
            onCancel={() => setShowCustomBuilder(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Blueprint Snapshot Panel - Read-only view of blueprint used for this simulation */}
      <SimulationBlueprintSnapshotPanel twinId={twinId} />
    </div>
  );
}
