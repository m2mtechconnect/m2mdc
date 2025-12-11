/**
 * Simulation Context Badge
 * Shows when CoPilot is using simulation context
 * P0 fix: Visual indicator for context-aware CoPilot
 */

import { Badge } from '@/components/ui/badge';
import { Play, Pause, CheckCircle } from 'lucide-react';

interface SimulationContextBadgeProps {
  scenarioName?: string;
  progress?: number;
  isRunning?: boolean;
  className?: string;
}

export function SimulationContextBadge({
  scenarioName,
  progress = 0,
  isRunning = false,
  className,
}: SimulationContextBadgeProps) {
  const progressPercent = Math.round(progress * 100);
  
  const StatusIcon = isRunning ? Play : progress >= 1 ? CheckCircle : Pause;
  const statusColor = isRunning 
    ? 'bg-success/10 text-success border-success/30' 
    : progress >= 1 
      ? 'bg-primary/10 text-primary border-primary/30'
      : 'bg-warning/10 text-warning border-warning/30';

  return (
    <Badge 
      variant="outline" 
      className={`text-xs gap-1.5 ${statusColor} ${className}`}
    >
      <StatusIcon className="h-3 w-3" />
      <span>Using Simulation Context</span>
      {scenarioName && (
        <>
          <span className="text-muted-foreground">•</span>
          <span className="font-medium truncate max-w-[120px]">{scenarioName}</span>
        </>
      )}
      {progressPercent > 0 && progressPercent < 100 && (
        <>
          <span className="text-muted-foreground">•</span>
          <span>{progressPercent}%</span>
        </>
      )}
    </Badge>
  );
}
