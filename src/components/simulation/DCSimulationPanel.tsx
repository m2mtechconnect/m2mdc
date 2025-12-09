/**
 * DC Simulation Panel Component
 * Main simulation interface combining all simulation components
 * Uses Studio design system tokens
 * Now wired to Blueprint for scenarios
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Activity, Clock, Sparkles } from 'lucide-react';
import { useSimulation } from '@/simulation/useSimulation';
import { useBlueprint } from '@/hooks/useBlueprint';
import { DCScenarioSelector } from './DCScenarioSelector';
import { DCSimulationControls } from './DCSimulationControls';
import { DCEventTimeline } from './DCEventTimeline';
import { DCKPIDeltas, defaultKPIs } from './DCKPIDeltas';
import { CustomScenarioBuilder } from './CustomScenarioBuilder';
import { createCustomScenario } from '@/simulation/customScenarioBuilder';
import type { CustomScenarioConfig } from '@/simulation/types';

interface DCSimulationPanelProps {
  compact?: boolean;
  twinId?: string;
}

export function DCSimulationPanel({ compact = false, twinId = 'default' }: DCSimulationPanelProps) {
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [activeTab, setActiveTab] = useState<'scenarios' | 'timeline' | 'kpis'>('scenarios');
  
  // Get Blueprint scenarios
  const { blueprint } = useBlueprint(twinId);
  
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
    startScenario(scenarioId);
  }, [status, pause, startScenario]);
  
  const handlePlay = useCallback(() => {
    if (activeScenarioId) {
      startScenario(activeScenarioId);
    }
  }, [activeScenarioId, startScenario]);
  
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
          <DCSimulationControls
            status={status}
            timeScale={timeScale}
            progress={progress}
            elapsedTime={elapsedTime}
            remainingTime={remainingTime}
            scenarioName={activeScenario?.name}
            onPlay={handlePlay}
            onPause={pause}
            onResume={resume}
            onReset={reset}
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
      {/* Controls */}
      <DCSimulationControls
        status={status}
        timeScale={timeScale}
        progress={progress}
        elapsedTime={elapsedTime}
        remainingTime={remainingTime}
        scenarioName={activeScenario?.name}
        onPlay={handlePlay}
        onPause={pause}
        onResume={resume}
        onReset={reset}
        onTimeScaleChange={setTimeScale}
        disabled={!activeScenarioId}
      />
      
      {/* Main content tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="scenarios" className="gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            Scenarios
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1">
            <Clock className="h-3.5 w-3.5" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="kpis" className="gap-1">
            <Activity className="h-3.5 w-3.5" />
            KPIs
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
        
        <TabsContent value="timeline" className="mt-4">
          <DCEventTimeline
            events={events}
            maxHeight="400px"
            autoScroll={status === 'running'}
          />
        </TabsContent>
        
        <TabsContent value="kpis" className="mt-4">
          <DCKPIDeltas 
            kpis={kpiDeltas} 
            isRunning={status === 'running'} 
          />
        </TabsContent>
      </Tabs>
      
      {/* Custom Scenario Builder Dialog */}
      <Dialog open={showCustomBuilder} onOpenChange={setShowCustomBuilder}>
        <DialogContent className="max-w-2xl p-0 bg-transparent border-none">
          <CustomScenarioBuilder
            onSave={handleCreateCustomScenario}
            onCancel={() => setShowCustomBuilder(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
