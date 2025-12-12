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
import { PlayCircle, ExternalLink, Clock, Activity, CheckCircle2 } from 'lucide-react';
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
  const { status, activeScenario, progress } = useSimulation();
  
  const isActive = status === 'running' || status === 'paused';
  const isCompleted = status === 'completed';
  
  return (
    <Card className={cn(
      'bg-gradient-to-r from-primary/5 to-transparent border-primary/20',
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Status Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'p-2 rounded-full shrink-0',
              isActive ? 'bg-success/10' : 'bg-primary/10'
            )}>
              {isActive ? (
                <Activity className="h-5 w-5 text-success animate-pulse" />
              ) : isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : (
                <PlayCircle className="h-5 w-5 text-primary" />
              )}
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm">Simulation</h4>
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
                <p className="text-xs text-muted-foreground truncate">
                  {activeScenario.name}
                  {isActive && ` • ${Math.round(progress)}%`}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Run scenarios in the Simulation tab
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
                <ExternalLink className="h-4 w-4" />
                Open Simulation
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
