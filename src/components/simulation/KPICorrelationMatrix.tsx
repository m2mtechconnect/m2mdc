/**
 * KPI Correlation Matrix & Impact Engine
 * Displays correlation heatmap and KPI drivers
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GitMerge, TrendingUp, BarChart3, Zap, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { KPISnapshot, ScenarioImpactScore } from '@/simulation/types';
import { calculateCorrelationMatrix, DEFAULT_KPI_CONFIGS } from '@/engines/kpi/KPIOverlayEngine';

interface KPICorrelationMatrixProps {
  snapshots: KPISnapshot[];
  scenarioImpacts?: ScenarioImpactScore[];
  className?: string;
}

export function KPICorrelationMatrix({ 
  snapshots, 
  scenarioImpacts = [],
  className 
}: KPICorrelationMatrixProps) {
  const [activeTab, setActiveTab] = useState('matrix');

  const kpiIds = Object.keys(DEFAULT_KPI_CONFIGS);
  
  const { matrix, topDrivers } = useMemo(() => {
    return calculateCorrelationMatrix(snapshots, kpiIds);
  }, [snapshots, kpiIds]);

  // Generate mock impact data if not provided
  const impacts = useMemo(() => {
    if (scenarioImpacts.length > 0) return scenarioImpacts;
    
    return kpiIds.map(kpiId => ({
      scenarioId: 'current',
      kpiId,
      impactScore: Math.random() * 200 - 100,
      impactCategory: 'neutral' as const,
      explanation: `${DEFAULT_KPI_CONFIGS[kpiId].name} impact based on current scenario`,
    }));
  }, [scenarioImpacts, kpiIds]);

  // Calculate overall impact score
  const overallImpact = useMemo(() => {
    const positiveCount = impacts.filter(i => i.impactScore > 0).length;
    const totalImpact = impacts.reduce((sum, i) => sum + i.impactScore, 0) / impacts.length;
    return {
      score: totalImpact,
      positiveCount,
      negativeCount: impacts.length - positiveCount,
      category: totalImpact > 20 ? 'positive' : totalImpact < -20 ? 'negative' : 'neutral',
    };
  }, [impacts]);

  const getCorrelationColor = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue > 0.7) return value > 0 ? 'bg-success' : 'bg-destructive';
    if (absValue > 0.4) return value > 0 ? 'bg-success/60' : 'bg-destructive/60';
    if (absValue > 0.2) return value > 0 ? 'bg-success/30' : 'bg-destructive/30';
    return 'bg-muted';
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitMerge className="h-4 w-4 text-primary" />
            KPI Correlation & Impact
          </CardTitle>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              overallImpact.category === 'positive' ? 'text-success border-success/30' :
              overallImpact.category === 'negative' ? 'text-destructive border-destructive/30' :
              'text-muted-foreground'
            )}
          >
            Impact: {overallImpact.score > 0 ? '+' : ''}{overallImpact.score.toFixed(1)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-4">
            <TabsTrigger value="matrix" className="gap-2 text-xs">
              <BarChart3 className="h-3.5 w-3.5" />
              Correlation Matrix
            </TabsTrigger>
            <TabsTrigger value="drivers" className="gap-2 text-xs">
              <TrendingUp className="h-3.5 w-3.5" />
              Top Drivers
            </TabsTrigger>
            <TabsTrigger value="impact" className="gap-2 text-xs">
              <Zap className="h-3.5 w-3.5" />
              Scenario Impact
            </TabsTrigger>
          </TabsList>

          <TabsContent value="matrix" className="mt-0 p-4">
            <ScrollArea className="h-[300px]">
              {matrix.length > 0 ? (
                <div className="min-w-[400px]">
                  {/* Header row */}
                  <div className="flex">
                    <div className="w-24 shrink-0" />
                    {kpiIds.map(kpi => (
                      <div 
                        key={kpi} 
                        className="w-12 h-20 flex items-end justify-center pb-1"
                      >
                        <span 
                          className="text-[9px] text-muted-foreground font-medium whitespace-nowrap transform -rotate-45 origin-left"
                        >
                          {DEFAULT_KPI_CONFIGS[kpi]?.name.slice(0, 12)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Matrix rows */}
                  {matrix.map((row, i) => (
                    <div key={kpiIds[i]} className="flex items-center">
                      <div className="w-24 shrink-0 pr-2 py-1">
                        <span className="text-[10px] text-muted-foreground truncate block">
                          {DEFAULT_KPI_CONFIGS[kpiIds[i]]?.name.slice(0, 15)}
                        </span>
                      </div>
                      {row.map((value, j) => (
                        <motion.div
                          key={`${i}-${j}`}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: (i * kpiIds.length + j) * 0.01 }}
                          className={cn(
                            "w-12 h-10 flex items-center justify-center border border-border/50",
                            i === j ? "bg-muted" : getCorrelationColor(value)
                          )}
                          title={`${kpiIds[i]} ↔ ${kpiIds[j]}: ${value.toFixed(2)}`}
                        >
                          <span className="text-[10px] font-mono">
                            {i === j ? '1.0' : value.toFixed(1)}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  ))}

                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                    <span>Correlation:</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-destructive" />
                        <span>Strong -</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-muted" />
                        <span>Weak</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-success" />
                        <span>Strong +</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                  Insufficient data for correlation analysis
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="drivers" className="mt-0 p-4">
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {topDrivers.map((driver, i) => {
                  const config = DEFAULT_KPI_CONFIGS[driver.kpi];
                  const strengthPct = (driver.strength * 100).toFixed(0);
                  
                  return (
                    <motion.div
                      key={driver.kpi}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-3 rounded-lg border border-border bg-muted/30"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{config?.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {strengthPct}% explained
                        </Badge>
                      </div>
                      
                      {/* Strength bar */}
                      <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.abs(driver.strength) * 100}%` }}
                          transition={{ duration: 0.5, delay: i * 0.1 }}
                          className={cn(
                            "h-full",
                            driver.strength > 0.5 ? "bg-success" : 
                            driver.strength > 0.3 ? "bg-warning" : "bg-muted-foreground"
                          )}
                        />
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {config?.businessImpact}
                      </p>
                    </motion.div>
                  );
                })}

                {topDrivers.length === 0 && (
                  <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                    Insufficient data for driver analysis
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="impact" className="mt-0 p-4">
            <ScrollArea className="h-[300px]">
              {/* Overall Summary */}
              <div className="p-4 rounded-lg border border-border bg-muted/30 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Overall Scenario Impact</span>
                  <Badge 
                    variant="outline"
                    className={cn(
                      overallImpact.category === 'positive' ? 'text-success' :
                      overallImpact.category === 'negative' ? 'text-destructive' :
                      'text-muted-foreground'
                    )}
                  >
                    {overallImpact.score > 0 ? '+' : ''}{overallImpact.score.toFixed(1)}
                  </Badge>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="text-success">
                    {overallImpact.positiveCount} improved
                  </span>
                  <span className="text-destructive">
                    {overallImpact.negativeCount} degraded
                  </span>
                </div>
              </div>

              {/* Per-KPI Impact */}
              <div className="space-y-2">
                {impacts.map((impact, i) => {
                  const config = DEFAULT_KPI_CONFIGS[impact.kpiId];
                  const isPositive = impact.impactScore > 0;
                  
                  return (
                    <motion.div
                      key={impact.kpiId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-2 rounded border border-border"
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className={cn(
                            "w-2 h-2 rounded-full",
                            isPositive ? "bg-success" : "bg-destructive"
                          )}
                        />
                        <span className="text-sm">{config?.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all",
                              isPositive ? "bg-success" : "bg-destructive"
                            )}
                            style={{ width: `${Math.min(Math.abs(impact.impactScore), 100)}%` }}
                          />
                        </div>
                        <span className={cn(
                          "text-xs font-mono w-12 text-right",
                          isPositive ? "text-success" : "text-destructive"
                        )}>
                          {isPositive ? '+' : ''}{impact.impactScore.toFixed(0)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
