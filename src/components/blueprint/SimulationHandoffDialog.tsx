/**
 * Simulation handoff confirmation.
 *
 * Blueprint owns design; Simulation owns execution. This dialog previews the
 * exact context that will travel to the Simulation workspace and states
 * plainly that confirming performs navigation only: no run is created,
 * queued or started, and no record is written.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, ShieldCheck } from 'lucide-react';

export interface SimulationHandoffPreview {
  facilityName: string;
  blueprintId: string;
  versionLabel: string;
  targetUrl: string;
}

interface SimulationHandoffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: SimulationHandoffPreview;
  onConfirm: () => void;
}

export function SimulationHandoffDialog({
  open,
  onOpenChange,
  preview,
  onConfirm,
}: SimulationHandoffDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="simulation-handoff-dialog" className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-primary" aria-hidden />
            Open this design in Simulation
          </AlertDialogTitle>
          <AlertDialogDescription>
            Simulation will open in draft state with the context below. You configure and
            start any run there.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <dl className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">Facility</dt>
            <dd className="min-w-0 truncate font-medium text-foreground">{preview.facilityName}</dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">Blueprint</dt>
            <dd className="min-w-0 truncate font-mono text-xs text-foreground">
              {preview.blueprintId}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">Version</dt>
            <dd className="min-w-0 truncate text-foreground">{preview.versionLabel}</dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">Opens</dt>
            <dd className="min-w-0 break-all font-mono text-xs text-foreground">
              {preview.targetUrl}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">State</dt>
            <dd>
              <Badge variant="outline" className="text-[11px]">
                Draft - not executed
              </Badge>
            </dd>
          </div>
        </dl>

        <div
          className="flex items-start gap-2 rounded-md border border-border bg-card p-3"
          data-testid="simulation-handoff-no-mutation-notice"
        >
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          <p className="text-xs text-muted-foreground">
            No simulation runs will be created, queued or started, and nothing in this
            blueprint will be modified. Confirming only navigates to the Simulation
            workspace with the context above.
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} data-testid="simulation-handoff-confirm">
            Open Simulation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
