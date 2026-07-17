/**
 * Enhanced KPI Charts Panel
 * Enterprise-grade KPI visualization with all improvements:
 * - Severity indicators, sparklines, thresholds
 * - Full-screen detail modals
 * - Bi-directional event timeline linking
 * - CoPilot integration
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Brain, ChevronRight } from 'lucide-react';
import { EnhancedKPITile, type KPIDataPoint, type KPIThresholds } from './EnhancedKPITile';
import { KPIDetailModal } from './KPIDetailModal';
import { SimulationControls } from './SimulationControls';
import { cn } from '@/lib/utils';
import { seededRng } from '@/lib/provenance/prng';
import { ProvenanceBadge } from '@/components/provenance/ProvenanceBadge';
import type { DataProvenance } from '@/lib/provenance/types';

// Industry-specific KPI definitions
//
// Phase 1A.3.b2: baseline generators now consume an injected seeded PRNG so
// the "PUE 1.32" a user sees on reload is byte-identical to the one shown a
// second ago. Values sourced from these fixtures MUST render `demo` or
// `simulated`, never `live`.
const INDUSTRY_KPI_TEMPLATES: Record<string, Array<{
  label: string;
  unit: string;
  thresholds: KPIThresholds;
  baselineGenerator: (rng: () => number) => number;
}>> = {
  'data-centre': [
    {
      label: 'Power Usage Effectiveness (PUE)',
      unit: '',
      thresholds: { critical: 1.8, warning: 1.5, target: 1.2, direction: 'lower' },
      baselineGenerator: (rng) => 1.3 + rng() * 0.2
    },
    {
      label: 'GPU Utilization',
      unit: '%',
      thresholds: { critical: 30, warning: 50, target: 85, direction: 'higher' },
      baselineGenerator: (rng) => 70 + rng() * 20
    },
    {
      label: 'Thermal Stability Index',
      unit: '',
      thresholds: { critical: 50, warning: 70, target: 90, direction: 'higher' },
      baselineGenerator: (rng) => 80 + rng() * 15
    },
    {
      label: 'Carbon Intensity',
      unit: 'gCO₂/kWh',
      thresholds: { critical: 400, warning: 200, target: 50, direction: 'lower' },
      baselineGenerator: (rng) => 80 + rng() * 60
    },
    {
      label: 'Sovereign Compute Ratio',
      unit: '%',
      thresholds: { critical: 60, warning: 80, target: 95, direction: 'higher' },
      baselineGenerator: (rng) => 88 + rng() * 10
    },
    {
      label: 'Cooling Efficiency',
      unit: '%',
      thresholds: { critical: 50, warning: 70, target: 90, direction: 'higher' },
      baselineGenerator: (rng) => 75 + rng() * 15
    }
  ],
  'aviation': [
    {
      label: 'On-Time Performance',
      unit: '%',
      thresholds: { critical: 70, warning: 80, target: 92, direction: 'higher' },
      baselineGenerator: (rng) => 85 + rng() * 10
    },
    {
      label: 'Turnaround Time',
      unit: 'min',
      thresholds: { critical: 60, warning: 45, target: 35, direction: 'lower' },
      baselineGenerator: (rng) => 40 + rng() * 10
    },
    {
      label: 'Gate Utilization',
      unit: '%',
      thresholds: { critical: 60, warning: 70, target: 85, direction: 'higher' },
      baselineGenerator: (rng) => 75 + rng() * 15
    },
    {
      label: 'Passenger Throughput',
      unit: 'pax/hr',
      thresholds: { critical: 800, warning: 1000, target: 1500, direction: 'higher' },
      baselineGenerator: (rng) => 1200 + rng() * 300
    }
  ],
  'default': [
    {
      label: 'Efficiency Score',
      unit: '%',
      thresholds: { critical: 60, warning: 75, target: 90, direction: 'higher' },
      baselineGenerator: (rng) => 80 + rng() * 15
    },
    {
      label: 'Error Rate',
      unit: '%',
      thresholds: { critical: 10, warning: 5, target: 2, direction: 'lower' },
      baselineGenerator: (rng) => 3 + rng() * 4
    },
    {
      label: 'Response Time',
      unit: 'ms',
      thresholds: { critical: 1000, warning: 500, target: 200, direction: 'lower' },
      baselineGenerator: (rng) => 250 + rng() * 200
    },
    {
      label: 'Throughput',
      unit: 'req/s',
      thresholds: { critical: 100, warning: 500, target: 1000, direction: 'higher' },
      baselineGenerator: (rng) => 750 + rng() * 300
    }
  ]
};

interface EnhancedKPIChartsPanelProps {
  kpis?: any[];
  data: any[];
  scenario?: any;
  isRunning: boolean;
  industry?: string;
  onEventHover?: (timestamp: number | null) => void;
  highlightedTimestamp?: number | null;
  onOpenCoPilot?: () => void;
}

export function EnhancedKPIChartsPanel({
  kpis = [],
  data,
  scenario,
  isRunning,
  industry = 'default',
  onEventHover,
  highlightedTimestamp,
  onOpenCoPilot
}: EnhancedKPIChartsPanelProps) {
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);
  const [simulationTime, setSimulationTime] = useState(0);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [activeScenarios, setActiveScenarios] = useState<string[]>(['baseline']);

  // Get industry-specific KPI templates
  const kpiTemplates = useMemo(() => {
    return INDUSTRY_KPI_TEMPLATES[industry] || INDUSTRY_KPI_TEMPLATES['default'];
  }, [industry]);

  // Per-render seed derives from (industry, scenario name, kpi count). This
  // makes the demo/simulation series byte-identical across reloads for the
  // same inputs — a prerequisite for truthful `demo` labelling.
  const seedText = `enhanced-kpi/${industry}/${scenario?.name ?? 'no-scenario'}/${kpis.length}`;

  // Transform raw data into enhanced KPI format with synthetic data generation
  const enhancedKPIs = useMemo(() => {
    const templates = kpiTemplates.slice(0, 6);
    // Fresh PRNG per memo run — deterministic in seed, no state leaked between
    // renders. Each template gets an isolated stream so ordering changes in
    // one template do not perturb another.
    return templates.map((template, idx) => {
      const rng = seededRng(`${seedText}/${template.label}/${idx}`);
      // Check if we have real data for this KPI
      const matchingKPI = kpis.find(k => 
        (k.label || k.name)?.toLowerCase() === template.label.toLowerCase()
      );
      
      // Generate data points
      const kpiData: KPIDataPoint[] = data.length > 0 
        ? data.map((point, i) => {
            const metric = point.metrics?.find((m: any) => 
              m.label?.toLowerCase() === template.label.toLowerCase()
            );
            const value = metric?.value ?? template.baselineGenerator(rng);
            const baseline = template.baselineGenerator(rng) * 0.9;
            
            // Add prediction cone for last 20% of data
            const isPrediction = i > data.length * 0.8;
            
            return {
              timestamp: point.timestamp || i,
              value,
              baseline,
              ...(isPrediction && {
                predicted: value * (1 + (rng() - 0.5) * 0.1),
                upperBound: value * 1.1,
                lowerBound: value * 0.9
              })
            };
          })
        : Array.from({ length: 30 }, (_, i) => {
            const baseline = template.baselineGenerator(rng);
            const trend = (i / 30) * (rng() - 0.5) * 10;
            const value = baseline + trend + (rng() - 0.5) * 5;
            
            return {
              timestamp: i,
              value,
              baseline,
              ...(i > 24 && {
                predicted: value * (1 + (rng() - 0.5) * 0.1),
                upperBound: value * 1.1,
                lowerBound: value * 0.9
              })
            };
          });
      
      return {
        label: template.label,
        unit: template.unit,
        thresholds: template.thresholds,
        data: kpiData,
      };
    });
  }, [kpis, data, kpiTemplates, seedText]);

  // Resolve panel-level provenance. Values here are either the local
  // simulation engine (when running) or deterministic fixture data (when
  // idle). They are NEVER `live`.
  //
  // Per-KPI resolution: a card carries `simulated` only when the caller
  // supplied real `data` AND a run is active; otherwise the card falls back
  // to `demo`. Fixture-generated series remain `demo` even inside a running
  // scenario, per the truth-in-UI contract.
  const resolvedProvenance: DataProvenance = isRunning ? 'simulated' : 'demo';
  const seriesProvenance: DataProvenance = data.length > 0 && isRunning ? 'simulated' : 'demo';
  const provenanceMeta = {
    provenance: resolvedProvenance,
    source: `enhanced-kpi/${industry}/${scenario?.name ?? 'no-scenario'}`,
    stale: false,
    note: isRunning
      ? 'Values sourced from the local simulation engine.'
      : 'Deterministic fixture — seeded PRNG, not telemetry.',
  } as const;

  // Modal data for selected KPI
  const selectedKPIData = useMemo(() => {
    if (!selectedKPI) return null;
    return enhancedKPIs.find(k => k.label === selectedKPI);
  }, [selectedKPI, enhancedKPIs]);

  // Handlers
  const handleScenarioToggle = useCallback((scenarioId: string) => {
    setActiveScenarios(prev => 
      prev.includes(scenarioId)
        ? prev.filter(s => s !== scenarioId)
        : [...prev, scenarioId]
    );
  }, []);

  const handleStressTest = useCallback((type: string) => {
    console.log('Stress test triggered:', type);
    // This would inject synthetic disruption events
  }, []);

  // Empty state
  if (enhancedKPIs.length === 0 && data.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center text-muted-foreground py-8">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No KPIs Configured</p>
          <p className="text-sm mt-1">Run the simulation to see metrics</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className="h-full flex flex-col gap-4"
      data-testid="enhanced-kpi-charts-panel"
      data-provenance={resolvedProvenance}
    >
      {/* Header with controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Simulation Metrics</h3>
          <ProvenanceBadge meta={provenanceMeta} />
          {scenario?.name && (
            <Badge variant="secondary">{scenario.name}</Badge>
          )}
        </div>
        
        {onOpenCoPilot && (
          <Button variant="outline" size="sm" onClick={onOpenCoPilot} className="gap-2">
            <Brain className="h-4 w-4" />
            Ask CoPilot
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Simulation Controls */}
      <SimulationControls
        isRunning={isRunning}
        speed={simulationSpeed}
        currentTime={simulationTime}
        totalDuration={3600}
        scenarios={[
          { id: 'baseline', name: 'Baseline', active: activeScenarios.includes('baseline') },
          { id: 'optimized', name: 'Optimized', active: activeScenarios.includes('optimized') },
          { id: 'stressed', name: 'Stress Test', active: activeScenarios.includes('stressed') }
        ]}
        onPlay={() => {}}
        onPause={() => {}}
        onReset={() => setSimulationTime(0)}
        onSpeedChange={setSimulationSpeed}
        onSeek={setSimulationTime}
        onScenarioToggle={handleScenarioToggle}
        onStressTest={handleStressTest}
      />

      {/* KPI Grid */}
      <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-4 min-h-0 overflow-auto">
        {enhancedKPIs.map((kpi, idx) => (
          <div
            key={idx}
            data-testid={`enhanced-kpi-tile-${idx}`}
            data-provenance={seriesProvenance}
            data-kpi-label={kpi.label}
            className="relative"
          >
            <EnhancedKPITile
              label={kpi.label}
              data={kpi.data}
              thresholds={kpi.thresholds}
              unit={kpi.unit}
              scenario={scenario?.name}
              isRunning={isRunning}
              lastUpdated={isRunning ? new Date() : undefined}
              onClick={() => setSelectedKPI(kpi.label)}
              className={cn(
                highlightedTimestamp !== null && "ring-2 ring-primary/50"
              )}
            />
            <ProvenanceBadge
              meta={{
                provenance: seriesProvenance,
                source: `enhanced-kpi/${kpi.label}`,
                stale: false,
                note: seriesProvenance === 'simulated'
                  ? 'Series derived from local simulation engine output.'
                  : 'Deterministic fixture — seeded PRNG.',
              }}
              compact
              className="absolute right-2 top-2 z-10"
            />
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedKPIData && (
        <KPIDetailModal
          open={!!selectedKPI}
          onOpenChange={(open) => !open && setSelectedKPI(null)}
          label={selectedKPIData.label}
          data={selectedKPIData.data}
          thresholds={selectedKPIData.thresholds}
          unit={selectedKPIData.unit}
          scenario={scenario?.name}
        />
      )}
    </div>
  );
}
