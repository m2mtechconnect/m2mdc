/**
 * Data Centre Simulation Controls Component
 * Playback controls for scenario simulation
 */

import { useState } from 'react';
import { Play, Pause, RotateCcw, FastForward, SkipBack, SkipForward, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

export type SimulationState = 'idle' | 'running' | 'paused' | 'completed';
export type PlaybackSpeed = '0.5x' | '1x' | '2x' | '5x' | '10x' | 'realtime';

interface DCSimulationControlsProps {
  state: SimulationState;
  progress: number; // 0-100
  currentTime: string; // HH:MM:SS or simulation time
  totalTime: string;
  speed: PlaybackSpeed;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onSeek?: (progress: number) => void;
  onStepBack?: () => void;
  onStepForward?: () => void;
  className?: string;
}

export function DCSimulationControls({
  state,
  progress,
  currentTime,
  totalTime,
  speed,
  onPlay,
  onPause,
  onReset,
  onSpeedChange,
  onSeek,
  onStepBack,
  onStepForward,
  className,
}: DCSimulationControlsProps) {
  const isPlaying = state === 'running';
  const isCompleted = state === 'completed';

  return (
    <div className={cn(
      'flex flex-col gap-3 p-4 rounded-lg border bg-card border-border',
      className
    )}>
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono">{currentTime}</span>
          <span className="font-mono">{totalTime}</span>
        </div>
        <div className="relative">
          <Slider
            value={[progress]}
            max={100}
            step={0.1}
            onValueChange={(value) => onSeek?.(value[0])}
            className="w-full"
            disabled={state === 'idle'}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <TooltipProvider>
            {/* Reset */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onReset}
                  aria-label="Reset simulation"
                  className="h-9 w-9"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset</TooltipContent>
            </Tooltip>

            {/* Step back */}
            {onStepBack && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onStepBack}
                    aria-label="Previous event"
                    className="h-9 w-9"
                    disabled={state === 'idle'}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Previous event</TooltipContent>
              </Tooltip>
            )}

            {/* Play/Pause */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={isPlaying ? onPause : onPlay}
                  aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
                  size="icon"
                  className={cn(
                    'h-10 w-10',
                    isPlaying && 'bg-success hover:bg-success/80'
                  )}
                  disabled={isCompleted && !onSeek}
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 ml-0.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isPlaying ? 'Pause' : 'Play'}</TooltipContent>
            </Tooltip>

            {/* Step forward */}
            {onStepForward && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onStepForward}
                    aria-label="Next event"
                    className="h-9 w-9"
                    disabled={state === 'idle' || isCompleted}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Next event</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-2">
          <FastForward className="h-4 w-4 text-muted-foreground" />
          <Select value={speed} onValueChange={(v) => onSpeedChange(v as PlaybackSpeed)}>
            <SelectTrigger className="w-24 h-9 bg-muted">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.5x">0.5x</SelectItem>
              <SelectItem value="1x">1x</SelectItem>
              <SelectItem value="2x">2x</SelectItem>
              <SelectItem value="5x">5x</SelectItem>
              <SelectItem value="10x">10x</SelectItem>
              <SelectItem value="realtime">Real-time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* State indicator */}
        <div className="flex items-center gap-2">
          <span className={cn(
            'h-2 w-2 rounded-full',
            state === 'running' && 'bg-success animate-pulse',
            state === 'paused' && 'bg-warning',
            state === 'completed' && 'bg-info',
            state === 'idle' && 'bg-muted-foreground'
          )} />
          <span className="text-xs text-muted-foreground capitalize">{state}</span>
        </div>
      </div>
    </div>
  );
}

// Scenario selector component
interface Scenario {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  duration: string;
}

interface DCScenarioSelectorProps {
  scenarios: Scenario[];
  selectedId?: string;
  onSelect: (scenario: Scenario) => void;
  className?: string;
}

export function DCScenarioSelector({ scenarios, selectedId, onSelect, className }: DCScenarioSelectorProps) {
  const severityColors = {
    low: 'border-info/30 hover:border-info',
    medium: 'border-warning/30 hover:border-warning',
    high: 'border-destructive/30 hover:border-destructive',
    critical: 'border-destructive/50 hover:border-destructive',
  };

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {scenarios.map((scenario) => (
        <button
          key={scenario.id}
          onClick={() => onSelect(scenario)}
          className={cn(
            'p-4 rounded-lg border-2 bg-card text-left transition-all',
            severityColors[scenario.severity],
            selectedId === scenario.id && 'border-primary ring-1 ring-primary/50'
          )}
        >
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-sm">{scenario.name}</h4>
            <span className={cn(
              'text-[10px] uppercase px-1.5 py-0.5 rounded',
              scenario.severity === 'critical' && 'bg-destructive/20 text-destructive',
              scenario.severity === 'high' && 'bg-destructive/15 text-destructive',
              scenario.severity === 'medium' && 'bg-warning/20 text-warning',
              scenario.severity === 'low' && 'bg-info/20 text-info'
            )}>
              {scenario.severity}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{scenario.description}</p>
          <div className="text-[10px] text-muted-foreground">Duration: {scenario.duration}</div>
        </button>
      ))}
    </div>
  );
}

export default DCSimulationControls;
