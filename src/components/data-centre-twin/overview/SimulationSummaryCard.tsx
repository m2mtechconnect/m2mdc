/**
 * SimulationSummaryCard - Lightweight simulation status for Overview tab
 * Shows last run status with quick link to open full simulation
 * 
 * This replaces the heavy ScenarioSimulationPanel on Overview
 * Full simulation functionality is ONLY in the Simulation tab
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, ExternalLink, Clock, Activity, CheckCircle2, Sparkles } from 'lucide-react';
import { useSimulation } from '@/simulation/useSimulation';
import { cn } from '@/lib/utils';

interface SimulationSummaryCardProps {
  onOpenSimulation: () => void;
  className?: string;
}

export function SimulationSummaryCard({ 
  onOpenSimulation,
  className 
}: SimulationSummaryCardProps) {
  const { status, activeScenario, progress, elapsedTime } = useSimulation();
  
  const isActive = status === 'running' || status === 'paused';
  const isCompleted = status === 'completed';
  
  // Format elapsed time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <Card className={cn(
      'bg-gradient-to-r from-primary/5 via-background to-transparent border-primary/20',
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Status Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'p-2.5 rounded-xl shrink-0',
              isActive ? 'bg-success/10' : 'bg-primary/10'
            )}>
              {isActive ? (
                <Activity className="h-5 w-5 text-success animate-pulse" />
              ) : isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : (
                <Sparkles className="h-5 w-5 text-primary" />
              )}
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-sm">Scenario Simulation</h4>
                <Badge 
                  variant={isActive ? 'default' : 'outline'}
                  className={cn(
                    'text-[10px] h-5',
                    isActive && 'bg-success text-success-foreground animate-pulse',
                    isCompleted && 'bg-primary'
                  )}
                >
                  {status === 'running' ? 'Running' : 
                   status === 'paused' ? 'Paused' :
                   status === 'completed' ? 'Completed' : 'Ready'}
                </Badge>
              </div>
              
              {activeScenario ? (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-muted-foreground truncate">
                    {activeScenario.name}
                  </p>
                  {isActive && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {Math.round(progress)}%
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground tabular-nums flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(elapsedTime)}
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Run scenarios to test your data centre twin
                </p>
              )}
            </div>
          </div>
          
          {/* Right: Action Button */}
          <Button
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={onOpenSimulation}
            className="gap-2 shrink-0"
          >
            {isActive ? (
              <>
                <Activity className="h-4 w-4" />
                View Live
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" />
                Open Simulation
              </>
            )}
          </Button>
        </div>
        
        {/* Progress bar when active */}
        {isActive && (
          <div className="mt-3">
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-full bg-success rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
