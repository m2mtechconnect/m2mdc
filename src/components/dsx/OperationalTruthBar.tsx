/**
 * Persistent operational truth bar shared by every workspace.
 * Connection health and data freshness are reported as separate facts.
 */
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';
import { ConnectionState, DataModeBadge, FreshnessIndicator, SafetyChip } from './StateBadges';
import { EvidenceQualityBar } from './EvidenceQualityBar';
import { capability } from '@/dsx/workspaces/availability';
import { EVIDENCE_BETA_SITE } from '@/dsx/fixtures/evidenceBetaFacility';

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 leading-tight">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn('truncate text-xs font-medium text-foreground', mono && 'font-mono')}>{value}</span>
    </div>
  );
}

function Cluster({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section aria-label={label} className="flex min-w-0 flex-col gap-3">
      {children}
    </section>
  );
}

function Chip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
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
      className="relative w-full min-w-0 max-w-full border-b border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 px-3 py-3 sm:grid-cols-2 sm:px-4 xl:grid-cols-4">
        {/* Facility identity and the trust level of what is displayed. */}
        <Cluster label="Facility context">
          <Field label="Facility" value={EVIDENCE_BETA_SITE.name} />
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Chip label="Data mode">
              <DataModeBadge mode={rt.snapshot.data_mode} />
            </Chip>
            <Chip label="Calibration">
              <Badge
                variant="outline"
                className="border-amber-500/50 bg-amber-500/10 text-[11px] text-amber-800 dark:text-amber-200"
              >
                Uncalibrated
              </Badge>
            </Chip>
          </div>
        </Cluster>

        {/* When the displayed evidence was observed. */}
        <Cluster label="Observation">
          <Field mono label="Last validated observation" value={rt.snapshot.last_observed_at ?? 'none'} />
          <Field
            label="Observation window"
            value={window ? `${window.from.slice(11, 19)} to ${window.to.slice(11, 19)} UTC` : 'none'}
          />
        </Cluster>

        {/* Where the evidence comes from. */}
        <Cluster label="Source systems">
          <Chip label="DSX Exchange">
            <ConnectionState state="unavailable" label="Exchange" />
          </Chip>
          <Field label="Active scenario" value={rt.timeline.replace(/_/g, ' ')} />
        </Cluster>

        {/* How healthy and how complete that evidence is. */}
        <Cluster label="Evidence health">
          <Chip label="Connection health">
            <ConnectionState state={rt.snapshot.connection_state} label="Source" />
          </Chip>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
            <Chip label="Data freshness">
              <FreshnessIndicator freshness={freshness} />
            </Chip>
            <EvidenceQualityBar
              compact
              accepted={rt.snapshot.accepted.length}
              rejected={rt.snapshot.rejected.length}
            />
          </div>
        </Cluster>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border bg-muted/40 px-3 py-2 sm:px-4">
        {unassessable.length > 0 && (
          <span className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Coverage</span>
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
        <SafetyChip className="ml-auto shrink-0" />
      </div>
      {/* Anchored to the bar (which is `relative`) so this visually hidden box
          cannot escape the scroll container and widen the document. */}
      <span className="sr-only left-0 top-0">{exchange.reason}</span>
    </div>
  );
}