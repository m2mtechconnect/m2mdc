/**
 * Simulation Dashboard - Interactive Digital Twin Simulator
 * Enterprise-grade simulation with enhanced KPI visualization
 * 
 * Features:
 * - Enhanced KPI tiles with severity indicators, thresholds, sparklines
 * - Full-screen KPI detail modals with forecasts and CoPilot insights
 * - Bi-directional event timeline <-> graph linking
 * - Advanced simulation controls (scrubber, scenarios, stress tests)
 * - Industry-specific KPI templates
 * - Day in the Life narrative integration
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, Pause, RotateCcw, Zap, TrendingUp, Clock, 
  Activity, AlertTriangle, CheckCircle2, Info, Rocket, Brain
} from 'lucide-react';
import { SimulationEngine, SimulationEvent } from './SimulationEngine';
import { MockSimulationEngine, SimulationPreviewConfig } from './MockSimulationEngine';
import { EnhancedKPIChartsPanel } from '@/components/simulation/EnhancedKPIChartsPanel';
import { EnhancedEventLogPanel, type SimulationEvent as EnhancedSimulationEvent } from '@/components/simulation/EnhancedEventLogPanel';
import { ScenarioPicker } from './ScenarioPicker';
import { DayInLifeNarrative } from './DayInLifeNarrative';
import { AnimatedDeployButton } from './AnimatedDeployButton';
import type { ValidatedTemplate } from '@/lib/templates/unifiedTemplateService';
import { cn } from '@/lib/utils';

interface SimulationDashboardProps {
  template?: ValidatedTemplate;
  builderState?: any;
  mode?: 'builder' | 'manage' | 'preview';
  onDeploy?: () => void;
  isDeploying?: boolean;
  onOpenCoPilot?: () => void;
}

type SimulationStatus = 'idle' | 'running' | 'completed' | 'error';
type SpeedFactor = 1 | 2 | 4;

export function SimulationDashboard({
  template,
  builderState,
  mode = 'builder',
  onDeploy,
  isDeploying = false,
  onOpenCoPilot
}: SimulationDashboardProps) {
  const [status, setStatus] = useState<SimulationStatus>('idle');
  const [speed, setSpeed] = useState<SpeedFactor>(1);
  const [selectedScenario, setSelectedScenario] = useState<any>(null);
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const [kpiData, setKPIData] = useState<any[]>([]);
  const [engine, setEngine] = useState<SimulationEngine | MockSimulationEngine | null>(null);
  
  // Bi-directional linking state
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const [highlightedTimestamp, setHighlightedTimestamp] = useState<number | null>(null);
  const [pinnedEventIds, setPinnedEventIds] = useState<string[]>([]);

  // Extract template data
  const config = template?.default_config as any || builderState?.config || {};
  
  // Detect industry from template
  const industry = (template?.industry || config?.industry || 'default').toLowerCase();
  const scenarios = config.preview_sections?.scenarios?.items || [];
  const kpiBlock = config.kpi_block || {};
  const workflows = Array.isArray(config.workflows) ? config.workflows : [];
  const dayInLifeRoles = config.preview_sections?.day_in_the_life?.roles || [];
  const simulationPreviewConfig: SimulationPreviewConfig | null = config.simulation_preview_config || null;
  
  // Determine if we should use mock simulation (preview mode or no real backend wired)
  // In preview mode, always use mock simulation when config is available
  const useMockSimulation = mode === 'preview' 
    ? !!simulationPreviewConfig 
    : (!!simulationPreviewConfig && (!workflows || workflows.length === 0));
  
  // Default to first scenario if available
  useEffect(() => {
    if (scenarios.length > 0 && !selectedScenario) {
      setSelectedScenario(scenarios[0]);
    }
  }, [scenarios, selectedScenario]);

  // Initialize simulation engine (mock or real)
  useEffect(() => {
    if (!selectedScenario) return;

    // Clear previous state when scenario changes
    setEvents([]);
    setStatus('idle');

    let newEngine: SimulationEngine | MockSimulationEngine;

    if (useMockSimulation && simulationPreviewConfig) {
      // Map scenario from preview section to simulation_preview_config
      // Try to match by ID or title to find the correct scenario key
      const previewScenarioId = selectedScenario.id || '';
      const scenarioKeys = Object.keys(simulationPreviewConfig.scenarios);
      
      // Find matching scenario key in simulation_preview_config
      let matchedScenarioKey = scenarioKeys.find(key => key === previewScenarioId);
      
      if (!matchedScenarioKey) {
        // Try to match by title/label
        const matchEntry = Object.entries(simulationPreviewConfig.scenarios).find(
          ([_, config]) => config.label === selectedScenario.title
        );
        matchedScenarioKey = matchEntry?.[0];
      }
      
      // Fallback to first scenario if no match
      if (!matchedScenarioKey) {
        matchedScenarioKey = scenarioKeys[0];
      }

      // Create a normalized scenario object with the CORRECT scenario key as ID
      const normalizedScenario = {
        ...selectedScenario,
        id: matchedScenarioKey
      };

      // Use mock simulation engine with preview config
      newEngine = new MockSimulationEngine({
        scenario: normalizedScenario,
        previewConfig: simulationPreviewConfig,
        speed
      });

      // Initialize with baseline metrics immediately
      const baselineData = {
        timestamp: '00:00',
        metrics: (newEngine as MockSimulationEngine).getBaselineMetrics()
      };
      setKPIData([baselineData]);
    } else {
      // Use real simulation engine
      newEngine = new SimulationEngine({
        scenario: selectedScenario,
        workflows,
        kpis: kpiBlock.kpis || [],
        template,
        speed
      });
    }

    // Subscribe to engine events
    newEngine.on('event', (event: SimulationEvent) => {
      setEvents(prev => [...prev, event]);
    });

    newEngine.on('kpi-update', (data: any) => {
      setKPIData(prev => [...prev, data]);
    });

    newEngine.on('complete', () => {
      setStatus('completed');
    });

    newEngine.on('error', () => {
      setStatus('error');
    });

    setEngine(newEngine);

    return () => {
      newEngine.stop();
    };
  // Note: speed is intentionally excluded - we use setSpeed() on existing engine instead of recreating
  }, [selectedScenario, workflows, kpiBlock, template, useMockSimulation, simulationPreviewConfig]);

  // Handle play/pause
  const handleTogglePlay = useCallback(() => {
    if (!engine) return;

    if (status === 'running') {
      engine.pause();
      setStatus('idle');
    } else if (status === 'idle' || status === 'completed') {
      // If completed, reset first before starting again
      if (status === 'completed') {
        engine.reset();
        setEvents([]);
        if (useMockSimulation && engine instanceof MockSimulationEngine) {
          const baselineData = {
            timestamp: '00:00',
            metrics: engine.getBaselineMetrics()
          };
          setKPIData([baselineData]);
        } else {
          setKPIData([]);
        }
      }
      engine.start();
      setStatus('running');
    }
  }, [engine, status, useMockSimulation]);

  // Handle reset
  const handleReset = useCallback(() => {
    if (!engine) return;
    
    engine.reset();
    setStatus('idle');
    setEvents([]);
    
    // Re-initialize baseline metrics for mock simulation
    if (useMockSimulation && engine instanceof MockSimulationEngine) {
      const baselineData = {
        timestamp: '00:00',
        metrics: engine.getBaselineMetrics()
      };
      setKPIData([baselineData]);
    } else {
      setKPIData([]);
    }
  }, [engine, useMockSimulation]);

  // Handle speed change
  const handleSpeedChange = useCallback(() => {
    const newSpeed: SpeedFactor = speed === 1 ? 2 : speed === 2 ? 4 : 1;
    setSpeed(newSpeed);
    if (engine) {
      engine.setSpeed(newSpeed);
    }
  }, [speed, engine]);

  // Get status configuration
  const statusConfig = {
    idle: { label: 'Idle', color: 'bg-muted text-muted-foreground', icon: Info },
    running: { label: 'Running...', color: 'bg-primary text-primary-foreground animate-pulse', icon: Activity },
    completed: { label: 'Completed', color: 'bg-green-500 text-white', icon: CheckCircle2 },
    error: { label: 'Error', color: 'bg-destructive text-destructive-foreground', icon: AlertTriangle },
  }[status];

  const StatusIcon = statusConfig.icon;

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in">
      {/* Scenario Picker */}
      {scenarios.length > 0 && (
        <ScenarioPicker
          scenarios={scenarios}
          selected={selectedScenario}
          onSelect={setSelectedScenario}
        />
      )}

      {/* Run Controls Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Scenario Name & Status */}
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">
                {selectedScenario?.title || template?.name || 'Simulation'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedScenario?.description || 'Interactive digital twin simulation'}
              </p>
            </div>
            <Badge className={cn('gap-1.5', statusConfig.color)}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTogglePlay}
              disabled={!selectedScenario}
              className="gap-2"
            >
              {status === 'running' ? (
                <>
                  <Pause className="h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run
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
              onClick={handleReset}
              disabled={!selectedScenario || status === 'idle'}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Left: Enhanced KPI Charts Panel */}
        <div className="col-span-7">
          <EnhancedKPIChartsPanel
            kpis={kpiBlock.kpis || []}
            data={kpiData}
            scenario={selectedScenario}
            isRunning={status === 'running'}
            industry={industry}
            highlightedTimestamp={highlightedTimestamp}
            onEventHover={(ts) => setHighlightedTimestamp(ts)}
            onOpenCoPilot={onOpenCoPilot}
          />
        </div>

        {/* Right: Enhanced Event Log Panel */}
        <div className="col-span-5">
          <EnhancedEventLogPanel
            events={events as EnhancedSimulationEvent[]}
            isRunning={status === 'running'}
            highlightedEventId={highlightedEventId}
            pinnedEventIds={pinnedEventIds}
            onEventHover={(id, ts) => {
              setHighlightedEventId(id);
              setHighlightedTimestamp(ts ?? null);
            }}
            onPinEvent={(event) => {
              setPinnedEventIds(prev => 
                prev.includes(event.id) 
                  ? prev.filter(id => id !== event.id) 
                  : [...prev, event.id]
              );
            }}
          />
        </div>
      </div>

      {/* Day in the Life Narrative (if available) */}
      {dayInLifeRoles.length > 0 && (
        <DayInLifeNarrative
          roles={dayInLifeRoles}
          currentScenario={selectedScenario}
        />
      )}

      {/* Deploy Button (Builder Mode Only) */}
      {mode === 'builder' && onDeploy && (
        <div className="pt-4 border-t">
          <AnimatedDeployButton
            onDeploy={onDeploy}
            isDeploying={isDeploying}
            agentName={template?.name || builderState?.name || 'Digital Twin'}
          />
        </div>
      )}
    </div>
  );
}
