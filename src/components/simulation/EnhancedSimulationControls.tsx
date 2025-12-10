/**
 * Enhanced DC Simulation Controls
 * With animated progress and status indicators
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Play, Pause, RotateCcw, FastForward, Clock,
  Activity, CheckCircle2, AlertCircle, XCircle
} from 'lucide-react';
import type { SimulationStatus } from '@/simulation/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface EnhancedSimulationControlsProps {
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
  errorMessage?: string;
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
  bgColor: string;
  icon: React.ElementType;
  pulse?: boolean;
}> = {
  idle: {
    label: 'Ready',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    icon: Clock
  },
  running: {
    label: 'Running',
    color: 'text-success',
    bgColor: 'bg-success/10',
    icon: Activity,
    pulse: true
  },
  paused: {
    label: 'Paused',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    icon: Pause
  },
  completed: {
    label: 'Completed',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    icon: CheckCircle2
  },
  error: {
    label: 'Error',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    icon: XCircle
  },
};

const speedOptions = [1, 2, 5, 10] as const;

export function EnhancedSimulationControls({
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
  errorMessage,
}: EnhancedSimulationControlsProps) {
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
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4 space-y-4"
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-sm text-card-foreground">
            {scenarioName || 'Simulation Controls'}
          </h3>
          <motion.div
            key={status}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <Badge
              variant="outline"
              className={cn(
                'gap-1.5 text-xs transition-all',
                config.color,
                config.bgColor,
                config.pulse && 'animate-pulse'
              )}
            >
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </Badge>
          </motion.div>
        </div>

        {/* Time display */}
        <motion.div
          key={elapsedTime}
          className="flex items-center gap-2 text-sm font-mono"
        >
          <motion.span
            key={Math.floor(elapsedTime)}
            initial={{ y: -5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-foreground font-semibold"
          >
            {formatTime(elapsedTime)}
          </motion.span>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-muted-foreground">
            {formatTime(elapsedTime + remainingTime)}
          </span>
        </motion.div>
      </div>

      {/* Progress bar with animation */}
      <div className="space-y-1">
        <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full',
              status === 'running' ? 'bg-primary' :
              status === 'completed' ? 'bg-success' :
              status === 'error' ? 'bg-destructive' :
              'bg-muted-foreground/30'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
          {/* Animated shimmer for running state */}
          <AnimatePresence>
            {status === 'running' && (
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              />
            )}
          </AnimatePresence>
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0%</span>
          <motion.span
            key={Math.round(progress)}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
          >
            {Math.round(progress)}% complete
          </motion.span>
          <span>100%</span>
        </div>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {status === 'error' && errorMessage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Play/Pause button */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              size="sm"
              variant={status === 'running' ? 'default' : 'outline'}
              onClick={handlePlayPause}
              disabled={disabled || status === 'error'}
              className="gap-2 min-w-[100px]"
            >
              <AnimatePresence mode="wait">
                {status === 'running' ? (
                  <motion.div
                    key="pause"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Pause className="h-4 w-4" />
                    Pause
                  </motion.div>
                ) : status === 'paused' ? (
                  <motion.div
                    key="resume"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Resume
                  </motion.div>
                ) : (
                  <motion.div
                    key="start"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Start
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>

          {/* Reset button */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
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
          </motion.div>
        </div>

        {/* Speed selector with animated chips */}
        <div className="flex items-center gap-2">
          <FastForward className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            {speedOptions.map((speed) => (
              <motion.button
                key={speed}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onTimeScaleChange(speed)}
                disabled={disabled}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-all',
                  timeScale === speed
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {speed}x
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
