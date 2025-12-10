/**
 * Scenario Enhancements Panel
 * Complexity score, multi-scenario chaining, KPI delta visualization
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Layers, 
  Gauge, 
  Link2, 
  TrendingDown,
  TrendingUp,
  Play,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScenarioDefinition {
  id: string;
  name: string;
  complexity: 'low' | 'medium' | 'high' | 'catastrophic';
  kpisAffected: number;
  estimatedDuration: number;
  category: string;
  kpiDeltas: { kpi: string; delta: number }[];
}

interface ScenarioEnhancementsPanelProps {
  scenarios?: ScenarioDefinition[];
  onRunChain?: (scenarioIds: string[]) => void;
  className?: string;
}

const COMPLEXITY_CONFIG = {
  low: { label: 'Low', color: 'bg-success text-success-foreground', score: 1 },
  medium: { label: 'Medium', color: 'bg-info text-info-foreground', score: 2 },
  high: { label: 'High', color: 'bg-warning text-warning-foreground', score: 3 },
  catastrophic: { label: 'Catastrophic', color: 'bg-destructive text-destructive-foreground', score: 4 },
};

// Mock scenarios
const MOCK_SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'gpu-spike',
    name: 'GPU Utilization Spike',
    complexity: 'medium',
    kpisAffected: 4,
    estimatedDuration: 300,
    category: 'Workload',
    kpiDeltas: [
      { kpi: 'PUE', delta: 8 },
      { kpi: 'Thermal', delta: -15 },
      { kpi: 'GPU Util', delta: 35 },
      { kpi: 'Carbon', delta: 12 },
    ]
  },
  {
    id: 'cooling-failure',
    name: 'CRAH Unit Failure',
    complexity: 'high',
    kpisAffected: 6,
    estimatedDuration: 600,
    category: 'Thermal',
    kpiDeltas: [
      { kpi: 'PUE', delta: 22 },
      { kpi: 'Thermal', delta: -45 },
      { kpi: 'Uptime', delta: -3 },
      { kpi: 'Cooling Eff', delta: -35 },
    ]
  },
  {
    id: 'power-instability',
    name: 'Grid Power Fluctuation',
    complexity: 'catastrophic',
    kpisAffected: 8,
    estimatedDuration: 900,
    category: 'Power',
    kpiDeltas: [
      { kpi: 'PUE', delta: 35 },
      { kpi: 'Uptime', delta: -8 },
      { kpi: 'UPS Load', delta: 85 },
    ]
  },
  {
    id: 'sovereignty-breach',
    name: 'Data Routing Violation',
    complexity: 'high',
    kpisAffected: 3,
    estimatedDuration: 180,
    category: 'Sovereignty',
    kpiDeltas: [
      { kpi: 'Compliance', delta: -25 },
      { kpi: 'Sovereign %', delta: -15 },
    ]
  },
  {
    id: 'carbon-spike',
    name: 'Carbon Intensity Surge',
    complexity: 'low',
    kpisAffected: 2,
    estimatedDuration: 120,
    category: 'Carbon',
    kpiDeltas: [
      { kpi: 'Carbon', delta: 40 },
      { kpi: 'Renewable %', delta: -20 },
    ]
  },
];

export function ScenarioEnhancementsPanel({ 
  scenarios,
  onRunChain,
  className 
}: ScenarioEnhancementsPanelProps) {
  const data = scenarios || MOCK_SCENARIOS;
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);

  const toggleScenario = (id: string) => {
    setSelectedScenarios(prev => 
      prev.includes(id) 
        ? prev.filter(s => s !== id)
        : [...prev, id]
    );
  };

  const getChainComplexity = () => {
    if (selectedScenarios.length === 0) return null;
    const totalScore = selectedScenarios.reduce((sum, id) => {
      const scenario = data.find(s => s.id === id);
      return sum + (scenario ? COMPLEXITY_CONFIG[scenario.complexity].score : 0);
    }, 0);
    
    if (totalScore >= 8) return 'catastrophic';
    if (totalScore >= 5) return 'high';
    if (totalScore >= 3) return 'medium';
    return 'low';
  };

  const chainComplexity = getChainComplexity();

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m`;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4 text-primary" />
            Scenario Chain Simulator
          </CardTitle>
          {selectedScenarios.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {selectedScenarios.length} selected
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Chain Summary */}
        {selectedScenarios.length > 0 && (
          <div className="mb-3 p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Chain Configuration
              </span>
              {chainComplexity && (
                <Badge className={cn("text-xs", COMPLEXITY_CONFIG[chainComplexity].color)}>
                  <Gauge className="h-3 w-3 mr-1" />
                  {COMPLEXITY_CONFIG[chainComplexity].label} Risk
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {selectedScenarios.map((id, i) => (
                <React.Fragment key={id}>
                  <span className="px-2 py-0.5 bg-background rounded">
                    {data.find(s => s.id === id)?.name}
                  </span>
                  {i < selectedScenarios.length - 1 && (
                    <Zap className="h-3 w-3 text-warning" />
                  )}
                </React.Fragment>
              ))}
            </div>
            <Button 
              onClick={() => onRunChain?.(selectedScenarios)}
              size="sm"
              className="w-full mt-2"
            >
              <Play className="h-3 w-3 mr-2" />
              Run Chain Simulation
            </Button>
          </div>
        )}

        {/* Scenario List */}
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {data.map((scenario) => (
              <div 
                key={scenario.id}
                className={cn(
                  "p-3 rounded-lg border transition-colors cursor-pointer",
                  selectedScenarios.includes(scenario.id)
                    ? "bg-primary/5 border-primary/20"
                    : "bg-muted/30 border-border hover:bg-muted/50"
                )}
                onClick={() => toggleScenario(scenario.id)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedScenarios.includes(scenario.id)}
                    onCheckedChange={() => toggleScenario(scenario.id)}
                    className="mt-0.5"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{scenario.name}</span>
                      <Badge className={cn("text-[10px] h-4", COMPLEXITY_CONFIG[scenario.complexity].color)}>
                        {COMPLEXITY_CONFIG[scenario.complexity].label}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      <span>{scenario.category}</span>
                      <span>•</span>
                      <span>{scenario.kpisAffected} KPIs affected</span>
                      <span>•</span>
                      <span>{formatDuration(scenario.estimatedDuration)}</span>
                    </div>
                    
                    {/* KPI Deltas */}
                    <div className="flex flex-wrap gap-1">
                      {scenario.kpiDeltas.map((delta, i) => (
                        <Badge 
                          key={i}
                          variant="outline"
                          className={cn(
                            "text-[10px] h-4",
                            delta.delta > 0 ? "text-destructive" : "text-success"
                          )}
                        >
                          {delta.delta > 0 ? (
                            <TrendingUp className="h-2 w-2 mr-0.5" />
                          ) : (
                            <TrendingDown className="h-2 w-2 mr-0.5" />
                          )}
                          {delta.kpi}: {delta.delta > 0 ? '+' : ''}{delta.delta}%
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Warning for high complexity chains */}
        {chainComplexity === 'catastrophic' && (
          <div className="mt-3 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">
                This chain has catastrophic complexity. Results may show severe KPI degradation.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
