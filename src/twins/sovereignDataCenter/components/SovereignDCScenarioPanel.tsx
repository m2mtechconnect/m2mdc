/**
 * Sovereign DC Scenario Panel - Run and view simulation scenarios
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, Clock, Zap, Thermometer, DollarSign, 
  Users, Scale, AlertTriangle, Server
} from 'lucide-react';
import type { SimulationRun, SimulationType, SovereignKpis } from '@/types/sovereignDataCenterTwin';
import { cn } from '@/lib/utils';

interface SovereignDCScenarioPanelProps {
  onRunScenario: (type: SimulationType) => void;
  recentRuns: SimulationRun[];
  isRunning: boolean;
  currentScenario?: SimulationType;
}

const SCENARIO_CONFIG: Record<SimulationType, {
  label: string;
  description: string;
  icon: React.ReactNode;
  tags: string[];
  color: string;
}> = {
  gpu_overload: {
    label: 'GPU Overload',
    description: 'Simulate GPU spike during training window',
    icon: <Server className="h-4 w-4" />,
    tags: ['GPU', 'Capacity'],
    color: 'text-purple-500'
  },
  cooling_failure: {
    label: 'Cooling Failure',
    description: 'Cooling system failure in Zone B',
    icon: <Thermometer className="h-4 w-4" />,
    tags: ['Cooling', 'Emergency'],
    color: 'text-red-500'
  },
  carbon_price_shock: {
    label: 'Carbon Price Shock',
    description: 'Carbon price jumps to $200/tonne',
    icon: <DollarSign className="h-4 w-4" />,
    tags: ['Finance', 'Policy'],
    color: 'text-green-500'
  },
  new_tenant_onboarding: {
    label: 'New Tenant Onboarding',
    description: 'Major sovereign bank tenant joins',
    icon: <Users className="h-4 w-4" />,
    tags: ['Capacity', 'Revenue'],
    color: 'text-blue-500'
  },
  emissions_vs_sovereignty: {
    label: 'Emissions vs Sovereignty',
    description: 'Compare QC vs AB facility trade-offs',
    icon: <Scale className="h-4 w-4" />,
    tags: ['Policy', 'Sovereignty'],
    color: 'text-orange-500'
  },
  power_grid_outage: {
    label: 'Power Grid Outage',
    description: 'Simulate regional power disruption',
    icon: <Zap className="h-4 w-4" />,
    tags: ['Emergency', 'Power'],
    color: 'text-yellow-500'
  },
  sovereignty_violation: {
    label: 'Sovereignty Violation',
    description: 'Data leaves Canadian jurisdiction',
    icon: <AlertTriangle className="h-4 w-4" />,
    tags: ['Compliance', 'Risk'],
    color: 'text-red-600'
  },
  mixed_custom: {
    label: 'Custom Scenario',
    description: 'Configure custom parameters',
    icon: <Play className="h-4 w-4" />,
    tags: ['Custom'],
    color: 'text-gray-500'
  }
};

function formatKPIDelta(deltas: Partial<SovereignKpis>): string {
  const parts: string[] = [];
  if (deltas.sovereignComputeRatioPct !== undefined) {
    parts.push(`Sovereign: ${deltas.sovereignComputeRatioPct > 0 ? '+' : ''}${deltas.sovereignComputeRatioPct.toFixed(1)}%`);
  }
  if (deltas.effectiveAiPue !== undefined) {
    parts.push(`PUE: ${deltas.effectiveAiPue > 0 ? '+' : ''}${deltas.effectiveAiPue.toFixed(2)}`);
  }
  if (deltas.gco2PerGpuHour !== undefined) {
    parts.push(`CO₂: ${deltas.gco2PerGpuHour > 0 ? '+' : ''}${deltas.gco2PerGpuHour.toFixed(1)}g`);
  }
  return parts.slice(0, 2).join(' • ') || 'No changes';
}

export function SovereignDCScenarioPanel({ 
  onRunScenario, 
  recentRuns, 
  isRunning,
  currentScenario 
}: SovereignDCScenarioPanelProps) {
  const scenarios: SimulationType[] = [
    'gpu_overload',
    'cooling_failure', 
    'carbon_price_shock',
    'new_tenant_onboarding',
    'emissions_vs_sovereignty',
    'power_grid_outage'
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Scenario Buttons */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Run Scenario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {scenarios.map((type) => {
            const config = SCENARIO_CONFIG[type];
            const isActive = isRunning && currentScenario === type;
            
            return (
              <Button
                key={type}
                variant="outline"
                className={cn(
                  "w-full justify-start gap-3 h-auto py-3",
                  isActive && "border-primary bg-primary/5"
                )}
                onClick={() => onRunScenario(type)}
                disabled={isRunning}
              >
                <div className={cn("p-1.5 rounded bg-muted", config.color)}>
                  {config.icon}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm">{config.label}</div>
                  <div className="text-xs text-muted-foreground">{config.description}</div>
                </div>
                <div className="flex gap-1">
                  {config.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* Recent Runs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Simulations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {recentRuns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No simulations run yet. Select a scenario to begin.
              </div>
            ) : (
              <div className="space-y-2">
                {recentRuns.map((run) => {
                  const config = SCENARIO_CONFIG[run.type];
                  return (
                    <div
                      key={run.id}
                      className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={config.color}>{config.icon}</span>
                          <span className="font-medium text-sm">{run.name}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {run.status || 'completed'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {run.resultsSummary}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {formatKPIDelta(run.kpiDeltas)}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(run.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
