/**
 * Export controls for a recorded simulation run. Disabled with a stated
 * reason when no run exists, so the control can never emit an empty file.
 */
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { downloadPayload } from '@/lib/provenance/exporters';
import { buildRunExportPayload, runExportFilename } from '../runExport';
import type { WorkspaceRun } from '../scenarioEngine';

export function RunExportControls({ run }: { run: WorkspaceRun | null }) {
  const disabled = run === null;
  const reason = 'Export becomes available once a scenario run has completed.';

  return (
    <div className="space-y-1.5" data-testid="run-export">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Export run</p>
      <div className="flex gap-1.5">
        {(['csv', 'json'] as const).map((format) => (
          <Button
            key={format}
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2 text-[11px]"
            disabled={disabled}
            aria-describedby={disabled ? 'run-export-reason' : undefined}
            data-testid={`run-export-${format}`}
            onClick={() => run && downloadPayload(buildRunExportPayload(run), format, runExportFilename(run, format))}
          >
            <Download className="h-3 w-3" aria-hidden="true" />
            {format.toUpperCase()}
          </Button>
        ))}
      </div>
      <p id="run-export-reason" className="text-[11px] text-muted-foreground">
        {disabled ? reason : 'Includes baseline and scenario KPIs with per-metric provenance.'}
      </p>
    </div>
  );
}
