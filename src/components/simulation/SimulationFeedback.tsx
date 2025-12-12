/**
 * Simulation Feedback Components
 * Toast notifications and visual feedback for simulation actions
 */

import { useEffect, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { CheckCircle2, PlayCircle, PauseCircle, RotateCcw, AlertTriangle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Toast notifications for simulation events
export function showSimulationStartToast(scenarioName: string) {
  toast({
    title: "Simulation Started",
    description: `Running "${scenarioName}" scenario...`,
    duration: 3000,
  });
}

export function showSimulationPauseToast() {
  toast({
    title: "Simulation Paused",
    description: "Click play to resume the simulation.",
    duration: 2000,
  });
}

export function showSimulationResetToast() {
  toast({
    title: "Simulation Reset",
    description: "All values restored to baseline.",
    duration: 2000,
  });
}

export function showSimulationCompleteToast(scenarioName: string, kpiChanges?: number) {
  toast({
    title: "Simulation Complete",
    description: `"${scenarioName}" finished. ${kpiChanges ? `${kpiChanges} KPIs affected.` : ''}`,
    duration: 5000,
  });
}

export function showScenarioSelectedToast(scenarioName: string) {
  toast({
    title: "Scenario Selected",
    description: `"${scenarioName}" ready to run.`,
    duration: 2000,
  });
}

export function showSimulationErrorToast(error: string) {
  toast({
    variant: "destructive",
    title: "Simulation Error",
    description: error,
    duration: 5000,
  });
}

// Visual feedback pulse component
interface ActionPulseProps {
  isActive: boolean;
  color?: 'primary' | 'success' | 'warning' | 'destructive';
  className?: string;
}

export function ActionPulse({ isActive, color = 'primary', className }: ActionPulseProps) {
  const colorClasses = {
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    destructive: 'bg-destructive',
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className={cn(
            "absolute inset-0 rounded-full",
            colorClasses[color],
            className
          )}
        />
      )}
    </AnimatePresence>
  );
}

// Status indicator with animation
interface SimulationStatusIndicatorProps {
  status: 'idle' | 'running' | 'paused' | 'complete' | 'error';
  className?: string;
}

export function SimulationStatusIndicator({ status, className }: SimulationStatusIndicatorProps) {
  const statusConfig = {
    idle: { icon: PlayCircle, color: 'text-muted-foreground', label: 'Ready', bg: 'bg-muted' },
    running: { icon: Zap, color: 'text-success', label: 'Running', bg: 'bg-success/10' },
    paused: { icon: PauseCircle, color: 'text-warning', label: 'Paused', bg: 'bg-warning/10' },
    complete: { icon: CheckCircle2, color: 'text-primary', label: 'Complete', bg: 'bg-primary/10' },
    error: { icon: AlertTriangle, color: 'text-destructive', label: 'Error', bg: 'bg-destructive/10' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.div
      key={status}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
        config.bg,
        config.color,
        className
      )}
    >
      <motion.div
        animate={status === 'running' ? { rotate: 360 } : {}}
        transition={status === 'running' ? { duration: 2, repeat: Infinity, ease: 'linear' } : {}}
      >
        <Icon className="h-4 w-4" />
      </motion.div>
      <span>{config.label}</span>
      {status === 'running' && (
        <motion.span
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-xs"
        >
          ...
        </motion.span>
      )}
    </motion.div>
  );
}

// Progress indicator for long-running simulations
interface SimulationProgressProps {
  progress: number; // 0-100
  timeRemaining?: string;
  className?: string;
}

export function SimulationProgress({ progress, timeRemaining, className }: SimulationProgressProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Progress</span>
        <span>{Math.round(progress)}%{timeRemaining && ` • ${timeRemaining} remaining`}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// Hook for simulation feedback
export function useSimulationFeedback() {
  const previousStatus = useRef<string | null>(null);

  const notifyStatusChange = (
    status: 'idle' | 'running' | 'paused' | 'complete' | 'error',
    scenarioName?: string
  ) => {
    // Prevent duplicate notifications
    if (previousStatus.current === status) return;
    previousStatus.current = status;

    switch (status) {
      case 'running':
        if (scenarioName) showSimulationStartToast(scenarioName);
        break;
      case 'paused':
        showSimulationPauseToast();
        break;
      case 'complete':
        if (scenarioName) showSimulationCompleteToast(scenarioName);
        break;
    }
  };

  const notifyScenarioSelected = (scenarioName: string) => {
    showScenarioSelectedToast(scenarioName);
  };

  const notifyError = (error: string) => {
    showSimulationErrorToast(error);
  };

  const reset = () => {
    previousStatus.current = null;
    showSimulationResetToast();
  };

  return {
    notifyStatusChange,
    notifyScenarioSelected,
    notifyError,
    reset,
  };
}
