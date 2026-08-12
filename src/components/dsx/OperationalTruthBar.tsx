/**
 * Persistent operational truth bar shared by every workspace.
 * Connection health and data freshness are reported as separate facts.
 */
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';
import { ConnectionState, DataModeBadge, FreshnessIndicator, SafetyChip } from './StateBadges';
import { EvidenceQualityBar } from './EvidenceQualityBar';
import { capability } from '@/dsx/workspaces/availability';
import { EVIDENCE_BETA_SITE } from '@/dsx/fixtures/evidenceBetaFacility';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex min-w-0 shrink-0 flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="truncate text-xs font-medium text-foreground">{value}</span>
    </span>
  );
}

export function OperationalTruthBar() {
  const { rt, freshness, constraints, openConstraint } = useWorkspace();
  const exchange = capability('dsx_exchange_runtime');
  const window = rt.bundle.metrics.pue?.observation_window;
  const unassessable = constraints.filter((c) => c.status === 'unavailable');

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Operational truth bar"
      tabIndex={0}
      data-testid="dsx-truth-bar"
      data-mode={rt.snapshot.data_mode}
      className="relative flex w-full min-w-0 max-w-full flex-nowrap items-center gap-x-4 gap-y-2 overflow-x-auto border-b border-border bg-muted/40 px-3 py-2 sm:flex-wrap sm:gap-x-5 sm:overflow-x-visible sm:px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Field label="Facility" value={EVIDENCE_BETA_SITE.name} />
      <span className="flex shrink-0 flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Data mode</span>
        <DataModeBadge mode={rt.snapshot.data_mode} />
      </span>
      <span className="flex shrink-0 flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Calibration</span>
        <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-[11px] text-amber-800 dark:text-amber-200">
          Uncalibrated
        </Badge>
      </span>
      <Field label="Last validated observation" value={rt.snapshot.last_observed_at ?? 'none'} />
      <span className="flex shrink-0 flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">DSX Exchange</span>
        <ConnectionState state="unavailable" label="Exchange" />
      </span>
      <Field label="Active scenario" value={rt.timeline.replace(/_/g, ' ')} />
      <Field
        label="Observation window"
        value={window ? `${window.from.slice(11, 19)} → ${window.to.slice(11, 19)} UTC` : 'none'}
      />
      <span className="flex shrink-0 flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Connection health</span>
        <ConnectionState state={rt.snapshot.connection_state} label="Source" />
      </span>
      <span className="flex shrink-0 flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Data freshness</span>
        <FreshnessIndicator freshness={freshness} />
      </span>
      <EvidenceQualityBar
        compact
        accepted={rt.snapshot.accepted.length}
        rejected={rt.snapshot.rejected.length}
      />
      {unassessable.length > 0 && (
        <span className="flex shrink-0 flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Coverage</span>
          <button
            type="button"
            data-testid="dsx-unassessable-domains"
            onClick={() => openConstraint(unassessable[0])}
            className="rounded-sm border border-zinc-500/50 bg-zinc-500/10 px-2 py-0.5 text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {unassessable.length} domain(s) cannot be assessed
          </button>
        </span>
      )}
      <SafetyChip className="shrink-0 sm:ml-auto" />
      {/* Anchored to the bar (which is `relative`) so this visually hidden box
          cannot escape the scroll container and widen the document. */}
      <span className="sr-only left-0 top-0">{exchange.reason}</span>
    </div>
  );
}