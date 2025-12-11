/**
 * Simulation Co-Pilot Panel (Run-Time Analyst)
 * 
 * Context-aware Co-Pilot panel for Simulation mode.
 * Helps interpret simulations and provides live recommendations.
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  Brain, 
  Sparkles, 
  Send, 
  Loader2,
  Activity,
  TrendingUp,
  AlertTriangle,
  GitCompare,
  Lightbulb,
  FileWarning,
  ArrowRight,
} from 'lucide-react';
import { useCoPilotPayload } from '@/hooks/useCoPilotPayload';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { cn } from '@/lib/utils';
import type { CoPilotQuickAction } from '@/types/copilotContext';

interface SimulationCoPilotPanelProps {
  className?: string;
  activeScenarioId?: string;
  simulationRunId?: string;
}

// Quick actions for Simulation mode
const SIMULATION_QUICK_ACTIONS: CoPilotQuickAction[] = [
  {
    id: 'explain-current',
    label: "Explain what's happening",
    icon: 'Activity',
    prompt: 'Explain what is happening in the current simulation run. Identify any hotspots, bottlenecks, or concerning trends in the KPIs.',
  },
  {
    id: 'interpret-kpis',
    label: 'Interpret KPI trends',
    icon: 'TrendingUp',
    prompt: 'Analyze the current KPI time series data. Explain the trends, identify any anomalies, and predict potential breaking points.',
  },
  {
    id: 'prioritize-recs',
    label: 'Prioritize recommendations',
    icon: 'Lightbulb',
    prompt: 'Review the current live recommendations and prioritize them. Explain which should be addressed first and why.',
  },
  {
    id: 'explain-spike',
    label: 'Explain this spike',
    icon: 'AlertTriangle',
    prompt: 'Explain the most recent spike or anomaly in the KPI data. What caused it and what are the downstream effects?',
  },
  {
    id: 'suggest-design-changes',
    label: 'Suggest design changes',
    icon: 'FileWarning',
    prompt: 'Based on the simulation results, suggest design changes to the blueprint that would prevent or mitigate the issues observed.',
  },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Activity,
  TrendingUp,
  Lightbulb,
  AlertTriangle,
  FileWarning,
  GitCompare,
};

export function SimulationCoPilotPanel({ 
  className, 
  activeScenarioId,
  simulationRunId,
}: SimulationCoPilotPanelProps) {
  const [input, setInput] = useState('');
  const payload = useCoPilotPayload({ 
    mode: 'simulation',
    activeScenarioId,
    simulationRunId,
  });
  const { sendMessage, isStreaming, messages, openWithQuestion } = useCoPilotContext();

  const handleQuickAction = useCallback((action: CoPilotQuickAction) => {
    openWithQuestion(action.prompt);
  }, [openWithQuestion]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput('');
  }, [input, isStreaming, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  if (!payload) {
    return (
      <Card className={cn('h-full', className)}>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No simulation data available</p>
        </CardContent>
      </Card>
    );
  }

  const hasRecommendations = (payload.liveRecommendations?.length || 0) > 0;
  const activeScenario = payload.scenarios.find(s => s.id === activeScenarioId);

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Run Analyst
          </CardTitle>
          <Badge variant="outline" className="text-xs bg-primary/10">
            Simulation Mode
          </Badge>
        </div>
        
        {/* Simulation Context Summary */}
        <div className="flex items-center gap-2 flex-wrap mt-2">
          {payload.snapshotVersion && (
            <Badge variant="secondary" className="text-xs">
              Snapshot v{payload.snapshotVersion}
            </Badge>
          )}
          {activeScenario && (
            <Badge 
              variant={
                activeScenario.severity === 'critical' ? 'destructive' :
                activeScenario.severity === 'warning' ? 'secondary' : 'outline'
              } 
              className="text-xs"
            >
              {activeScenario.name}
            </Badge>
          )}
          {payload.simulationRun && (
            <Badge variant="outline" className="text-xs capitalize">
              {payload.simulationRun.status}
            </Badge>
          )}
          {hasRecommendations && (
            <Badge variant="outline" className="text-xs text-warning">
              <Lightbulb className="h-3 w-3 mr-1" />
              {payload.liveRecommendations?.length} recommendations
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Quick Actions */}
        <div className="p-3 border-b">
          <p className="text-xs text-muted-foreground mb-2">Quick analysis:</p>
          <div className="flex flex-wrap gap-1.5">
            {SIMULATION_QUICK_ACTIONS.map((action) => {
              const Icon = iconMap[action.icon || ''] || Sparkles;
              return (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleQuickAction(action)}
                  disabled={isStreaming}
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Live Recommendations Summary */}
        {hasRecommendations && (
          <div className="p-3 border-b bg-warning/5">
            <p className="text-xs font-medium mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-warning" />
              Live Recommendations
            </p>
            <div className="space-y-1">
              {payload.liveRecommendations?.slice(0, 2).map((rec) => (
                <div 
                  key={rec.id} 
                  className="text-xs p-2 rounded bg-background border flex items-start gap-2"
                >
                  <Badge 
                    variant={rec.priority === 'high' ? 'destructive' : 'secondary'} 
                    className="text-[10px] shrink-0"
                  >
                    {rec.priority}
                  </Badge>
                  <span className="text-muted-foreground">{rec.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-3">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Ask Co-Pilot about your simulation</p>
              <p className="text-xs mt-1">
                I can analyze KPIs, explain anomalies, and suggest design improvements.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-3 rounded-lg text-sm',
                    msg.role === 'user' 
                      ? 'bg-primary/10 ml-8' 
                      : 'bg-muted mr-8'
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.streaming && (
                    <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-1" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Simulation-only note */}
        <div className="px-3 py-1.5 bg-muted/50 text-[10px] text-muted-foreground flex items-center gap-1">
          <Lightbulb className="h-3 w-3" />
          Design suggestions will be sent to Blueprint Designer
          <ArrowRight className="h-3 w-3" />
        </div>

        {/* Input Area */}
        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about simulation results..."
              className="min-h-[60px] resize-none text-sm"
              disabled={isStreaming}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="h-[60px] w-[60px]"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
