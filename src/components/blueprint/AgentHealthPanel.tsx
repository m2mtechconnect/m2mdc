/**
 * Agent Health Panel
 * Shows health score, latency, refresh rate, data freshness, success rate, and ML reasoning preview
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot,
  Activity,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Brain,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { cn } from '@/lib/utils';
import { signalStrength, SIGNAL_BASIS } from '@/capabilities/recommendationSignal';

interface AgentHealthMetrics {
  id: string;
  name: string;
  domain: string;
  healthScore: number;
  latencyMs: number;
  refreshRateHz: number;
  dataFreshnessMs: number;
  successRate: number;
  lastDecision?: {
    action: string;
    reasoning: string;
    confidence: number;
    factors: string[];
  };
}

// Seeded random number generator for stable mock values
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash % 100) / 100;
}

export function AgentHealthPanel({ className }: { className?: string }) {
  const { agents } = useDCTwinBuilderStore();

  // Generate stable mock health metrics for enabled agents using useMemo
  const agentMetrics: AgentHealthMetrics[] = useMemo(() => {
    return agents
      .filter(a => a.enabled)
      .map(agent => {
        // Use agent ID as seed for stable random values
        const seed = agent.id;
        const r1 = seededRandom(seed + 'health');
        const r2 = seededRandom(seed + 'latency');
        const r3 = seededRandom(seed + 'refresh');
        const r4 = seededRandom(seed + 'freshness');
        const r5 = seededRandom(seed + 'success');

        return {
          id: agent.id,
          name: agent.name,
          domain: agent.domain,
          healthScore: 85 + Math.floor(r1 * 15),
          latencyMs: 50 + Math.floor(r2 * 150),
          refreshRateHz: 1 + Math.floor(r3 * 9),
          dataFreshnessMs: 100 + Math.floor(r4 * 900),
          successRate: 92 + Math.floor(r5 * 8),
          lastDecision: agent.domain === 'thermal' ? {
            action: 'Increased cooling to Zone B',
            reasoning: 'GPU cluster approaching thermal threshold',
            confidence: 0.94,
            factors: ['Temperature +3°C', 'GPU utilization 95%', 'Ambient humidity 45%'],
          } : agent.domain === 'workload' ? {
            action: 'Redistributed jobs to Rack 12-15',
            reasoning: 'Load imbalance detected across clusters',
            confidence: 0.89,
            factors: ['Queue depth 142', 'Latency SLA 98.2%', 'GPU fairness index 0.78'],
          } : undefined,
        };
      });
  }, [agents]);

  const getHealthColor = (score: number) => {
    if (score >= 90) return { text: 'text-success', bg: 'bg-success' };
    if (score >= 70) return { text: 'text-warning', bg: 'bg-warning' };
    return { text: 'text-destructive', bg: 'bg-destructive' };
  };

  const getLatencyColor = (ms: number) => {
    if (ms < 100) return 'text-success';
    if (ms < 200) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Agent Health & Performance
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {agentMetrics.length} active agents
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          <div className="space-y-4">
            {agentMetrics.map((agent) => {
              const healthColor = getHealthColor(agent.healthScore);

              return (
                <div
                  key={agent.id}
                  className="p-3 rounded-lg border bg-card space-y-3"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{agent.name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{agent.domain}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn('text-lg font-bold', healthColor.text)}>
                        {agent.healthScore}%
                      </div>
                      <div className={cn('w-2 h-2 rounded-full animate-pulse', healthColor.bg)} />
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted/50 text-center">
                      <Zap className={cn('h-3 w-3 mx-auto mb-1', getLatencyColor(agent.latencyMs))} />
                      <p className="font-mono font-medium">{agent.latencyMs}ms</p>
                      <p className="text-[10px] text-muted-foreground">Latency</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50 text-center">
                      <RefreshCw className="h-3 w-3 mx-auto mb-1 text-info" />
                      <p className="font-mono font-medium">{agent.refreshRateHz}Hz</p>
                      <p className="text-[10px] text-muted-foreground">Refresh</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50 text-center">
                      <Clock className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
                      <p className="font-mono font-medium">{agent.dataFreshnessMs}ms</p>
                      <p className="text-[10px] text-muted-foreground">Freshness</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50 text-center">
                      <CheckCircle2 className="h-3 w-3 mx-auto mb-1 text-success" />
                      <p className="font-mono font-medium">{agent.successRate}%</p>
                      <p className="text-[10px] text-muted-foreground">Success</p>
                    </div>
                  </div>

                  {/* ML Reasoning Preview */}
                  {agent.lastDecision && (
                    <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                      <div className="flex items-center gap-2">
                        <Brain className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-medium">Last Decision</span>
                        <Badge variant="outline" className="text-[10px] ml-auto">
                          {signalStrength(agent.lastDecision.confidence * 100)} signal
                        </Badge>
                      </div>
                      <p className="text-xs font-medium">{agent.lastDecision.action}</p>
                      <p className="text-[10px] text-muted-foreground">{agent.lastDecision.reasoning}</p>
                      <div className="flex flex-wrap gap-1">
                        {agent.lastDecision.factors.map((factor, i) => (
                          <Badge key={i} variant="secondary" className="text-[9px]">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Summary */}
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="text-muted-foreground">
                  {agentMetrics.filter(a => a.healthScore >= 90).length} Healthy
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-warning" />
                <span className="text-muted-foreground">
                  {agentMetrics.filter(a => a.healthScore >= 70 && a.healthScore < 90).length} Warning
                </span>
              </div>
            </div>
            <span className="text-muted-foreground">
              Avg latency: {Math.round(agentMetrics.reduce((sum, a) => sum + a.latencyMs, 0) / agentMetrics.length)}ms
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
