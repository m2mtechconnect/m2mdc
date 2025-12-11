/**
 * DC Twin Simulation Tab
 * Enterprise-grade KPI System matching Nvidia Omniverse, Siemens, Schneider, AWS, Azure
 * SIMULATION MODE - Read-only blueprint, focus on running scenarios
 */

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  PlayCircle, Pause, RotateCcw, Clock, AlertTriangle, 
  Zap, Leaf, Shield, TrendingUp, Server, GitCompare, LineChart, 
  Lightbulb, SlidersHorizontal, Network
} from 'lucide-react';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import type { DCScenarioCategory } from '@/types/dcTwinBuilder';
import { MultiKPIOverlay } from '@/components/simulation/MultiKPIOverlay';
import { EnhancedTimeControls } from '@/components/simulation/EnhancedTimeControls';
import { LiveRecommendations } from '@/components/simulation/LiveRecommendations';
import { ScenarioEnhancementsPanel } from '@/components/blueprint/ScenarioEnhancementsPanel';
import { SimulationModeHeader } from '@/components/simulation/SimulationModeHeader';
import { BlueprintViewProvider } from '@/context/BlueprintViewContext';
import { EnterpriseKPICard, EnterpriseKPICardGrid } from '@/components/simulation/EnterpriseKPICard';
import { EnterpriseKPIChart } from '@/components/simulation/EnterpriseKPIChart';
import { KPICorrelationMatrix } from '@/components/simulation/KPICorrelationMatrix';
import { WhatIfControls } from '@/components/simulation/WhatIfControls';
import { EnhancedComparisonMode } from '@/components/simulation/EnhancedComparisonMode';
import type { KPISnapshot, SimulationEvent } from '@/simulation/types';

const categoryIcons: Record<DCScenarioCategory, React.ReactNode> = {
  capacity: <Server className="h-4 w-4" />,
  incident: <AlertTriangle className="h-4 w-4" />,
  emissions: <Leaf className="h-4 w-4" />,
  compliance: <Shield className="h-4 w-4" />,
  optimization: <TrendingUp className="h-4 w-4" />,
};

const severityColors: Record<string, string> = {
  critical: 'border-destructive/50 bg-destructive/5',
  warning: 'border-warning/50 bg-warning/5',
  info: 'border-info/50 bg-info/5',
};

// Generate mock KPI snapshots with all required fields
function generateMockSnapshots(count: number): KPISnapshot[] {
  const snapshots: KPISnapshot[] = [];
  for (let i = 0; i < count; i++) {
    snapshots.push({
      timestamp: i * 10,
      pue: 1.2 + Math.sin(i * 0.1) * 0.15 + Math.random() * 0.05,
      gpuUtilization: 75 + Math.sin(i * 0.15) * 20 + Math.random() * 5,
      thermalStabilityScore: 85 + Math.sin(i * 0.08) * 10 + Math.random() * 2,
      powerReliabilityScore: 95 + Math.sin(i * 0.05) * 4 + Math.random() * 1,
      sovereignComplianceScore: 98 - Math.abs(Math.sin(i * 0.05)) * 3,
      emissionsVsTarget: -5 + Math.sin(i * 0.12) * 10 + Math.random() * 3,
      coolingEfficiencyIndex: 92 - Math.cos(i * 0.08) * 8 + Math.random() * 2,
      networkIntegrityScore: 99 - Math.abs(Math.sin(i * 0.1)) * 2,
      environmentalSafetyScore: 97 + Math.sin(i * 0.03) * 2,
      avgUpsRuntime: 30 + Math.random() * 5,
    });
  }
  return snapshots;
}

