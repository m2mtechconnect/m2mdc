/**
 * Sovereign DC Twin - Enhanced Simulation Dashboard
 * Full simulation cockpit with expanded KPIs, AI recommendations, and multi-run comparison
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, Pause, RotateCcw, Download, Building2, Brain, 
  ChevronDown, Sparkles, Zap, Activity, BarChart3
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { SovereignDCKPIPanel } from './SovereignDCKPIPanel';
import { SovereignDCFacilityDetails } from './SovereignDCFacilityDetails';
import { AIRecommendationsPanel } from '@/components/simulation/AIRecommendationsPanel';
import { MultiRunComparison } from '@/components/simulation/MultiRunComparison';
import { useEnhancedSimulation } from '../hooks/useEnhancedSimulation';
import { useSovereignDCTwin } from '../hooks/useSovereignDCTwin';
import { generatePlaybook, playbookToMarkdown } from '../generatePlaybook';
import { getAllDemoFacilities } from '../mockData';
import { SOVEREIGN_DC_COPILOT_CHIPS } from '../copilotContext';
import { sovereignDCAnalytics } from '../analytics';
import type { EnhancedSimulationType } from '../enhancedSimulationEngine';
import { cn } from '@/lib/utils';

interface SovereignDCSimulationDashboardProps {
  facilityId?: string;
  onOpenCoPilot?: (question?: string) => void;
}

export function SovereignDCSimulationDashboard({ 
  facilityId,
  onOpenCoPilot 
}: SovereignDCSimulationDashboardProps) {
  const {
    facility,
    currentKpis: facilityKpis,
    previousKpis,
    resetToBaseline: resetFacilityKpis,
    switchFacility,
  } = useSovereignDCTwin({ facilityId });

  const {
    scenarios,
    kpiGroups,
    selectedScenario,
    isRunning,
    speed,
    progress,
    events,
    currentKpis,
    lastSummary,
    runHistory,
    runScenario,
    pauseSimulation,
    resumeSimulation,
    resetSimulation,
    changeSpeed,
  } = useEnhancedSimulation({ facility });

  const [isGeneratingPlaybook, setIsGeneratingPlaybook] = useState(false);
  const [activeTab, setActiveTab] = useState('scenarios');

  const allFacilities = getAllDemoFacilities();

  const handleRunScenario = useCallback(async (type: EnhancedSimulationType) => {
    if (!facility) return;
    
    sovereignDCAnalytics.simulationRun(facility.id, type, type);
    runScenario(type);
  }, [facility, runScenario]);

  const handleTogglePlay = useCallback(() => {
    if (isRunning) {
      pauseSimulation();
    } else if (selectedScenario) {
      resumeSimulation();
    }
  }, [isRunning, selectedScenario, pauseSimulation, resumeSimulation]);

  const handleSpeedChange = useCallback(() => {
    const newSpeed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
    changeSpeed(newSpeed as 1 | 2 | 4);
  }, [speed, changeSpeed]);

  const handleGeneratePlaybook = useCallback(async () => {
    if (!facility || !facilityKpis) return;
    
    setIsGeneratingPlaybook(true);
    sovereignDCAnalytics.playbookGenerated(facility.id);
    
    try {
      const playbook = generatePlaybook({
        facility,
        enabledModels: {
          energyEmissions: true,
          gpuCapacity: true,
          sovereigntyDataResidency: true,
          financialPolicy: true,
          incidentEmergency: true,
        },
        recentSimulations: [],
        targetKpis: facilityKpis,
      });
      const markdown = playbookToMarkdown(playbook);
      
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${facility.name.replace(/\s+/g, '_')}_playbook.md`;
      a.click();
      URL.revokeObjectURL(url);
      
      sovereignDCAnalytics.playbookExported(facility.id, 'markdown');
    } finally {
      setIsGeneratingPlaybook(false);
    }
  }, [facility, facilityKpis]);

  const handleFacilitySwitch = useCallback((newFacilityId: string) => {
    const newFacility = allFacilities.find(f => f.id === newFacilityId);
    if (newFacility) {
      switchFacility(newFacilityId);
      resetSimulation();
      sovereignDCAnalytics.facilitySwitched(newFacilityId, newFacility.name);
    }
  }, [allFacilities, switchFacility, resetSimulation]);

  const handleCoPilotChip = useCallback((question: string) => {
    if (facility) {
      sovereignDCAnalytics.copilotQuery(facility.id, question);
    }
    onOpenCoPilot?.(question);
  }, [facility, onOpenCoPilot]);

  if (!facility || !facilityKpis) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading facility data...</p>
        </CardContent>
      </Card>
    );
  }

  // Get current event type counts for status display
  const eventCounts = {
    alerts: events.filter(e => e.type === 'alert' || e.type === 'warning').length,
    actions: events.filter(e => e.type === 'action' || e.type === 'decision').length,
    resolved: events.filter(e => e.type === 'resolved').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{facility.name}</h2>
            <Badge variant="outline">{facility.region}</Badge>
            {facility.energyMix.renewable > 0.8 && (
              <Badge className="bg-green-600">🌿 Green</Badge>
            )}
          </div>
          <p className="text-muted-foreground max-w-2xl">
            {facility.description}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Facility Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Building2 className="h-4 w-4 mr-2" />
                Switch Facility
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {allFacilities.map((f) => (
                <DropdownMenuItem
                  key={f.id}
                  onClick={() => handleFacilitySwitch(f.id)}
                  className={cn(f.id === facility.id && "bg-muted")}
                >
                  <div className="flex items-center gap-2">
                    {f.energyMix.renewable > 0.8 ? '🌿' : '⛽'}
                    <span>{f.name}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {f.region}
                    </Badge>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetSimulation();
              resetFacilityKpis();
            }}
            disabled={isRunning}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGeneratePlaybook}
            disabled={isGeneratingPlaybook}
          >
            <Download className="h-4 w-4 mr-2" />
            {isGeneratingPlaybook ? 'Generating...' : 'Playbook'}
          </Button>
        </div>
      </div>

      {/* CoPilot Suggestion Chips */}
      {onOpenCoPilot && (
        <Card className="bg-muted/30">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground mr-2">Ask CoPilot:</span>
              {SOVEREIGN_DC_COPILOT_CHIPS.slice(0, 4).map((chip) => (
                <Button
                  key={chip.label}
                  variant="secondary"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleCoPilotChip(chip.question)}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {chip.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simulation Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">
                {selectedScenario?.name || 'Select a Scenario'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedScenario?.description || 'Choose a scenario from the list below to begin simulation'}
              </p>
            </div>
            {selectedScenario && (
              <div className="flex items-center gap-2">
                <Badge className={cn(
                  isRunning ? 'bg-primary animate-pulse' : progress === 100 ? 'bg-green-500' : 'bg-muted'
                )}>
                  <Activity className="h-3 w-3 mr-1" />
                  {isRunning ? 'Running' : progress === 100 ? 'Complete' : 'Ready'}
                </Badge>
                {isRunning && (
                  <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTogglePlay}
              disabled={!selectedScenario}
              className="gap-2"
            >
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  {progress > 0 && progress < 100 ? 'Resume' : 'Run'}
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSpeedChange}
              disabled={!selectedScenario}
              className="gap-1 min-w-[70px]"
            >
              <Zap className="h-3 w-3" />
              {speed}x
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={resetSimulation}
              disabled={!selectedScenario || (progress === 0 && !isRunning)}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Progress bar */}
        {selectedScenario && (
          <Progress value={progress} className="mt-3 h-1" />
        )}
      </Card>

      {/* KPI Panel - showing simulation KPIs when running, facility KPIs otherwise */}
      <SovereignDCKPIPanel
        kpis={Object.keys(currentKpis).length > 0 ? {
          sovereignComputeRatioPct: currentKpis.sovereignComputeRatioPct || facilityKpis.sovereignComputeRatioPct,
          effectiveAiPue: currentKpis.effectiveAiPue || facilityKpis.effectiveAiPue,
          gco2PerGpuHour: currentKpis.gco2PerGpuHour || facilityKpis.gco2PerGpuHour,
          sovereignRiskScore: currentKpis.sovereignRiskScore || facilityKpis.sovereignRiskScore,
          economicEfficiencyScore: currentKpis.economicEfficiencyScore || facilityKpis.economicEfficiencyScore,
          renewableRatioPct: currentKpis.renewableMix || facilityKpis.renewableRatioPct,
          carbonIntensityKgPerMwh: facilityKpis.carbonIntensityKgPerMwh,
          totalGpuCount: facilityKpis.totalGpuCount,
          activeWorkloads: currentKpis.activeWorkloads || facilityKpis.activeWorkloads
        } : facilityKpis}
        previousKpis={previousKpis || undefined}
        isSimulating={isRunning}
      />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="events">
            Event Log
            {events.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {events.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="comparison">
            Multi-Run
            {runHistory.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {runHistory.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="details">Facility Details</TabsTrigger>
        </TabsList>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            {scenarios.map((scenario) => (
              <Card 
                key={scenario.id}
                className={cn(
                  "cursor-pointer transition-all hover:border-primary/50",
                  selectedScenario?.id === scenario.id && "border-primary bg-primary/5"
                )}
                onClick={() => handleRunScenario(scenario.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-semibold">{scenario.name}</h4>
                      <p className="text-sm text-muted-foreground">{scenario.description}</p>
                    </div>
                    <Badge variant={
                      scenario.severity === 'critical' ? 'destructive' :
                      scenario.severity === 'high' ? 'default' :
                      scenario.severity === 'medium' ? 'secondary' : 'outline'
                    }>
                      {scenario.severity}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {scenario.category}
                    </span>
                    <span>{scenario.duration_seconds}s duration</span>
                    <span>{scenario.event_timeline.length} events</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Event Log Tab */}
        <TabsContent value="events" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Event Timeline</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-orange-500">
                    {eventCounts.alerts} Alerts
                  </Badge>
                  <Badge variant="outline" className="text-blue-500">
                    {eventCounts.actions} Actions
                  </Badge>
                  <Badge variant="outline" className="text-green-500">
                    {eventCounts.resolved} Resolved
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No events yet. Run a simulation to see the event timeline.</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {events.map((event) => (
                      <div 
                        key={event.id}
                        className={cn(
                          "p-3 rounded-lg border",
                          event.type === 'alert' && "border-red-500/30 bg-red-500/5",
                          event.type === 'warning' && "border-orange-500/30 bg-orange-500/5",
                          event.type === 'action' && "border-blue-500/30 bg-blue-500/5",
                          event.type === 'decision' && "border-purple-500/30 bg-purple-500/5",
                          event.type === 'resolved' && "border-green-500/30 bg-green-500/5",
                          (event.type === 'info' || event.type === 'detect') && "border-muted"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs uppercase">
                                {event.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {event.timestamp}
                              </span>
                            </div>
                            <p className="text-sm">{event.message}</p>
                          </div>
                          <Badge variant={
                            event.severity === 'critical' ? 'destructive' :
                            event.severity === 'high' ? 'default' :
                            event.severity === 'medium' ? 'secondary' : 'outline'
                          } className="text-xs">
                            {event.severity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* AI Recommendations - show after simulation completes */}
          {lastSummary && (
            <div className="mt-4">
              <AIRecommendationsPanel 
                summary={lastSummary}
                onDismiss={() => {}}
                onActionClick={(rec, action) => {
                  console.log('Action clicked:', rec.title, action);
                }}
              />
            </div>
          )}
        </TabsContent>

        {/* Multi-Run Comparison Tab */}
        <TabsContent value="comparison" className="mt-4">
          <MultiRunComparison 
            runHistory={runHistory}
            maxDisplayRuns={10}
          />
        </TabsContent>

        {/* Facility Details Tab */}
        <TabsContent value="details" className="mt-4">
          <SovereignDCFacilityDetails
            gpuClusters={facility.gpuClusters}
            dataFlows={facility.dataFlows}
            incidentScenarios={facility.incidentScenarios}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}