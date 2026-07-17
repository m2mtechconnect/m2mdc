/**
 * DomainProvenanceHeader — shared truth-in-UI header for domain views,
 * chart cards, and any operational surface that shows fixture / simulated
 * / static data at the surface level.
 *
 * Renders:
 *   • a `ProvenanceBadge` (semantic color + tooltip)
 *   • a visually-hidden accessible description (`aria-live="polite"`)
 *   • a `data-provenance` attribute on the wrapper for Playwright
 *
 * Phase 1A.3.c retrofit primitive. See
 * `docs/remediation/phase-1a3-scope.md` §4 for the classification rules.
 */

import { ProvenanceBadge } from './ProvenanceBadge';
import type { DataProvenance, ProvenanceMeta } from '@/lib/provenance/types';

interface DomainProvenanceHeaderProps {
  provenance: DataProvenance;
  sourceName: string;
  description?: string;
  /** Short label above the badge, e.g. "Thermal domain — data provenance". */
  ariaContext?: string;
  className?: string;
}

/**
 * The single accessible description string. Machine-readable and
 * screen-reader-friendly. Kept intentionally short to be spoken.
 */
function describe(p: DataProvenance, source: string): string {
  switch (p) {
    case 'live':
      return `Live data from ${source}.`;
    case 'derived':
      return `Derived from ${source}. Not a direct measurement.`;
    case 'simulated':
      return `Simulated by ${source}. Not a real measurement.`;
    case 'demo':
      return `Demonstration data from ${source}. Not a real measurement.`;
    case 'static':
      return `Configured reference value from ${source}. Not a live reading.`;
    case 'unavailable':
      return `Data unavailable from ${source}.`;
  }
}

export function DomainProvenanceHeader({
  provenance,
  sourceName,
  description,
  ariaContext,
  className,
}: DomainProvenanceHeaderProps) {
  const meta: ProvenanceMeta = {
    provenance,
    source: sourceName,
    note: description,
  };
  const text = describe(provenance, sourceName);
  return (
    <div
      data-provenance={provenance}
      data-provenance-source={sourceName}
      data-testid="domain-provenance-header"
      className={className ?? 'flex items-center gap-2'}
    >
      {ariaContext ? (
        <span className="sr-only">{ariaContext}: </span>
      ) : null}
      <ProvenanceBadge meta={meta} compact />
      <span className="sr-only" aria-live="polite">
        {text}
      </span>
    </div>
  );
}