// Generate mock events
function generateMockEvents(): SimulationEvent[] {
  return [
    { id: 'e1', timestamp: 30, type: 'THRESHOLD_BREACH', domain: 'thermal_hardware', severity: 'high', title: 'GPU Temperature Spike', description: 'GPU cluster A3 exceeded 82°C', affectedKpis: ['thermalStabilityScore'] },
    { id: 'e2', timestamp: 90, type: 'ANOMALY', domain: 'cooling', severity: 'medium', title: 'Cooling Efficiency Drop', description: 'CRAH unit 2 efficiency below target', affectedKpis: ['coolingEfficiencyIndex', 'pue'] },
    { id: 'e3', timestamp: 150, type: 'THRESHOLD_BREACH', domain: 'power_ups', severity: 'critical', title: 'Power Draw Critical', description: 'Total power approaching capacity limit', affectedKpis: ['powerReliabilityScore', 'pue'] },
    { id: 'e4', timestamp: 220, type: 'ANOMALY', domain: 'network', severity: 'low', title: 'Latency Spike', description: 'Network latency increased on spine switch 1', affectedKpis: ['networkIntegrityScore'] },
  ];
}

export function DCSimulationTab() {
  const { overview, scenarios, kpis } = useDCTwinBuilderStore();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeView, setActiveView] = useState('scenarios');
  const [selectedKpiId, setSelectedKpiId] = useState<string>('pue');
  
  // Mock data for enterprise KPI system
  const snapshots = useMemo(() => generateMockSnapshots(30), []);
  const events = useMemo(() => generateMockEvents(), []);
  
  const enabledScenarios = scenarios.filter(s => s.enabled);
  const activeScenario = scenarios.find(s => s.id === selectedScenario);
  const totalDuration = activeScenario?.durationSeconds || 300;
  
  const handleRunScenario = () => {
    if (selectedScenario) {
      setIsRunning(true);
    }
  };
  
  const handlePause = () => {
    setIsRunning(false);
  };
  
  const handleReset = () => {
    setIsRunning(false);
    setSelectedScenario(null);
    setCurrentTime(0);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };
  
  // Get current snapshot index based on time
  const currentSnapshotIndex = Math.min(Math.floor(currentTime / 10), snapshots.length - 1);
  const currentSnapshot = snapshots[currentSnapshotIndex] || snapshots[0];
  const previousSnapshot = snapshots[Math.max(0, currentSnapshotIndex - 1)];
  
  return (
    <BlueprintViewProvider mode="simulationSnapshot">
      <div className="space-y-6">
        {/* SIMULATION MODE HEADER */}
        <SimulationModeHeader
          twinName={overview.twinName || 'Sovereign AI Data Centre'}
          subtitle={`${overview.facilityLocation || 'Montreal, QC'} • ${overview.renewablePercent || 95}% Renewable • ${overview.capacityKw?.toLocaleString() || '10,000'} kW`}
          blueprintVersion="v1.0"
          lastUpdated={new Date().toLocaleDateString()}
          showDesignerLink={true}
        />

        {/* Enterprise KPI Cards Grid */}
        <EnterpriseKPICardGrid
          snapshots={snapshots.slice(0, currentSnapshotIndex + 1)}
          isLive={isRunning}
          onKpiClick={(kpiId) => {
            setSelectedKpiId(kpiId);
            setActiveView('kpis');
          }}
        />

        {/* View Tabs */}
        <Tabs value={activeView} onValueChange={setActiveView}>
          <div className="flex items-center justify-between">
            <TabsList className="grid grid-cols-5 w-full max-w-2xl">
              <TabsTrigger value="scenarios" className="gap-2">
                <PlayCircle className="h-4 w-4" />
                Scenarios
              </TabsTrigger>
              <TabsTrigger value="kpis" className="gap-2">
                <LineChart className="h-4 w-4" />
                KPI Overlay
              </TabsTrigger>
              <TabsTrigger value="compare" className="gap-2">
                <GitCompare className="h-4 w-4" />
                Compare
              </TabsTrigger>
              <TabsTrigger value="correlation" className="gap-2">
                <Network className="h-4 w-4" />
                Correlation
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-2">
                <Lightbulb className="h-4 w-4" />
                Insights
              </TabsTrigger>
            </TabsList>

            {/* What-If Controls Drawer */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  What-If Controls
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle>What-If Simulation Controls</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <WhatIfControls
                    onParameterChange={(id, value) => console.log('Param change:', id, value)}
                    onApplyScenario={(params) => console.log('Apply scenario:', params)}
                    onReset={() => console.log('Reset')}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <TabsContent value="scenarios" className="space-y-6">
            {/* Simulation Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PlayCircle className="h-5 w-5" />
                  Simulation Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button 
                    onClick={handleRunScenario} 
                    disabled={!selectedScenario || isRunning}
                    className="gap-2"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Run Scenario
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
                    variant="outline" 
                    onClick={handleReset}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                  
                  {activeScenario && (
                    <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Duration: {Math.floor(activeScenario.durationSeconds / 60)}m {activeScenario.durationSeconds % 60}s
                    </div>
                  )}
                </div>

                {/* Enhanced Time Controls */}
                {selectedScenario && (
                  <EnhancedTimeControls
                    currentTime={currentTime}
                    totalDuration={totalDuration}
                    isPlaying={isRunning}
                    playbackSpeed={playbackSpeed}
                    onPlay={handleRunScenario}
                    onPause={handlePause}
                    onSeek={handleSeek}
                    onSpeedChange={handleSpeedChange}
                    checkpoints={[
                      { id: 'start', time: 0, label: 'Start', type: 'auto' },
                      { id: 'event1', time: 60, label: 'First Alert', type: 'event' },
                      { id: 'event2', time: 180, label: 'Critical Event', type: 'event' },
                    ]}
                  />
                )}
              </CardContent>
            </Card>

            {/* Scenario Chain Simulator */}
            <ScenarioEnhancementsPanel 
              onRunChain={(ids) => console.log('Running chain:', ids)}
            />
            
            {/* Scenario Grid */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Available Scenarios ({enabledScenarios.length})</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {enabledScenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => setSelectedScenario(scenario.id)}
                    className={`text-left p-4 rounded-lg border transition-all hover:shadow-md ${
                      selectedScenario === scenario.id 
                        ? 'border-primary ring-2 ring-primary/20' 
                        : severityColors[scenario.severity] || 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-2 rounded-lg bg-muted">
                        {categoryIcons[scenario.category]}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] ${
                          scenario.severity === 'critical' ? 'text-destructive' :
                          scenario.severity === 'warning' ? 'text-warning' : 'text-info'
                        }`}
                      >
                        {scenario.severity}
                      </Badge>
                    </div>
                    
                    <h4 className="font-semibold text-sm mb-1">{scenario.name}</h4>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{scenario.description}</p>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {Math.floor(scenario.durationSeconds / 60)}m
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {scenario.eventsCount} events
                      </span>
                    </div>
                    
                    {scenario.kpisImpacted.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {scenario.kpisImpacted.slice(0, 2).map((kpi, i) => (
                          <Badge key={i} variant="secondary" className="text-[9px]">{kpi}</Badge>
                        ))}
                        {scenario.kpisImpacted.length > 2 && (
                          <Badge variant="secondary" className="text-[9px]">+{scenario.kpisImpacted.length - 2}</Badge>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="kpis" className="space-y-6">
            {/* Enterprise KPI Chart with full features */}
            <EnterpriseKPIChart
              kpiId={selectedKpiId}
              snapshots={snapshots}
              events={events}
              isRunning={isRunning}
              onTimeClick={handleSeek}
            />
            
            {/* KPI Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Select KPI to Analyze</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {['pue', 'gpuUtilization', 'thermalStabilityScore', 'coolingEfficiencyIndex', 'powerReliabilityScore', 'sovereignComplianceScore'].map((kpiId) => (
                    <Button
                      key={kpiId}
                      variant={selectedKpiId === kpiId ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedKpiId(kpiId)}
                    >
                      {kpiId.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Multi-KPI Overlay */}
            <MultiKPIOverlay />
          </TabsContent>

          <TabsContent value="compare" className="space-y-6">
            <EnhancedComparisonMode />
          </TabsContent>

          <TabsContent value="correlation" className="space-y-6">
            <KPICorrelationMatrix snapshots={snapshots} />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <LiveRecommendations currentTime={currentTime} />
              <EnterpriseKPIChart
                kpiId={selectedKpiId}
                snapshots={snapshots}
                events={events}
                isRunning={isRunning}
                onTimeClick={handleSeek}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </BlueprintViewProvider>
  );
}
