/**
 * Compact record-style header for the simulation workspace.
 *
 * One 52px row that carries the facility identity, the operating-state truth
 * line (mode, scenario, run, relative calculation time), the role view
 * selector and the contextual actions. Presentation only: it reads existing
 * state and never mutates a run.
 */
import { Copy, Info, PanelRightOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  ACTIVE_MODE,
  INPUT_CLASSIFICATION,
  OPERATING_MODES,
  OPERATING_STATE_TOOLTIP,
  activeScenarioLabel,
} from '@/capabilities/operatingState';
import { RUN_UNAVAILABLE_LABEL, formatCalculatedAt, useRunProvenance } from '@/capabilities/runProvenance';
import { useWorkspaceStore } from './workspaceStore';
import { RoleViewSelector } from './RoleViewSelector';
import type { FacilityDefinition } from './facilityModel';

interface Props {
  facility: FacilityDefinition;
  isFallback?: boolean;
  panelOpen: boolean;
  onOpenPanel: () => void;
  panelToggleRef?: React.Ref<HTMLButtonElement>;
}

export function WorkspaceRecordHeader({ facility, isFallback, panelOpen, onOpenPanel, panelToggleRef }: Props) {
  const mode = OPERATING_MODES[ACTIVE_MODE];
  const provenance = useRunProvenance();
  const run = useWorkspaceStore((s) => s.runs.find((r) => r.id === s.activeRunId) ?? s.runs[0] ?? null);

  const scenarioLabel = run?.scenarioLabel ?? activeScenarioLabel();
  const runId = run?.id ?? provenance.runId ?? null;
  const calculatedAtIso = run?.completedAt ?? provenance.calculatedAt ?? null;
  const relative = calculatedAtIso ? formatCalculatedAt(calculatedAtIso) : null;
  const exact = calculatedAtIso ? new Date(calculatedAtIso).toLocaleString() : INPUT_CLASSIFICATION;

  const copyRunId = () => {
    if (runId) void navigator.clipboard?.writeText(runId);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <header
        data-testid="workspace-record-header"
        className="flex h-[52px] w-full shrink-0 items-center gap-x-3 border-b border-border bg-card px-3 sm:px-4"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="min-w-0 truncate text-base font-semibold leading-tight text-foreground sm:text-[17px]">
            {facility.name}
          </h1>
          <Badge
            variant="outline"
            className={cn('shrink-0 rounded-sm px-1.5 py-0 text-[11px] font-semibold uppercase tracking-wider', mode.className)}
          >
            {mode.mode}
          </Badge>
          {isFallback && (
            <span className="hidden shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground lg:inline">
              Reference model
            </span>
          )}
        </div>

        {/* Truth line: scenario, run identifier, relative calculation time. */}
        <div className="hidden min-w-0 items-center gap-3 text-xs text-muted-foreground md:flex">
          <span className="h-4 w-px shrink-0 bg-border" aria-hidden />
          <span className="min-w-0 max-w-[14rem] truncate text-foreground">{scenarioLabel}</span>
          <span className="flex min-w-0 items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="max-w-[10rem] truncate" title={runId ?? undefined}>
                  {runId ? `Run ${runId}` : 'No run recorded'}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs break-all text-xs">
                {runId ? `Run ${runId}` : RUN_UNAVAILABLE_LABEL}
              </TooltipContent>
            </Tooltip>
            {runId && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                aria-label={`Copy run identifier ${runId}`}
                onClick={copyRunId}
              >
                <Copy className="h-3 w-3" aria-hidden />
              </Button>
            )}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="hidden shrink-0 truncate lg:inline">
                {relative ? `Calculated ${relative}` : INPUT_CLASSIFICATION}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              {exact}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              type="button"
              aria-label="About the current operating state"
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Info className="h-3.5 w-3.5" aria-hidden />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              {OPERATING_STATE_TOOLTIP}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* The role view selector needs real width; below sm the facility
              identity takes priority and the selector lives in the inspector. */}
          <div className="hidden sm:block">
            <RoleViewSelector />
          </div>
          {!panelOpen && (
            <Button
              ref={panelToggleRef}
              size="sm"
              variant="outline"
              className="h-8"
              data-testid="workspace-open-panel"
              onClick={onOpenPanel}
            >
              <PanelRightOpen className="mr-1.5 h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Inspector</span>
            </Button>
          )}
        </div>
      </header>
    </TooltipProvider>
  );
}