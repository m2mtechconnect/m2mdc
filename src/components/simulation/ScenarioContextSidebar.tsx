/**
 * Scenario Context Sidebar
 * Shows details about the selected scenario with expected impacts
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Zap, 
  Thermometer, 
  Wind, 
  Network, 
  Shield, 
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScenarioDefinition, SimulationResultSummary } from '@/simulation/types';
import type { DomainType } from '@/types/dataCenterTwin';
import { motion } from 'framer-motion';
import { EMPTY_STATES } from '@/ux';

interface ScenarioContextSidebarProps {
  scenario: ScenarioDefinition | null;
  result?: SimulationResultSummary;
  isRunning?: boolean;
  className?: string;
}

const domainIcons: Partial<Record<DomainType, any>> = {
  thermal_hardware: Thermometer,
  power_ups: Zap,
  cooling: Wind,
  network: Network,
  facility_safety: Shield,
  workload_gpu: Cpu,
  sovereignty: Shield,
};

const severityConfig = {
  low: { color: 'bg-info/10 text-info border-info/30', label: 'Low' },
  medium: { color: 'bg-warning/10 text-warning border-warning/30', label: 'Medium' },
  high: { color: 'bg-destructive/10 text-destructive border-destructive/30', label: 'High' },
  critical: { color: 'bg-destructive text-destructive-foreground', label: 'Critical' },
};

export function ScenarioContextSidebar({
  scenario,
  result,
  isRunning,
  className,
}: ScenarioContextSidebarProps) {
  if (!scenario) {
    return (
      <Card className={cn('bg-card border-border', className)}>
        <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
          <Target className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{EMPTY_STATES.SCENARIO_DETAIL}</p>
        </CardContent>
      </Card>
    );
  }

  const severityInfo = severityConfig[scenario.severity] || severityConfig.medium;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card className={cn('bg-card border-border', isRunning && 'ring-1 ring-primary/30')}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold">{scenario.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={cn('text-xs', severityInfo.color)}>
                  {severityInfo.label} Severity
                </Badge>
                {isRunning && (
                  <Badge variant="outline" className="text-xs animate-pulse bg-success/10 text-success">
                    Running
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Description */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            {scenario.description}
          </p>

          {/* Duration */}
          <div className="flex items-center gap-2 text-xs">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Duration:</span>
            <span className="font-mono">{formatDuration(scenario.durationSeconds)}</span>
          </div>

          {/* Domains Affected */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Domains Affected:</p>
            <div className="flex flex-wrap gap-1">
              {scenario.domainsInvolved.map((domain) => {
                const Icon = domainIcons[domain] || AlertTriangle;
                return (
                  <Badge 
                    key={domain} 
                    variant="outline" 
                    className="text-[10px] gap-1 capitalize"
                  >
                    <Icon className="h-2.5 w-2.5" />
                    {domain.replace(/_/g, ' ')}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Expected Impacts */}
          {scenario.expectedImpacts && scenario.expectedImpacts.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Expected Impacts:</p>
              <div className="space-y-1.5">
                {scenario.expectedImpacts.map((impact, i) => (
                  <motion.div
                    key={impact.metric}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/50"
                  >
                    <span className="text-muted-foreground">{impact.metric}</span>
                    <span className="font-mono text-foreground">{impact.expectedRange}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline Events Count */}
          <div className="flex items-center gap-2 text-xs pt-2 border-t border-border">
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            <span className="text-muted-foreground">
              {scenario.timeline.length} events in timeline
            </span>
          </div>

          {/* Actual vs Expected (after completion) */}
          {result && result.actualVsExpected && result.actualVsExpected.length > 0 && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs font-medium mb-2 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                Actual vs Expected
              </p>
              <ScrollArea className="h-[100px]">
                <div className="space-y-1.5">
                  {result.actualVsExpected.map((item, i) => (
                    <div
                      key={item.metric}
                      className={cn(
                        'flex items-center justify-between text-[10px] py-1 px-2 rounded',
                        item.withinRange ? 'bg-success/10' : 'bg-warning/10'
                      )}
                    >
                      <span className="text-muted-foreground">{item.metric}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Exp: {item.expected}</span>
                        <span className="font-medium">Act: {item.actual}</span>
                        {item.withinRange ? (
                          <CheckCircle2 className="h-3 w-3 text-success" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-warning" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}
