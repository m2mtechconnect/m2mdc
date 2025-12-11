/**
 * Live Insights KPI Panel
 * Integrates hover insights with KPI interactions
 * Updates dynamically with simulation playback
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Zap,
  Clock,
  Target,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { KPISnapshot, SimulationEvent, LiveInsight } from '@/simulation/types';
import { DEFAULT_KPI_CONFIGS, generateHoverInsight } from '@/engines/kpi/KPIOverlayEngine';

interface LiveInsightsKPIPanelProps {
  snapshots: KPISnapshot[];
  events: SimulationEvent[];
  currentTime: number;
  hoveredKpiId?: string | null;
  hoveredValue?: number;
  isRunning?: boolean;
  className?: string;
}

export function LiveInsightsKPIPanel({
  snapshots,
  events,
  currentTime,
  hoveredKpiId,
  hoveredValue,
  isRunning = false,
  className,
}: LiveInsightsKPIPanelProps) {
  const [insights, setInsights] = useState<LiveInsight[]>([]);

  // Get current snapshot
  const currentSnapshotIndex = Math.min(
    Math.floor(currentTime / 10),
    snapshots.length - 1
  );
  const currentSnapshot = snapshots[currentSnapshotIndex];

  // Generate insights based on current state
  useEffect(() => {
    if (!currentSnapshot) return;

    const newInsights: LiveInsight[] = [];
    const kpiIds = Object.keys(DEFAULT_KPI_CONFIGS);

    for (const kpiId of kpiIds) {
      const config = DEFAULT_KPI_CONFIGS[kpiId];
      const value = currentSnapshot[kpiId] ?? 0;
      
      // Check for threshold breaches
      if (config.lowerIsBetter && value > config.criticalLevel) {
        newInsights.push({
          id: `insight-${kpiId}-critical`,
          type: 'warning',
          severity: 'critical',
          title: `${config.name} Critical`,
          description: `${config.name} is at ${value.toFixed(2)}${config.unit}, above critical threshold of ${config.criticalLevel}${config.unit}`,
          timestamp: currentTime,
          relatedKpis: [kpiId],
          relatedEvents: [],
          affectedDomains: [config.domain],
          confidence: 95,
          suggestedActions: [{
            id: `action-${kpiId}`,
            label: 'Investigate',
            description: `Investigate ${config.domain} systems immediately`,
            impact: 'High priority action required'
          }],
          validFrom: currentTime,
        });
      } else if (!config.lowerIsBetter && value < config.criticalLevel) {
        newInsights.push({
          id: `insight-${kpiId}-critical`,
          type: 'warning',
          severity: 'warning',
          title: `${config.name} Below Target`,
          description: `${config.name} is at ${value.toFixed(2)}${config.unit}, below critical threshold of ${config.criticalLevel}${config.unit}`,
          timestamp: currentTime,
          relatedKpis: [kpiId],
          relatedEvents: [],
          affectedDomains: [config.domain],
          confidence: 90,
          suggestedActions: [{
            id: `action-${kpiId}`,
            label: 'Review Configuration',
            description: `Review ${config.domain} configuration`,
            impact: 'Medium priority review'
          }],
          validFrom: currentTime,
        });
      }

      // Check for approaching targets
      const distanceToTarget = Math.abs(value - config.target);
      const targetRange = Math.abs(config.criticalLevel - config.target);
      
      if (distanceToTarget < targetRange * 0.1) {
        newInsights.push({
          id: `insight-${kpiId}-target`,
          type: 'recommendation',
          severity: 'info',
          title: `${config.name} Near Target`,
          description: `${config.name} is within 10% of target (${config.target}${config.unit})`,
          timestamp: currentTime,
          relatedKpis: [kpiId],
          relatedEvents: [],
          affectedDomains: [config.domain],
          confidence: 100,
          suggestedActions: [],
          validFrom: currentTime,
        });
      }
    }

    // Add event-based insights
    const recentEvents = events.filter(
      e => Math.abs(e.timestamp - currentTime) <= 30
    );
    
    for (const event of recentEvents) {
      newInsights.push({
        id: `insight-event-${event.id}`,
        type: event.severity === 'critical' ? 'warning' : 'anomaly',
        severity: event.severity === 'critical' ? 'critical' : 'warning',
        title: event.title,
        description: event.description,
        timestamp: event.timestamp,
        relatedKpis: event.affectedKpis || [],
        relatedEvents: [event.id],
        affectedDomains: [event.domain],
        confidence: 85,
        suggestedActions: [{
          id: `action-event-${event.id}`,
          label: `Review ${event.domain}`,
          description: `Review ${event.domain} domain`,
          impact: event.severity === 'critical' ? 'High' : 'Medium'
        }],
        validFrom: event.timestamp,
      });
    }

    // Sort by severity and limit
    setInsights(
      newInsights
        .sort((a, b) => {
          const severityOrder = { critical: 0, warning: 1, info: 2 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        })
        .slice(0, 8)
    );
  }, [currentSnapshot, currentTime, events]);

  // Hover insight for specific KPI
  const hoverInsight = useMemo(() => {
    if (!hoveredKpiId || hoveredValue === undefined) return null;
    return generateHoverInsight(hoveredKpiId, hoveredValue, currentTime, snapshots, events);
  }, [hoveredKpiId, hoveredValue, currentTime, snapshots, events]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'recommendation':
        return <Target className="h-4 w-4 text-success" />;
      case 'prediction':
        return <TrendingUp className="h-4 w-4 text-primary" />;
      default:
        return <Lightbulb className="h-4 w-4 text-warning" />;
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-warning" />
            Live Insights
          </CardTitle>
          <div className="flex items-center gap-2">
            {isRunning && (
              <Badge variant="outline" className="text-[10px] animate-pulse bg-success/10 text-success">
                LIVE
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {insights.length} active
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Hover Insight (when hovering on KPI) */}
        <AnimatePresence>
          {hoverInsight && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 rounded-lg border-2 border-primary/30 bg-primary/5"
            >
              <div className="flex items-start gap-2">
                <Zap className="h-4 w-4 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{hoverInsight.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {hoverInsight.description}
                  </p>
                  {hoverInsight.relatedEvents.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Related to: {hoverInsight.relatedEvents[0].title}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {hoverInsight && insights.length > 0 && <Separator />}

        {/* Insights List */}
        <ScrollArea className="h-[240px]">
          <div className="space-y-2 pr-4">
            <AnimatePresence mode="popLayout">
              {insights.map((insight, i) => (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "p-3 rounded-lg border transition-colors",
                    insight.severity === 'critical' 
                      ? "border-destructive/30 bg-destructive/5" 
                      : insight.type === 'recommendation'
                        ? "border-success/30 bg-success/5"
                        : "border-border bg-muted/30"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{insight.title}</p>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[9px] shrink-0",
                            insight.severity === 'critical' 
                              ? "text-destructive border-destructive/30" 
                              : "text-muted-foreground"
                          )}
                        >
                          {insight.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {insight.description}
                      </p>
                      {insight.suggestedActions.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                          <ArrowRight className="h-3 w-3" />
                          <span>{insight.suggestedActions[0].label}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {insights.length === 0 && !hoverInsight && (
              <div className="text-center py-8 text-muted-foreground">
                <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No active insights</p>
                <p className="text-xs">Hover over KPIs or run a simulation</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
