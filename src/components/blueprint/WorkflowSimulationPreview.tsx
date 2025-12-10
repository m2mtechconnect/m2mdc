/**
 * Workflow Simulation Preview
 * Preview workflow execution before running in production
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Pause, 
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Zap,
  AlertTriangle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowStep {
  id: string;
  name: string;
  type: 'trigger' | 'condition' | 'action' | 'notification';
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  duration?: number; // ms
  output?: string;
  error?: string;
}

interface WorkflowSimulationPreviewProps {
  workflowId?: string;
  workflowName?: string;
  steps?: WorkflowStep[];
  onRunPreview?: () => void;
  onApplyToProduction?: () => void;
  className?: string;
}

// Mock workflow steps
const MOCK_STEPS: WorkflowStep[] = [
  {
    id: 'step-1',
    name: 'Temperature Threshold Trigger',
    type: 'trigger',
    status: 'success',
    duration: 50,
    output: 'Trigger condition met: rack_temp > 28°C',
  },
  {
    id: 'step-2',
    name: 'Check GPU Load',
    type: 'condition',
    status: 'success',
    duration: 120,
    output: 'GPU load at 85% - condition passed',
  },
  {
    id: 'step-3',
    name: 'Increase Cooling Output',
    type: 'action',
    status: 'running',
    duration: undefined,
    output: 'Adjusting CRAH setpoint...',
  },
  {
    id: 'step-4',
    name: 'Redistribute Workload',
    type: 'action',
    status: 'pending',
  },
  {
    id: 'step-5',
    name: 'Send Alert Notification',
    type: 'notification',
    status: 'pending',
  },
];

export function WorkflowSimulationPreview({
  workflowId,
  workflowName = 'Thermal Response Workflow',
  steps,
  onRunPreview,
  onApplyToProduction,
  className
}: WorkflowSimulationPreviewProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [simulationSteps, setSimulationSteps] = useState<WorkflowStep[]>(steps || MOCK_STEPS);
  const [currentStepIndex, setCurrentStepIndex] = useState(2); // Mock: step 3 is running
  
  const completedSteps = simulationSteps.filter(s => s.status === 'success').length;
  const failedSteps = simulationSteps.filter(s => s.status === 'failed').length;
  const progress = (completedSteps / simulationSteps.length) * 100;

  const getStepIcon = (step: WorkflowStep) => {
    switch (step.status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />;
      case 'skipped':
        return <ArrowRight className="h-4 w-4 text-muted-foreground" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />;
    }
  };

  const getTypeColor = (type: WorkflowStep['type']) => {
    switch (type) {
      case 'trigger':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'condition':
        return 'bg-info/10 text-info border-info/20';
      case 'action':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'notification':
        return 'bg-success/10 text-success border-success/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentStepIndex(0);
    setSimulationSteps(steps || MOCK_STEPS.map(s => ({ ...s, status: 'pending' as const })));
  };

  const handleRunPreview = () => {
    setIsRunning(true);
    if (onRunPreview) {
      onRunPreview();
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Play className="h-4 w-4 text-primary" />
            Simulation Preview
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {completedSteps}/{simulationSteps.length} steps
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{workflowName}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Simulation Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleRunPreview}
            disabled={isRunning}
            className="gap-1"
          >
            <Play className="h-3 w-3" />
            {isRunning ? 'Running...' : 'Run Preview'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsRunning(false)}
            disabled={!isRunning}
          >
            <Pause className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReset}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          
          {completedSteps === simulationSteps.length && failedSteps === 0 && (
            <Button
              size="sm"
              variant="default"
              className="ml-auto gap-1"
              onClick={onApplyToProduction}
            >
              <Zap className="h-3 w-3" />
              Apply to Production
            </Button>
          )}
        </div>

        {/* Status Summary */}
        {(failedSteps > 0 || completedSteps === simulationSteps.length) && (
          <div className={cn(
            "p-3 rounded-lg border text-sm",
            failedSteps > 0 
              ? 'bg-destructive/5 border-destructive/20 text-destructive'
              : 'bg-success/5 border-success/20 text-success'
          )}>
            <div className="flex items-center gap-2">
              {failedSteps > 0 ? (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  <span>{failedSteps} step(s) failed - review before production</span>
                </>
              ) : completedSteps === simulationSteps.length ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>All steps completed successfully</span>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Steps Timeline */}
        <ScrollArea className="h-64">
          <div className="space-y-1">
            {simulationSteps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  step.status === 'running' && 'border-primary bg-primary/5',
                  step.status === 'success' && 'border-success/30 bg-success/5',
                  step.status === 'failed' && 'border-destructive/30 bg-destructive/5',
                  step.status === 'pending' && 'border-border bg-muted/30',
                  step.status === 'skipped' && 'border-border bg-muted/30 opacity-60'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getStepIcon(step)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{step.name}</span>
                      <Badge 
                        variant="outline" 
                        className={cn("text-[10px] h-4", getTypeColor(step.type))}
                      >
                        {step.type}
                      </Badge>
                    </div>
                    
                    {step.output && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {step.output}
                      </p>
                    )}
                    
                    {step.error && (
                      <p className="text-xs text-destructive">
                        Error: {step.error}
                      </p>
                    )}
                    
                    {step.duration !== undefined && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {step.duration}ms
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Info */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            Preview mode simulates workflow execution without affecting production systems. 
            All actions are logged but not applied.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
