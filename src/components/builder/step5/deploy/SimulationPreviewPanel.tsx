/**
 * Simulation Preview Panel
 * Shows industry-specific KPIs, event timeline, and simulation controls
 * 
 * ENHANCED: Now connects to live simulation engine for real-time KPI updates
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, Clock, CheckCircle2, AlertCircle, Activity, 
  TrendingUp, Zap, Info, Plus, Pause
} from 'lucide-react';
import { 
  getSimulationTemplateForIndustry, 
  getIndustryLabel,
  type SimulationTemplate,
  type SimulationKPI,
} from '@/lib/simulationTemplates';
import { useSimulation } from '@/simulation/useSimulation';
import { SimulationKPICard } from './SimulationKPICard';
import { SimulationEventTimeline } from './SimulationEventTimeline';

interface SimulationRun {
  id: string;
  scenario: string;
  status: 'completed' | 'failed' | 'running';
  duration: number;
  timestamp: Date;
  outputs: string;
  events: number;
  latency: number;
}

interface SimulationPreviewPanelProps {
  simulationHistory: SimulationRun[];
  industry: string;
  onRunSimulation: (scenario: string) => void;
  isRunning: boolean;
}

export function SimulationPreviewPanel({
  simulationHistory,
  industry,
  onRunSimulation,
  isRunning
}: SimulationPreviewPanelProps) {
  const [template, setTemplate] = useState<SimulationTemplate | null>(null);
  const [isSampleData, setIsSampleData] = useState(true);
  
  // Connect to live simulation engine for real-time KPI data
  const { 
    status: simulationStatus, 
    currentKpis, 
    baselineKpis,
    presetScenarios,
    startScenario,
    pause,
    resume,
    reset,
    progress,
  } = useSimulation();
  
  const isEngineRunning = simulationStatus === 'running';
  
  useEffect(() => {
    const simTemplate = getSimulationTemplateForIndustry(industry);
    setTemplate(simTemplate);
    setIsSampleData(simulationHistory.length === 0 && simulationStatus === 'idle');
  }, [industry, simulationHistory.length, simulationStatus]);

  // Create live KPIs by merging template definitions with live simulation data
  const liveKpis = useMemo<SimulationKPI[]>(() => {
    if (!template) return [];
    
    // Map template KPI codes to simulation engine KPI keys
    const kpiCodeToEngineKey: Record<string, string> = {
      'pue': 'pue',
      'effectivePue': 'pue',
      'gpu_utilization': 'gpuUtilization',
      'gpuUtilization': 'gpuUtilization',
      'avgGpuUtilization': 'gpuUtilization',
      'thermal_stability': 'thermalStabilityScore',
      'thermalStabilityScore': 'thermalStabilityScore',
      'power_reliability': 'powerReliabilityScore',
      'powerReliabilityScore': 'powerReliabilityScore',
      'cooling_efficiency': 'coolingEfficiencyIndex',
      'coolingEfficiencyIndex': 'coolingEfficiencyIndex',
      'sovereignty': 'sovereignComplianceScore',
      'sovereignComplianceScore': 'sovereignComplianceScore',
    };
    
    return template.kpis.map(kpi => {
      const engineKey = kpiCodeToEngineKey[kpi.code] || kpi.code;
      const hasLiveData = engineKey in currentKpis && engineKey in baselineKpis;
      
      if (hasLiveData && simulationStatus !== 'idle') {
        // Use live simulation data
        return {
          ...kpi,
          baseline: baselineKpis[engineKey] ?? kpi.baseline,
          simulated: currentKpis[engineKey] ?? kpi.simulated,
        };
      }
      
      // Fall back to template static values
      return kpi;
    });
  }, [template, currentKpis, baselineKpis, simulationStatus]);

  const industryLabel = getIndustryLabel(industry);

  const statusIcon = (status: SimulationRun['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <Activity className="h-4 w-4 text-primary animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (!template) return null;

  return (
    <div className="space-y-4">
      {/* Sample Data Info Banner - show only when idle with no history */}
      {isSampleData && simulationStatus === 'idle' && (
        <Alert className="bg-warning/10 border-warning/30">
          <Info className="h-4 w-4 text-warning" />
          <AlertDescription className="text-sm">
            Showing recommended sample KPIs for <strong>{industryLabel}</strong>.
            Run a simulation scenario to see live KPI updates.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Live Simulation Status Banner */}
      {isEngineRunning && (
        <Alert className="bg-success/10 border-success/30">
          <Activity className="h-4 w-4 text-success animate-pulse" />
          <AlertDescription className="text-sm flex items-center justify-between">
            <span>
              Simulation running • <strong>{Math.round(progress)}%</strong> complete
            </span>
            <Button size="sm" variant="ghost" onClick={pause} className="h-6 gap-1">
              <Pause className="h-3 w-3" />
              Pause
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Simulation Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{template.title}</CardTitle>
                {isSampleData && (
                  <Badge variant="secondary" className="text-xs">
                    Sample Data
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{template.description}</p>
            </div>
            <Button
              onClick={() => onRunSimulation(template.defaultQuery)}
              disabled={isRunning}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              {isRunning ? 'Running...' : 'Run Simulation'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Cards Grid - uses live data when simulation is running */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Key Performance Indicators
          {isEngineRunning && (
            <Badge variant="outline" className="text-[10px] ml-2 bg-success/10 text-success border-success/30 animate-pulse">
              LIVE
            </Badge>
          )}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {liveKpis.map((kpi) => (
            <SimulationKPICard 
              key={kpi.code} 
              kpi={kpi} 
              isSampleData={isSampleData && simulationStatus === 'idle'} 
            />
          ))}
        </div>
      </div>

      {/* Event Timeline */}
      <SimulationEventTimeline 
        events={template.events} 
        isSampleData={isSampleData} 
      />

      {/* Recent Runs */}
      {simulationHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Simulation Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[180px]">
              <div className="space-y-2">
                {simulationHistory.slice(0, 5).map((run) => (
                  <div 
                    key={run.id}
                    className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {statusIcon(run.status)}
                        <span className="font-medium text-sm truncate max-w-[250px]">
                          {run.scenario}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {run.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                      {run.outputs}
                    </p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {run.duration}ms
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {run.events} events
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {run.latency}ms latency
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Default Query Preview */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Play className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium mb-1">Default Simulation Query</h4>
              <p className="text-sm text-muted-foreground">{template.defaultQuery}</p>
              <Button 
                variant="link" 
                size="sm" 
                className="px-0 h-auto mt-2"
                onClick={() => onRunSimulation(template.defaultQuery)}
                disabled={isRunning}
              >
                <Plus className="h-3 w-3 mr-1" />
                Run this scenario
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
