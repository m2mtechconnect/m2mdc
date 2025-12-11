/**
 * Simulation Result Panel
 * Displays comprehensive results when simulation completes
 * Includes KPI summary, RCA, recommendations, and export options
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  FileText,
  FileJson,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lightbulb,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SimulationResultSummary, SimulationKpiDelta, SimulationEvent } from '@/simulation/types';
import { motion, AnimatePresence } from 'framer-motion';
import { SIMULATION } from '@/ux';

interface SimulationResultPanelProps {
  result: SimulationResultSummary;
  onClose?: () => void;
  onDownloadJson?: () => void;
  onDownloadReport?: () => void;
  className?: string;
}

function KPIDeltaRow({ delta, index }: { delta: SimulationKpiDelta; index: number }) {
  const TrendIcon = delta.trend === 'stable' ? Minus : delta.trend === 'up' ? TrendingUp : TrendingDown;
  const change = delta.after - delta.before;
  const changePercent = delta.before !== 0 ? ((change / delta.before) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border',
        delta.isGood ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'p-1.5 rounded-md',
          delta.isGood ? 'bg-success/20' : 'bg-destructive/20'
        )}>
          <TrendIcon className={cn(
            'h-4 w-4',
            delta.isGood ? 'text-success' : 'text-destructive'
          )} />
        </div>
        <div>
          <p className="font-medium text-sm">{delta.label}</p>
          <p className="text-xs text-muted-foreground">
            {delta.before.toFixed(1)}{delta.unit} → {delta.after.toFixed(1)}{delta.unit}
          </p>
        </div>
      </div>
      <Badge variant="outline" className={cn(
        'font-mono',
        delta.isGood ? 'text-success border-success/50' : 'text-destructive border-destructive/50'
      )}>
        {change >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
      </Badge>
    </motion.div>
  );
}

function ActualVsExpectedRow({ item, index }: { 
  item: SimulationResultSummary['actualVsExpected'][0]; 
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center justify-between py-2 border-b border-border last:border-0"
    >
      <span className="text-sm text-muted-foreground">{item.metric}</span>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Expected: {item.expected}</span>
        <span className="text-sm font-medium">Actual: {item.actual}</span>
        {item.withinRange ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-warning" />
        )}
      </div>
    </motion.div>
  );
}

export function SimulationResultPanel({
  result,
  onClose,
  onDownloadJson,
  onDownloadReport,
  className,
}: SimulationResultPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'rca' | 'recommendations'>('summary');

  const goodDeltas = result.kpiDeltas.filter(d => d.isGood);
  const badDeltas = result.kpiDeltas.filter(d => !d.isGood);

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulation-result-${result.scenarioId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onDownloadJson?.();
  };

  const handleDownloadReport = () => {
    const reportContent = `# Simulation Report: ${result.scenarioName}

## Summary
- **Duration**: ${result.durationSec} seconds
- **Scenario ID**: ${result.scenarioId}
- **Events Triggered**: ${result.events.length}

## KPI Impact Summary

### Improvements
${goodDeltas.map(d => `- **${d.label}**: ${d.before.toFixed(1)} → ${d.after.toFixed(1)} ${d.unit || ''}`).join('\n')}

### Degradations
${badDeltas.map(d => `- **${d.label}**: ${d.before.toFixed(1)} → ${d.after.toFixed(1)} ${d.unit || ''}`).join('\n')}

## Root Cause Analysis
${result.rcaMarkdown}

## Recommendations
${result.recommendationsMarkdown}

---
*Report generated on ${new Date().toISOString()}*
`;
    const blob = new Blob([reportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulation-report-${result.scenarioId}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    onDownloadReport?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className={cn('border-t border-border bg-card', className)}
    >
      {/* Collapsible Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-success/10">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Simulation Complete</h3>
            <p className="text-xs text-muted-foreground">
              {result.scenarioName} • {result.durationSec}s • {result.events.length} events
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDownloadJson(); }}>
            <FileJson className="h-4 w-4 mr-1" />
            JSON
          </Button>
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDownloadReport(); }}>
            <FileText className="h-4 w-4 mr-1" />
            Report
          </Button>
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </div>
      </div>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="grid grid-cols-3 w-full max-w-md">
                  <TabsTrigger value="summary" className="gap-1">
                    <Activity className="h-3.5 w-3.5" />
                    KPI Summary
                  </TabsTrigger>
                  <TabsTrigger value="rca" className="gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Root Cause
                  </TabsTrigger>
                  <TabsTrigger value="recommendations" className="gap-1">
                    <Lightbulb className="h-3.5 w-3.5" />
                    Actions
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="mt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Good Changes */}
                    <Card className="bg-success/5 border-success/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-success">
                          <TrendingUp className="h-4 w-4" />
                          Improvements ({goodDeltas.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-2">
                            {goodDeltas.map((delta, i) => (
                              <KPIDeltaRow key={delta.id} delta={delta} index={i} />
                            ))}
                            {goodDeltas.length === 0 && (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No improvements recorded
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Bad Changes */}
                    <Card className="bg-destructive/5 border-destructive/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                          <TrendingDown className="h-4 w-4" />
                          Degradations ({badDeltas.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-2">
                            {badDeltas.map((delta, i) => (
                              <KPIDeltaRow key={delta.id} delta={delta} index={i} />
                            ))}
                            {badDeltas.length === 0 && (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No degradations recorded
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Actual vs Expected */}
                  {result.actualVsExpected && result.actualVsExpected.length > 0 && (
                    <Card className="mt-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Actual vs Expected Impact</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="divide-y divide-border">
                          {result.actualVsExpected.map((item, i) => (
                            <ActualVsExpectedRow key={item.metric} item={item} index={i} />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="rca" className="mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        {SIMULATION.RESULT.RCA_TITLE}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <div className="text-sm leading-relaxed text-card-foreground whitespace-pre-wrap">
                          {result.rcaMarkdown || 'No root cause analysis available for this scenario.'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="recommendations" className="mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-primary" />
                        {SIMULATION.RESULT.ACTIONS_TITLE}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <div className="text-sm leading-relaxed text-card-foreground whitespace-pre-wrap">
                          {result.recommendationsMarkdown || 'No specific recommendations for this scenario.'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
