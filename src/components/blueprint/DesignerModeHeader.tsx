/**
 * Designer Mode Header - Blueprint workspace
 *
 * Stage 7J: one compact header. It carries identity, facility facts and every
 * Blueprint-level action in a single band so the modelling workspace stays
 * above the fold. There is exactly ONE edit-state label and exactly ONE
 * assistant entry point.
 *
 * Simulation ownership: this header navigates to the Simulation workspace and
 * never creates, queues or starts a run.
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Download,
  Edit3,
  ExternalLink,
  Info,
  Lock,
  MapPin,
  PanelRightClose,
  PanelRightOpen,
  Save,
  Server,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildSimulationHandoffUrl, useSimulationPermissions } from '@/simulation/handoff';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DesignerModeHeaderProps {
  twinName?: string;
  twinId?: string;
  location?: string;
  showSimulationLink?: boolean;
  onSave?: () => void;
  hasUnsavedChanges?: boolean;
  /** Route-authoritative blueprint id used for the Simulation handoff. */
  blueprintId?: string;
  /** Explicitly selected blueprint version / snapshot. */
  versionId?: string | number | null;
  /** Blueprint tab restored when the user presses Browser Back. */
  returnTab?: string;
  /** Facility facts rendered as compact badges. */
  tier?: string;
  capacityLabel?: string;
  rackLabel?: string;
  updatedAt?: Date | null;
  /** Disclosure shown when a stored value had to be reinterpreted. */
  dataNote?: string | null;
  onBack?: () => void;
  onDownload?: () => void;
  assistantOpen?: boolean;
  onToggleAssistant?: () => void;
  assistantLabel?: string;
  /** Optional extra action (for example, create a twin from this blueprint). */
  extraAction?: ReactNode;
}

export function DesignerModeHeader({
  twinName = 'Data Centre Twin',
  twinId = 'default',
  location,
  showSimulationLink = true,
  onSave,
  hasUnsavedChanges = false,
  blueprintId,
  versionId = null,
  returnTab,
  tier,
  capacityLabel,
  rackLabel,
  updatedAt,
  dataNote,
  onBack,
  onDownload,
  assistantOpen = false,
  onToggleAssistant,
  assistantLabel = 'Assistant',
  extraAction,
}: DesignerModeHeaderProps) {
  const navigate = useNavigate();
  const { canViewSimulation, canConfigureSimulation } = useSimulationPermissions();
  const canHandOff = canViewSimulation && canConfigureSimulation;

  /**
   * Navigation ONLY. Blueprint must never create, queue or start a run, so
   * this handler performs no mutation and calls no simulation service.
   */
  const handleOpenInSimulation = () => {
    navigate(
      buildSimulationHandoffUrl({
        blueprintId: blueprintId ?? twinId,
        versionId,
        twinId: twinId !== blueprintId ? twinId : null,
        returnTab,
      }),
    );
  };

  return (
    <header className="mb-4 rounded-lg border border-border bg-card" data-testid="blueprint-header">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 shrink-0 px-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
            Back
          </Button>
        )}

        <div className="flex min-w-0 items-center gap-2">
          <Server className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <h1 className="truncate text-base font-semibold text-foreground">
            {twinName}
          </h1>
        </div>

        {/* Exactly one edit-state label. */}
        <Badge variant="outline" className="gap-1 border-success/40 text-success">
          <Edit3 className="h-3 w-3" aria-hidden />
          Designer - editable
        </Badge>

        {hasUnsavedChanges && (
          <Badge variant="outline" className="border-warning text-warning">
            Unsaved changes
          </Badge>
        )}

        <Tooltip>
          <TooltipTrigger aria-label="About Designer Mode" className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Info className="h-4 w-4 text-muted-foreground" aria-hidden />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-sm">
              Designer mode edits the facility model. Scenarios and runs are owned by
              the Simulation workspace: open this version there to configure or execute a run.
            </p>
          </TooltipContent>
        </Tooltip>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {onToggleAssistant && (
            <Button
              variant={assistantOpen ? 'secondary' : 'outline'}
              size="sm"
              className="h-8 gap-1.5"
              onClick={onToggleAssistant}
              aria-expanded={assistantOpen}
              data-testid="blueprint-assistant-toggle"
            >
              {assistantOpen ? (
                <PanelRightClose className="h-4 w-4" aria-hidden />
              ) : (
                <PanelRightOpen className="h-4 w-4" aria-hidden />
              )}
              {assistantLabel}
            </Button>
          )}
          {extraAction}
          {onDownload && (
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onDownload}>
              <Download className="h-4 w-4" aria-hidden />
              Download JSON
            </Button>
          )}
          {onSave && (
            <Button
              size="sm"
              onClick={onSave}
              disabled={!hasUnsavedChanges}
              className={cn('h-8 gap-1.5')}
            >
              <Save className="h-4 w-4" aria-hidden />
              Save
            </Button>
          )}
          {showSimulationLink && canHandOff && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenInSimulation}
              data-testid="blueprint-open-in-simulation"
              className="h-8 shrink-0 gap-1.5"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              Open in Simulation
            </Button>
          )}
          {showSimulationLink && !canHandOff && (
            <div
              className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1"
              data-testid="blueprint-simulation-access-required"
            >
              <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <p className="text-[11px] text-muted-foreground">
                Your role cannot configure or start simulation runs.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Facility facts: one wrapping row of compact badges. */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-3 py-2">
        {location && (
          <Badge variant="outline" className="gap-1 text-[11px] font-normal">
            <MapPin className="h-3 w-3" aria-hidden />
            {location}
          </Badge>
        )}
        {tier && <Badge variant="outline" className="text-[11px] font-normal">{tier}</Badge>}
        {capacityLabel && (
          <Badge variant="outline" className="text-[11px] font-normal" data-testid="blueprint-capacity-badge">
            {capacityLabel}
          </Badge>
        )}
        {rackLabel && <Badge variant="outline" className="text-[11px] font-normal">{rackLabel}</Badge>}
        {versionId != null && (
          <Badge variant="outline" className="text-[11px] font-normal">v{String(versionId)}</Badge>
        )}
        {updatedAt && (
          <span className="text-[11px] text-muted-foreground">
            Updated {updatedAt.toLocaleString()}
          </span>
        )}
      </div>

      {dataNote && (
        <p
          className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground"
          data-testid="blueprint-data-note"
        >
          {dataNote}
        </p>
      )}
    </header>
  );
}
