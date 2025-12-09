/**
 * Simulation Controls Component
 * Time scrubber, replay, scenario comparison, stress testing
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { 
  Play, Pause, RotateCcw, FastForward, Rewind,
  Layers, Zap, ChevronDown, Clock, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimulationControlsProps {
  isRunning: boolean;
  speed: number;
  currentTime: number;
  totalDuration: number;
  scenarios: Array<{ id: string; name: string; active?: boolean }>;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (time: number) => void;
  onScenarioToggle: (scenarioId: string) => void;
  onStressTest: (type: string) => void;
  className?: string;
}

const SPEED_OPTIONS = [0.5, 1, 2, 4, 8];

const STRESS_TESTS = [
  { id: 'surge', name: 'Traffic Surge', description: '+300% load spike', icon: Zap },
  { id: 'cascade', name: 'Cascade Failure', description: 'Chain reaction event', icon: AlertTriangle },
  { id: 'weather', name: 'Weather Event', description: 'Severe conditions', icon: AlertTriangle },
  { id: 'cyber', name: 'Cyber Incident', description: 'Security disruption', icon: AlertTriangle }
];

export function SimulationControls({
  isRunning,
  speed,
  currentTime,
  totalDuration,
  scenarios,
  onPlay,
  onPause,
  onReset,
  onSpeedChange,
  onSeek,
  onScenarioToggle,
  onStressTest,
  className
}: SimulationControlsProps) {
  const [showScrubber, setShowScrubber] = useState(true);

  // Format time as HH:MM:SS
  const formatTime = useCallback((seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Main Controls Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Playback Controls */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onReset}
            title="Reset"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onSeek(Math.max(0, currentTime - 30))}
            title="Back 30s"
          >
            <Rewind className="h-4 w-4" />
          </Button>
          
          <Button
            variant={isRunning ? "secondary" : "default"}
            size="icon"
            className="h-8 w-8"
            onClick={isRunning ? onPause : onPlay}
          >
            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onSeek(Math.min(totalDuration, currentTime + 30))}
            title="Forward 30s"
          >
            <FastForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Speed Control */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Clock className="h-3 w-3" />
              {speed}x
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Playback Speed</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SPEED_OPTIONS.map(s => (
              <DropdownMenuItem 
                key={s} 
                onClick={() => onSpeedChange(s)}
                className={cn(speed === s && "bg-accent")}
              >
                {s}x {s === 1 && '(Normal)'}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Scenario Comparison */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Layers className="h-3 w-3" />
              Scenarios
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {scenarios.filter(s => s.active).length}
              </Badge>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Compare Scenarios</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {scenarios.map(scenario => (
              <DropdownMenuItem 
                key={scenario.id}
                onClick={() => onScenarioToggle(scenario.id)}
                className="flex items-center justify-between"
              >
                <span>{scenario.name}</span>
                {scenario.active && (
                  <Badge variant="default" className="h-4 px-1 text-[10px]">Active</Badge>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Stress Test */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 text-yellow-600 border-yellow-600/50 hover:bg-yellow-600/10">
              <Zap className="h-3 w-3" />
              Stress Test
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Inject Disruption</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STRESS_TESTS.map(test => (
              <DropdownMenuItem 
                key={test.id}
                onClick={() => onStressTest(test.id)}
                className="flex flex-col items-start gap-0.5"
              >
                <div className="flex items-center gap-2">
                  <test.icon className="h-3 w-3 text-yellow-600" />
                  <span className="font-medium">{test.name}</span>
                </div>
                <span className="text-xs text-muted-foreground ml-5">
                  {test.description}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Time Display */}
        <div className="flex-1" />
        <div className="text-sm font-mono text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </div>
      </div>

      {/* Time Scrubber */}
      {showScrubber && (
        <div className="space-y-1">
          <Slider
            value={[progress]}
            max={100}
            step={0.1}
            onValueChange={([value]) => onSeek((value / 100) * totalDuration)}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Start</span>
            <span className="flex items-center gap-1">
              {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
              {isRunning ? 'Running' : 'Paused'}
            </span>
            <span>End</span>
          </div>
        </div>
      )}
    </div>
  );
}
