/**
 * Enhanced Simulation Comparison Mode
 * Radar chart, bar delta view, AI summary, and impact badges
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  GitCompare, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ArrowRight,
  BarChart3,
  Radar,
  Sparkles,
  Award
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

interface EnhancedComparisonModeProps {
  availableRuns?: SimulationRunMetrics[];
  className?: string;
}

// Mock runs for demo
const MOCK_RUNS: SimulationRunMetrics[] = [
  {
    runId: 'run-1',
    scenarioId: 'gpu-spike',
    scenarioName: 'GPU Spike Scenario',
    startTime: new Date(Date.now() - 3600000),
    durationSeconds: 300,
    kpiSnapshots: [],
    kpiDeltas: [],
    anomalies: [],
    forecasts: [],
    events: [],
    thresholdBreaches: [],
    impactScores: [],
    overallImpactScore: 35,
  },
  {
    runId: 'run-2',
    scenarioId: 'cooling-failure',
    scenarioName: 'Cooling Failure Scenario',
    startTime: new Date(Date.now() - 7200000),
    durationSeconds: 300,
    kpiSnapshots: [],
    kpiDeltas: [],
    anomalies: [],
    forecasts: [],
    events: [],
    thresholdBreaches: [],
    impactScores: [],
    overallImpactScore: -45,
  },
  {
    runId: 'run-3',
    scenarioId: 'power-optimization',
    scenarioName: 'Power Optimization',
    startTime: new Date(Date.now() - 10800000),
    durationSeconds: 300,
    kpiSnapshots: [],
    kpiDeltas: [],
    anomalies: [],
    forecasts: [],
    events: [],
    thresholdBreaches: [],
    impactScores: [],
    overallImpactScore: 55,
  },
];

// Generate mock KPI values for comparison
const generateMockKpis = (runId: string): Record<string, number> => {
  const seed = runId.charCodeAt(runId.length - 1);
  return {
    pue: 1.2 + (seed % 10) * 0.05,
    gpuUtilization: 60 + (seed % 40),
    thermalStabilityScore: 70 + (seed % 30),
    coolingEfficiencyIndex: 75 + (seed % 25),
    emissionsVsTarget: -10 + (seed % 30),
    sovereignComplianceScore: 90 + (seed % 10),
  };
};

export function EnhancedComparisonMode({ availableRuns, className }: EnhancedComparisonModeProps) {
  const runs = availableRuns?.length ? availableRuns : MOCK_RUNS;
  const [runA, setRunA] = useState<string>(runs[0]?.runId || '');
  const [runB, setRunB] = useState<string>(runs[1]?.runId || '');
  const [activeView, setActiveView] = useState('table');

  const selectedA = runs.find(r => r.runId === runA);
  const selectedB = runs.find(r => r.runId === runB);

  const kpisA = useMemo(() => generateMockKpis(runA), [runA]);
  const kpisB = useMemo(() => generateMockKpis(runB), [runB]);

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

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitCompare className="h-4 w-4 text-primary" />
            Scenario Comparison
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            Enterprise Compare
          </Badge>
        </div>

        {/* Run Selectors */}
        <div className="flex items-center gap-3 pt-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Scenario A</label>
            <Select value={runA} onValueChange={setRunA}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select run A" />
              </SelectTrigger>
              <SelectContent>
                {runs.map(run => (
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
                {runs.map(run => (
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
