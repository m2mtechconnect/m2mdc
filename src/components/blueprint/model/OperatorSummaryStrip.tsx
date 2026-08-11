/**
 * Stage 7K — four compact operator metrics. Replaces the Executive Summary
 * card wall. No decorative totals, no vanity counts, and every metric shows
 * its evidence state in text.
 */
import { EvidenceChip } from './EvidenceChip';
import type { OperatorMetric } from '@/pages/blueprint/operatorModel';

export function OperatorSummaryStrip({ metrics }: { metrics: OperatorMetric[] }) {
  return (
    <section aria-label="Operator summary" data-testid="blueprint-operator-summary">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.id} className="min-w-0 bg-card px-3 py-2.5" data-metric={metric.id}>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{metric.label}</dt>
            <dd className="mt-0.5">
              <span className="block truncate text-lg font-semibold tabular-nums text-foreground">
                {metric.value}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-1.5">
                <EvidenceChip state={metric.state} />
                <span className="min-w-0 truncate text-[11px] text-muted-foreground">{metric.detail}</span>
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}