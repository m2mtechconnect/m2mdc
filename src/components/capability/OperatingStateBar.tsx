/**
 * Persistent operating-state bar (Stage 5).
 * Compact, one line on desktop, never claims live data.
 */
import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  ACTIVE_MODE,
  INPUT_CLASSIFICATION,
  OPERATING_MODES,
  OPERATING_STATE_TOOLTIP,
  activeScenarioLabel,
  simulationRunId,
} from '@/capabilities/operatingState';

interface Props {
  className?: string;
  scenario?: string;
  runId?: string;
}

export function OperatingStateBar({ className, scenario, runId }: Props) {
  const mode = OPERATING_MODES[ACTIVE_MODE];
  const id = runId ?? simulationRunId();
  const [calculatedAt, setCalculatedAt] = useState<string>('');

  useEffect(() => {
    setCalculatedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Operating state"
      data-testid="operating-state-bar"
      data-mode={mode.mode}
      className={cn(
        'flex w-full flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-muted/40 px-3 py-1.5 text-[11px] leading-tight sm:px-4',
        className,
      )}
    >
      <Badge variant="outline" className={cn('rounded-sm px-1.5 py-0 text-[11px] font-semibold uppercase tracking-wider', mode.className)}>
        {mode.mode}
      </Badge>
      <span className="font-medium text-foreground">{scenario ?? activeScenarioLabel()}</span>
      <span className="text-muted-foreground">Run {id}</span>
      <span className="text-muted-foreground">{INPUT_CLASSIFICATION}</span>
      <span className="text-muted-foreground">
        Last calculated: <time>{calculatedAt || '—'}</time>
      </span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            type="button"
            aria-label="About the current operating state"
            className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Info className="h-3.5 w-3.5" aria-hidden />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-xs">
            {OPERATING_STATE_TOOLTIP}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export default OperatingStateBar;
