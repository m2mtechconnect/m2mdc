/**
 * Persistent operational truth bar shared by every workspace.
 * Connection health and data freshness are reported as separate facts.
 */
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';
import { ConnectionState, DataModeBadge, FreshnessIndicator, SafetyChip } from './StateBadges';
import { capability } from '@/dsx/workspaces/availability';
import { EVIDENCE_BETA_SITE } from '@/dsx/fixtures/evidenceBetaFacility';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex min-w-0 flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="truncate text-xs font-medium text-foreground">{value}</span>
    </span>
  );
}

export function OperationalTruthBar() {
  const { rt, freshness } = useWorkspace();
  const exchange = capability('dsx_exchange_runtime');
  const window = rt.bundle.metrics.pue?.observation_window;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="dsx-truth-bar"
      data-mode={rt.snapshot.data_mode}
      className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border bg-muted/40 px-4 py-2"
    >
      <Field label="Facility" value={EVIDENCE_BETA_SITE.name} />
      <span className="flex flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Data mode</span>
        <DataModeBadge mode={rt.snapshot.data_mode} />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Calibration</span>
        <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-[11px] text-amber-800 dark:text-amber-200">
          Uncalibrated
        </Badge>
      </span>
      <Field label="Last validated observation" value={rt.snapshot.last_observed_at ?? 'none'} />
      <span className="flex flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">DSX Exchange</span>
        <ConnectionState state="unavailable" label="Exchange" />
      </span>
      <Field label="Active scenario" value={rt.timeline.replace(/_/g, ' ')} />
      <Field
        label="Observation window"
        value={window ? `${window.from.slice(11, 19)} → ${window.to.slice(11, 19)} UTC` : 'none'}
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Connection health</span>
        <ConnectionState state={rt.snapshot.connection_state} label="Source" />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Data freshness</span>
        <FreshnessIndicator freshness={freshness} />
      </span>
      <SafetyChip className="ml-auto" />
      <span className="sr-only">{exchange.reason}</span>
    </div>
  );
}