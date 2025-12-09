/**
 * DC Simulation Controls Component
 * Play/Pause/Reset controls with speed selector and progress bar
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Play, Pause, RotateCcw, FastForward, Clock, 
  Activity, CheckCircle2, AlertCircle
} from 'lucide-react';
import type { SimulationStatus } from '@/simulation/types';
import { cn } from '@/lib/utils';

interface DCSimulationControlsProps {
  status: SimulationStatus;
  timeScale: 1 | 2 | 5 | 10;
  progress: number;
  elapsedTime: number;
  remainingTime: number;
  scenarioName?: string;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onTimeScaleChange: (scale: 1 | 2 | 5 | 10) => void;
  disabled?: boolean;
}

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const statusConfig: Record<SimulationStatus, { 
  label: string; 
  color: string; 
  icon: React.ElementType;
  pulse?: boolean;
}> = {
  idle: { 
    label: 'Ready', 
    color: 'bg-muted text-muted-foreground', 
    icon: Clock 
  },
  running: { 
    label: 'Running', 
    color: 'bg-dc-success/20 text-dc-success border-dc-success/30', 
    icon: Activity,
    pulse: true
  },
  paused: { 
    label: 'Paused', 
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', 
    icon: Pause 
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', 
    icon: CheckCircle2 
  },
};

export function DCSimulationControls({
  status,
  timeScale,
  progress,
  elapsedTime,
  remainingTime,
  scenarioName,
  onPlay,
  onPause,
  onResume,
  onReset,
  onTimeScaleChange,
  disabled = false,
}: DCSimulationControlsProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  
  const handlePlayPause = () => {
    if (status === 'running') {
      onPause();
    } else if (status === 'paused') {
      onResume();
    } else {
      onPlay();
    }
  };
  
  return (
    <div className="bg-dc-surface border border-dc-border rounded-lg p-4 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-sm">
            {scenarioName || 'Simulation Controls'}
          </h3>
          <Badge 
            variant="outline" 
            className={cn('gap-1 text-xs', config.color, config.pulse && 'animate-pulse')}
          >
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </Badge>
        </div>
        
        {/* Time display */}
        <div className="flex items-center gap-4 text-sm font-mono">
          <span className="text-muted-foreground">
            {formatTime(elapsedTime)}
          </span>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-muted-foreground">
            {formatTime(elapsedTime + remainingTime)}
          </span>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="space-y-1">
        <Progress 
          value={progress} 
          className="h-2 bg-dc-border"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0%</span>
          <span>{Math.round(progress)}% complete</span>
          <span>100%</span>
        </div>
      </div>
      
      {/* Control buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Play/Pause button */}
          <Button
            size="sm"
            variant={status === 'running' ? 'default' : 'outline'}
            onClick={handlePlayPause}
            disabled={disabled}
            className="gap-2 min-w-[100px]"
          >
            {status === 'running' ? (
              <>
                <Pause className="h-4 w-4" />
                Pause
              </>
            ) : status === 'paused' ? (
              <>
                <Play className="h-4 w-4" />
                Resume
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start
              </>
            )}
          </Button>
          
          {/* Reset button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onReset}
            disabled={disabled || status === 'idle'}
            className="gap-1"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
        
        {/* Speed selector */}
        <div className="flex items-center gap-2">
          <FastForward className="h-4 w-4 text-muted-foreground" />
          <Select 
            value={timeScale.toString()} 
            onValueChange={(v) => onTimeScaleChange(parseInt(v) as 1 | 2 | 5 | 10)}
            disabled={disabled}
          >
            <SelectTrigger className="w-[80px] h-8 text-xs bg-dc-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1x</SelectItem>
              <SelectItem value="2">2x</SelectItem>
              <SelectItem value="5">5x</SelectItem>
              <SelectItem value="10">10x</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
