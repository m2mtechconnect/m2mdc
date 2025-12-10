/**
 * Simulation Preview Panel
 * Shows industry-specific KPIs, event timeline, and simulation controls
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, Clock, CheckCircle2, AlertCircle, Activity, 
  TrendingUp, Zap, Info, Plus
} from 'lucide-react';
import { 
  getSimulationTemplateForIndustry, 
  getIndustryLabel,
  type SimulationTemplate 
} from '@/lib/simulationTemplates';
import { SimulationKPICard } from './SimulationKPICard';
import { SimulationEventTimeline } from './SimulationEventTimeline';

interface SimulationRun {
  id: string;
  scenario: string;
  status: 'completed' | 'failed' | 'running';
  duration: number;
  timestamp: Date;
  outputs: string;
  events: number;
  latency: number;
}

interface SimulationPreviewPanelProps {
  simulationHistory: SimulationRun[];
  industry: string;
  onRunSimulation: (scenario: string) => void;
  isRunning: boolean;
}

export function SimulationPreviewPanel({
  simulationHistory,
  industry,
  onRunSimulation,
  isRunning
}: SimulationPreviewPanelProps) {
  const [template, setTemplate] = useState<SimulationTemplate | null>(null);
  const [isSampleData, setIsSampleData] = useState(true);
  
  useEffect(() => {
    const simTemplate = getSimulationTemplateForIndustry(industry);
    setTemplate(simTemplate);
    setIsSampleData(simulationHistory.length === 0);
  }, [industry, simulationHistory.length]);

  const industryLabel = getIndustryLabel(industry);

  const statusIcon = (status: SimulationRun['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <Activity className="h-4 w-4 text-primary animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (!template) return null;

  return (
    <div className="space-y-4">
      {/* Sample Data Info Banner */}
      {isSampleData && (
        <Alert className="bg-warning/10 border-warning/30">
          <Info className="h-4 w-4 text-warning" />
          <AlertDescription className="text-sm">
            Showing recommended sample KPIs for <strong>{industryLabel}</strong>.
            Connect real data to replace these values.
          </AlertDescription>
        </Alert>
      )}

      {/* Simulation Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{template.title}</CardTitle>
                {isSampleData && (
                  <Badge variant="secondary" className="text-xs">
                    Sample Data
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{template.description}</p>
            </div>
            <Button
              onClick={() => onRunSimulation(template.defaultQuery)}
              disabled={isRunning}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              {isRunning ? 'Running...' : 'Run Simulation'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Cards Grid */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Key Performance Indicators
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {template.kpis.map((kpi) => (
            <SimulationKPICard 
              key={kpi.code} 
              kpi={kpi} 
              isSampleData={isSampleData} 
            />
          ))}
        </div>
      </div>

      {/* Event Timeline */}
      <SimulationEventTimeline 
        events={template.events} 
        isSampleData={isSampleData} 
      />

      {/* Recent Runs */}
      {simulationHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Simulation Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[180px]">
              <div className="space-y-2">
                {simulationHistory.slice(0, 5).map((run) => (
                  <div 
                    key={run.id}
                    className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {statusIcon(run.status)}
                        <span className="font-medium text-sm truncate max-w-[250px]">
                          {run.scenario}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {run.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                      {run.outputs}
                    </p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {run.duration}ms
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {run.events} events
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {run.latency}ms latency
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Default Query Preview */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Play className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium mb-1">Default Simulation Query</h4>
              <p className="text-sm text-muted-foreground">{template.defaultQuery}</p>
              <Button 
                variant="link" 
                size="sm" 
                className="px-0 h-auto mt-2"
                onClick={() => onRunSimulation(template.defaultQuery)}
                disabled={isRunning}
              >
                <Plus className="h-3 w-3 mr-1" />
                Run this scenario
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
