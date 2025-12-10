/**
 * Simulation Comparison Mode
 * Compare Simulation A vs Simulation B side-by-side
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  GitCompare, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ArrowRight,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimulationRun {
  id: string;
  name: string;
  scenario: string;
  timestamp: Date;
  kpis: Record<string, number>;
  events: number;
  duration: number;
}

interface SimulationComparisonModeProps {
  availableRuns: SimulationRun[];
  className?: string;
}

const KPI_LABELS: Record<string, { label: string; unit: string; lowerBetter?: boolean }> = {
  pue: { label: 'PUE', unit: '', lowerBetter: true },
  gpuUtilization: { label: 'GPU Utilization', unit: '%' },
  thermalScore: { label: 'Thermal Stability', unit: '%' },
  carbonIntensity: { label: 'Carbon Intensity', unit: 'kg/MWh', lowerBetter: true },
  uptime: { label: 'Uptime', unit: '%' },
  coolingEfficiency: { label: 'Cooling Efficiency', unit: '%' },
};

// Mock runs for demo
const MOCK_RUNS: SimulationRun[] = [
  {
    id: 'run-1',
    name: 'GPU Spike Scenario',
    scenario: 'gpu-spike',
    timestamp: new Date(Date.now() - 3600000),
    kpis: { pue: 1.42, gpuUtilization: 94, thermalScore: 78, carbonIntensity: 28, uptime: 99.2, coolingEfficiency: 82 },
    events: 12,
    duration: 300
  },
  {
    id: 'run-2',
    name: 'Cooling Failure Scenario',
    scenario: 'cooling-failure',
    timestamp: new Date(Date.now() - 7200000),
    kpis: { pue: 1.58, gpuUtilization: 65, thermalScore: 45, carbonIntensity: 35, uptime: 97.8, coolingEfficiency: 55 },
    events: 24,
    duration: 300
  },
  {
    id: 'run-3',
    name: 'Power Grid Instability',
    scenario: 'power-instability',
    timestamp: new Date(Date.now() - 10800000),
    kpis: { pue: 1.48, gpuUtilization: 72, thermalScore: 85, carbonIntensity: 32, uptime: 98.5, coolingEfficiency: 78 },
    events: 18,
    duration: 300
  },
];

export function SimulationComparisonMode({ availableRuns, className }: SimulationComparisonModeProps) {
  const runs = availableRuns?.length ? availableRuns : MOCK_RUNS;
  const [runA, setRunA] = useState<string>(runs[0]?.id || '');
  const [runB, setRunB] = useState<string>(runs[1]?.id || '');

  const selectedA = runs.find(r => r.id === runA);
  const selectedB = runs.find(r => r.id === runB);

  const getDelta = (kpi: string) => {
    if (!selectedA || !selectedB) return null;
    const valueA = selectedA.kpis[kpi] || 0;
    const valueB = selectedB.kpis[kpi] || 0;
    return valueB - valueA;
  };

  const getDeltaStatus = (kpi: string, delta: number) => {
    if (delta === 0) return 'neutral';
    const config = KPI_LABELS[kpi];
    if (config?.lowerBetter) {
      return delta < 0 ? 'better' : 'worse';
    }
    return delta > 0 ? 'better' : 'worse';
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitCompare className="h-4 w-4 text-primary" />
            Simulation Comparison
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            Compare Mode
          </Badge>
        </div>

        {/* Run Selectors */}
        <div className="flex items-center gap-3 pt-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Simulation A</label>
            <Select value={runA} onValueChange={setRunA}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select run A" />
              </SelectTrigger>
              <SelectContent>
                {runs.map(run => (
                  <SelectItem key={run.id} value={run.id} className="text-xs">
                    {run.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <ArrowRight className="h-4 w-4 text-muted-foreground mt-4" />
          
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Simulation B</label>
            <Select value={runB} onValueChange={setRunB}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select run B" />
              </SelectTrigger>
              <SelectContent>
                {runs.map(run => (
                  <SelectItem key={run.id} value={run.id} className="text-xs">
                    {run.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {selectedA && selectedB ? (
          <div className="space-y-4">
            {/* KPI Comparison Table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 font-medium">KPI</th>
                    <th className="text-right p-2 font-medium">Run A</th>
                    <th className="text-right p-2 font-medium">Run B</th>
                    <th className="text-right p-2 font-medium">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(KPI_LABELS).map(([key, config]) => {
                    const delta = getDelta(key);
                    const status = delta !== null ? getDeltaStatus(key, delta) : 'neutral';
                    
                    return (
                      <tr key={key} className="border-t border-border">
                        <td className="p-2 font-medium">{config.label}</td>
                        <td className="p-2 text-right font-mono">
                          {selectedA.kpis[key]?.toFixed(1)}{config.unit}
                        </td>
                        <td className="p-2 text-right font-mono">
                          {selectedB.kpis[key]?.toFixed(1)}{config.unit}
                        </td>
                        <td className="p-2 text-right">
                          <span className={cn(
                            "flex items-center justify-end gap-1 font-mono",
                            status === 'better' && "text-success",
                            status === 'worse' && "text-destructive",
                            status === 'neutral' && "text-muted-foreground"
                          )}>
                            {status === 'better' && <TrendingUp className="h-3 w-3" />}
                            {status === 'worse' && <TrendingDown className="h-3 w-3" />}
                            {status === 'neutral' && <Minus className="h-3 w-3" />}
                            {delta !== null && (
                              <span>
                                {delta > 0 ? '+' : ''}{delta.toFixed(1)}{config.unit}
                              </span>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <div className="text-xs text-muted-foreground">Events (A → B)</div>
                <div className="text-lg font-semibold">
                  {selectedA.events} → {selectedB.events}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <div className="text-xs text-muted-foreground">Overall Impact</div>
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-lg font-semibold">
                    {Object.keys(KPI_LABELS).filter(k => {
                      const d = getDelta(k);
                      return d !== null && getDeltaStatus(k, d) === 'better';
                    }).length}/{Object.keys(KPI_LABELS).length} improved
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Select two simulation runs to compare
          </div>
        )}
      </CardContent>
    </Card>
  );
}
