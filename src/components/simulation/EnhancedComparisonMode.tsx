/**
 * Enhanced Simulation Comparison Mode
 * Radar chart, bar delta view, AI summary, and impact badges
 * Now loads historical runs from database when no runs provided
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  GitCompare, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ArrowRight,
  BarChart3,
  Radar,
  Sparkles,
  Award,
  RefreshCw,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as RechartsRadar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import type { SimulationRunMetrics } from '@/simulation/types';
import { DEFAULT_KPI_CONFIGS } from '@/engines/kpi/KPIOverlayEngine';
import { useHistoricalSimulationRuns, type SimulationRunForComparison } from '@/hooks/useHistoricalSimulationRuns';

interface EnhancedComparisonModeProps {
  availableRuns?: SimulationRunMetrics[];
  className?: string;
  useHistorical?: boolean; // If true, loads from database
}

// Industry-accurate simulation runs based on real DC operational scenarios
const INDUSTRY_RUNS: SimulationRunMetrics[] = [
  {
    runId: 'run-gpu-burst',
    scenarioId: 'gpu-training-burst',
    scenarioName: 'GPU Training Burst (38% Spike)',
    startTime: new Date(Date.now() - 3600000),
    durationSeconds: 300,
    kpiSnapshots: [],
    kpiDeltas: [],
    anomalies: [],
    forecasts: [],
    events: [],
    thresholdBreaches: [],
    impactScores: [],
    overallImpactScore: 28, // Based on thermal stress + carbon increase
  },
  {
    runId: 'run-cooling-degrade',
    scenarioId: 'crah-partial-failure',
    scenarioName: 'CRAH Partial Failure (Zone B)',
    startTime: new Date(Date.now() - 7200000),
    durationSeconds: 300,
    kpiSnapshots: [],
    kpiDeltas: [],
    anomalies: [],
    forecasts: [],
    events: [],
    thresholdBreaches: [],
    impactScores: [],
    overallImpactScore: -38, // Thermal degradation impact
  },
  {
    runId: 'run-carbon-shock',
    scenarioId: 'carbon-price-shock',
    scenarioName: 'Carbon Price Shock ($180/tonne)',
    startTime: new Date(Date.now() - 10800000),
    durationSeconds: 300,
    kpiSnapshots: [],
    kpiDeltas: [],
    anomalies: [],
    forecasts: [],
    events: [],
    thresholdBreaches: [],
    impactScores: [],
    overallImpactScore: 42, // Green DC advantage
  },
];

// Generate industry-accurate KPI values based on scenario type
const generateIndustryKpis = (runId: string): Record<string, number> => {
  // Use scenario-specific baselines from industry standards
  const baselineKpis: Record<string, Record<string, number>> = {
    'run-gpu-burst': {
      pue: 1.32, // Elevated due to GPU load (baseline 1.25 + thermal stress)
      gpuUtilization: 94, // Near saturation
      thermalStabilityScore: 72, // Degraded from thermal stress
      coolingEfficiencyIndex: 78, // Working harder
      emissionsVsTarget: 7, // 7% over target due to power surge
      sovereignComplianceScore: 100, // No sovereignty impact
    },
    'run-cooling-degrade': {
      pue: 1.41, // Significant degradation (ASHRAE thermal runaway)
      gpuUtilization: 68, // Throttled due to thermal limits
      thermalStabilityScore: 54, // Major thermal instability
      coolingEfficiencyIndex: 52, // Partial failure impact
      emissionsVsTarget: 12, // Carbon increase from inefficiency
      sovereignComplianceScore: 100, // No sovereignty impact
    },
    'run-carbon-shock': {
      pue: 1.25, // Normal operation
      gpuUtilization: 76, // Standard utilization
      thermalStabilityScore: 92, // Stable thermal
      coolingEfficiencyIndex: 88, // Efficient cooling
      emissionsVsTarget: -15, // Quebec hydro advantage (35g vs 400g AB)
      sovereignComplianceScore: 100, // Full Canadian sovereignty
    },
  };
  
  return baselineKpis[runId] || {
    pue: 1.27, // Montreal green DC baseline
    gpuUtilization: 72, // Industry average
    thermalStabilityScore: 88, // ASHRAE compliant
    coolingEfficiencyIndex: 85, // Liquid cooling efficiency
    emissionsVsTarget: -8, // Below target (green power)
    sovereignComplianceScore: 100, // Full sovereignty
  };
};

export function EnhancedComparisonMode({ availableRuns, className, useHistorical = true }: EnhancedComparisonModeProps) {
  // Load historical runs from database if enabled
  const { runs: historicalRuns, isLoading, error, refetch } = useHistoricalSimulationRuns({ limit: 20 });
  
  // Merge provided runs with historical ones, or use industry defaults
  const allRuns = useMemo(() => {
    if (availableRuns?.length) {
      // Map availableRuns to comparison format
      return availableRuns.map(r => ({
        id: r.runId,
        runId: r.runId,
        scenarioId: r.scenarioId,
        scenarioName: r.scenarioName,
        startTime: r.startTime,
        durationSeconds: r.durationSeconds,
        status: 'completed',
        createdAt: r.startTime,
        baselineKpis: {} as Record<string, number>,
        finalKpis: {} as Record<string, number>,
        eventsCount: r.events?.length || 0,
        overallImpactScore: r.overallImpactScore,
      }));
    }
    if (useHistorical && historicalRuns.length > 0) {
      return historicalRuns;
    }
    // Fallback to industry mock runs
    return INDUSTRY_RUNS.map(r => ({
      id: r.runId,
      runId: r.runId,
      scenarioId: r.scenarioId,
      scenarioName: r.scenarioName,
      startTime: r.startTime,
      durationSeconds: r.durationSeconds,
      status: 'completed',
      createdAt: r.startTime,
      baselineKpis: generateIndustryKpis(r.runId),
      finalKpis: generateIndustryKpis(r.runId),
      eventsCount: 0,
      overallImpactScore: r.overallImpactScore,
    }));
  }, [availableRuns, useHistorical, historicalRuns]);
  
  const [runA, setRunA] = useState<string>('');
  const [runB, setRunB] = useState<string>('');
  const [activeView, setActiveView] = useState('table');
  
  // Initialize selects when runs load
  useMemo(() => {
    if (allRuns.length >= 2 && !runA && !runB) {
      setRunA(allRuns[0]?.runId || '');
      setRunB(allRuns[1]?.runId || '');
    }
  }, [allRuns, runA, runB]);

  const selectedA = allRuns.find(r => r.runId === runA);
  const selectedB = allRuns.find(r => r.runId === runB);

  // Use actual final KPIs from runs or fallback to generated
  const kpisA = useMemo(() => {
    if (selectedA && Object.keys(selectedA.finalKpis).length > 0) {
      return selectedA.finalKpis;
    }
    return generateIndustryKpis(runA);
  }, [runA, selectedA]);
  
  const kpisB = useMemo(() => {
    if (selectedB && Object.keys(selectedB.finalKpis).length > 0) {
      return selectedB.finalKpis;
    }
    return generateIndustryKpis(runB);
  }, [runB, selectedB]);

  // Prepare radar chart data
  const radarData = useMemo(() => {
    return Object.keys(DEFAULT_KPI_CONFIGS).map(kpiId => {
      const config = DEFAULT_KPI_CONFIGS[kpiId];
      // Normalize values to 0-100 scale
      const normalize = (value: number) => {
        if (config.lowerIsBetter) {
          return Math.max(0, 100 - (value - config.target) * 50);
        }
        return Math.min(100, (value / config.target) * 100);
      };

      return {
        kpi: config.name.slice(0, 10),
        fullName: config.name,
        A: normalize(kpisA[kpiId] ?? 0),
        B: normalize(kpisB[kpiId] ?? 0),
      };
    });
  }, [kpisA, kpisB]);

  // Prepare bar chart data
  const barData = useMemo(() => {
    return Object.keys(DEFAULT_KPI_CONFIGS).map(kpiId => {
      const config = DEFAULT_KPI_CONFIGS[kpiId];
      const valueA = kpisA[kpiId] ?? 0;
      const valueB = kpisB[kpiId] ?? 0;
      const delta = valueB - valueA;
      const isImprovement = config.lowerIsBetter ? delta < 0 : delta > 0;

      return {
        kpi: config.name.slice(0, 12),
        fullName: config.name,
        delta,
        isImprovement,
        unit: config.unit,
      };
    });
  }, [kpisA, kpisB]);

  // Generate AI summary
  const aiSummary = useMemo(() => {
    if (!selectedA || !selectedB) return null;

    const improvements = barData.filter(d => d.isImprovement).length;
    const degradations = barData.length - improvements;
    
    let verdict = '';
    if (improvements > degradations + 1) {
      verdict = `**${selectedB.scenarioName}** outperforms **${selectedA.scenarioName}** across most KPIs.`;
    } else if (degradations > improvements + 1) {
      verdict = `**${selectedA.scenarioName}** is the better choice with fewer negative impacts.`;
    } else {
      verdict = `Both scenarios show similar overall performance with trade-offs in different areas.`;
    }

    const topImprovement = barData.filter(d => d.isImprovement).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
    const topDegradation = barData.filter(d => !d.isImprovement).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];

    return {
      verdict,
      improvements,
      degradations,
      topImprovement,
      topDegradation,
      recommendation: improvements >= degradations 
        ? `Consider deploying ${selectedB.scenarioName} for optimal results.`
        : `${selectedA.scenarioName} offers more stability.`,
    };
  }, [selectedA, selectedB, barData]);

  // Show loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <GitCompare className="h-4 w-4 text-primary" />
              Scenario Comparison
            </CardTitle>
            <Badge variant="secondary" className="text-xs">Loading...</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitCompare className="h-4 w-4 text-primary" />
            Scenario Comparison
          </CardTitle>
          <div className="flex items-center gap-2">
            {useHistorical && (
              <Button variant="ghost" size="sm" onClick={refetch} className="h-7 gap-1.5">
                <RefreshCw className="h-3 w-3" />
                Refresh
              </Button>
            )}
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <Database className="h-3 w-3" />
              {allRuns.length} runs
            </Badge>
          </div>
        </div>
        
        {error && (
          <div className="text-xs text-destructive bg-destructive/10 p-2 rounded mt-2">
            Failed to load historical runs: {error}
          </div>
        )}

        {/* Run Selectors */}
        <div className="flex items-center gap-3 pt-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Scenario A</label>
            <Select value={runA} onValueChange={setRunA}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select run A" />
              </SelectTrigger>
              <SelectContent>
                {allRuns.map(run => (
                  <SelectItem key={run.runId} value={run.runId} className="text-xs">
                    {run.scenarioName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <ArrowRight className="h-4 w-4 text-muted-foreground mt-4" />
          
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Scenario B</label>
            <Select value={runB} onValueChange={setRunB}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select run B" />
              </SelectTrigger>
              <SelectContent>
                {allRuns.map(run => (
                  <SelectItem key={run.runId} value={run.runId} className="text-xs">
                    {run.scenarioName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {selectedA && selectedB ? (
          <Tabs value={activeView} onValueChange={setActiveView}>
            <TabsList className="grid grid-cols-4 w-full mb-4">
              <TabsTrigger value="table" className="text-xs gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                Table
              </TabsTrigger>
              <TabsTrigger value="radar" className="text-xs gap-1.5">
                <Radar className="h-3.5 w-3.5" />
                Radar
              </TabsTrigger>
              <TabsTrigger value="bars" className="text-xs gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                Delta Bars
              </TabsTrigger>
              <TabsTrigger value="ai" className="text-xs gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                AI Summary
              </TabsTrigger>
            </TabsList>

            <TabsContent value="table">
              <ScrollArea className="h-[280px]">
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2 font-medium">KPI</th>
                        <th className="text-right p-2 font-medium">Run A</th>
                        <th className="text-right p-2 font-medium">Run B</th>
                        <th className="text-right p-2 font-medium">Delta</th>
                        <th className="text-center p-2 font-medium">Impact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(DEFAULT_KPI_CONFIGS).map(kpiId => {
                        const config = DEFAULT_KPI_CONFIGS[kpiId];
                        const valueA = kpisA[kpiId] ?? 0;
                        const valueB = kpisB[kpiId] ?? 0;
                        const delta = valueB - valueA;
                        const isImprovement = config.lowerIsBetter ? delta < 0 : delta > 0;
                        const isNeutral = Math.abs(delta) < 0.5;

                        return (
                          <tr key={kpiId} className="border-t border-border">
                            <td className="p-2 font-medium">{config.name}</td>
                            <td className="p-2 text-right font-mono">
                              {valueA.toFixed(1)}{config.unit}
                            </td>
                            <td className="p-2 text-right font-mono">
                              {valueB.toFixed(1)}{config.unit}
                            </td>
                            <td className="p-2 text-right">
                              <span className={cn(
                                "flex items-center justify-end gap-1 font-mono",
                                isNeutral && "text-muted-foreground",
                                !isNeutral && isImprovement && "text-success",
                                !isNeutral && !isImprovement && "text-destructive"
                              )}>
                                {isImprovement && !isNeutral && <TrendingUp className="h-3 w-3" />}
                                {!isImprovement && !isNeutral && <TrendingDown className="h-3 w-3" />}
                                {isNeutral && <Minus className="h-3 w-3" />}
                                {delta > 0 ? '+' : ''}{delta.toFixed(1)}{config.unit}
                              </span>
                            </td>
                            <td className="p-2 text-center">
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-[9px]",
                                  isNeutral && "border-muted-foreground/30 text-muted-foreground",
                                  !isNeutral && isImprovement && "border-success/30 text-success bg-success/5",
                                  !isNeutral && !isImprovement && "border-destructive/30 text-destructive bg-destructive/5"
                                )}
                              >
                                {isNeutral ? 'Neutral' : isImprovement ? 'Better' : 'Worse'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="radar">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis 
                      dataKey="kpi" 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 100]} 
                      tick={{ fontSize: 8 }}
                    />
                    <RechartsRadar
                      name="Scenario A"
                      dataKey="A"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                    />
                    <RechartsRadar
                      name="Scenario B"
                      dataKey="B"
                      stroke="hsl(var(--success))"
                      fill="hsl(var(--success))"
                      fillOpacity={0.3}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="bars">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis 
                      type="category" 
                      dataKey="kpi" 
                      tick={{ fontSize: 10 }} 
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, name, props) => [
                        `${value > 0 ? '+' : ''}${value.toFixed(1)}${props.payload.unit}`,
                        'Delta'
                      ]}
                    />
                    <Bar dataKey="delta" radius={[0, 4, 4, 0]}>
                      {barData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.isImprovement ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="ai">
              {aiSummary && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Verdict */}
                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                    <div className="flex items-start gap-3">
                      <Award className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium mb-1">AI Analysis</h4>
                        <p className="text-sm text-muted-foreground" 
                           dangerouslySetInnerHTML={{ __html: aiSummary.verdict.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-success" />
                        <span className="text-sm font-medium text-success">Improvements</span>
                      </div>
                      <span className="text-2xl font-bold">{aiSummary.improvements}</span>
                      {aiSummary.topImprovement && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Best: {aiSummary.topImprovement.fullName}
                        </p>
                      )}
                    </div>
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingDown className="h-4 w-4 text-destructive" />
                        <span className="text-sm font-medium text-destructive">Degradations</span>
                      </div>
                      <span className="text-2xl font-bold">{aiSummary.degradations}</span>
                      {aiSummary.topDegradation && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Watch: {aiSummary.topDegradation.fullName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="p-3 rounded-lg bg-muted border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-4 w-4 text-warning" />
                      <span className="text-sm font-medium">Recommendation</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {aiSummary.recommendation}
                    </p>
                  </div>
                </motion.div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
            Select two scenarios to compare
          </div>
        )}
      </CardContent>
    </Card>
  );
}
