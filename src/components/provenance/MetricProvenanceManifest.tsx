/**
 * MetricProvenanceManifest — accessible, testable per-metric provenance
 * disclosure for a domain surface.
 *
 * Renders a visible `<details>` block titled "Data provenance (N metrics)"
 * that expands into a `<dl>` list. Each entry emits:
 *   • `data-metric-id`        — stable enumeration key
 *   • `data-provenance`       — the specific classification
 *   • `data-provenance-source`— the actual source string
 * so that tests, Playwright, and future export routines can consume the
 * manifest without scraping tile markup.
 *
 * Accessibility:
 *   • Rendered as a native `<details>/<summary>` — keyboard-friendly.
 *   • The list is a semantic `<dl>` with `<dt>` label / `<dd>` value.
 *   • Each row includes an sr-only description sentence.
 */

import { ProvenanceBadge } from './ProvenanceBadge';
import type { MetricCatalogEntry } from '@/lib/provenance/metricCatalog';
import { describeMetric } from '@/lib/provenance/metricCatalog';

interface MetricProvenanceManifestProps {
  domain: string;
  metrics: MetricCatalogEntry[];
  /** Optional heading override. Defaults to "Data provenance (N metrics)". */
  title?: string;
  className?: string;
}

export function MetricProvenanceManifest({
  domain,
  metrics,
  title,
  className,
}: MetricProvenanceManifestProps) {
  const heading = title ?? `Data provenance (${metrics.length} metrics)`;
  return (
    <details
      data-testid="metric-provenance-manifest"
      data-domain={domain}
      data-metric-count={metrics.length}
      className={
        className ??
        'rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs'
      }
    >
      <summary className="flex min-h-[24px] cursor-pointer select-none items-center font-medium text-muted-foreground">
        {heading}
      </summary>
      <dl className="mt-2 divide-y divide-border/40">
        {metrics.map((m) => (
          <div
            key={m.id}
            data-metric-id={m.id}
            data-provenance={m.provenance}
            data-provenance-source={m.source}
            className="grid grid-cols-[1fr_auto] items-start gap-2 py-1.5"
          >
            <dt className="text-foreground">
              <span className="font-medium">{m.label}</span>
              {m.reference ? (
                <span className="ml-2 text-muted-foreground">
                  · Reference: {m.reference}
                </span>
              ) : null}
            </dt>
            <dd className="flex items-center gap-2">
              <ProvenanceBadge
                meta={{
                  provenance: m.provenance,
                  source: m.source,
                  note: m.description,
                }}
                compact
              />
              <span className="sr-only">{describeMetric(m)}</span>
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}