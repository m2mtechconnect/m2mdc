# ADR 0006 — Truth-in-UI and Per-Metric Provenance

Status: Accepted (Phase 1A.3.g, 2026-07-17)
Supersedes: —
Amends: ADR 0004 (Data Provenance Model), ADR 0005 (Compliance Claim Types)

## Context

Phase 0 established that AURA presented synthetic and hard-coded values as
operational readings ("LIVE" chrome, live-styled KPI cards, "Sovereign
Compliance 98%" copy) without any wired external source. Phase 1A retrofit
every reachable operational surface with provenance and disabled export
paths that would have carried demonstration values into audit artefacts.

This ADR captures the resulting invariants so future work cannot
regress them.

## Decision

1. **Validated data is the only path to `live`.** A metric may render
   as `live` only when its source connection is `connected` **and** the
   payload passed the Zod schema at the Kit boundary
   (`fetchStatusValidated`). Every other state (initial/`connecting`,
   `unavailable`, schema-`invalid`, `disabled`, stale) is fail-closed:
   the value is `null` and provenance is `unavailable` or `demo`.

2. **Fail-closed initial, invalid, unavailable, and stale states.**
   - Initial mount: `provenance = unavailable`, never optimistic-`live`.
   - Schema-invalid response: downgrade to `demo` when the source is
     configured but returning a bad payload, so the fallback disclosure
     is honest ("Kit response invalid — demonstration data shown").
   - Network-unavailable: `unavailable`, value `null`, badge visible.
   - Stale (source timestamp older than the freshness budget):
     value `null`, provenance `unavailable`, badge indicates staleness.
     Live exports downgrade with `downgradeReason: 'stale'`.

3. **Separation of three concerns.** The UI carries three orthogonal
   signals:
   - **Source connection state** (`SourceConnectionState`): whether the
     upstream is reachable and validated. Rendered by
     `StreamStatusBanner`.
   - **Rendered fallback** (`demo` scaffolding vs. `unavailable`
     affordance): what the user sees when the source is not `connected +
     validated`. Encoded in `kitMetric()`'s precedence rules.
   - **Metric provenance** (`DataProvenance`): the classification that
     travels with the value itself, rendered by `ProvenanceBadge` and
     recorded on every export record.
   Conflating any two of these has produced the "silent fallback"
   defects we saw pre-Phase 1A.

4. **Per-metric provenance and metric catalogs.** Section-level
   provenance is insufficient (Phase 1A.3.c.1 correction). Every visible
   KPI has a stable id in `src/lib/provenance/metricCatalog.ts` and a
   `ProvenancedMetric<T>` at render time; `MetricProvenanceManifest`
   surfaces the per-metric classification on each domain view.

5. **Staleness rules.** Freshness budgets live per source
   (`src/lib/provenance/staleness.ts`). A metric whose
   `sourceTimestamp` is older than its budget is marked `isStale`;
   `live` and `derived` metrics that become stale are downgraded to
   `unavailable` at both render time and export time. Simulated, demo,
   and static metrics are exempt (they carry no observation time).

6. **Provenance-preserving export schema.** `EXPORT_SCHEMA_VERSION`
   (currently `1.0.0`) governs CSV, JSON, Markdown, and print outputs.
   Every row carries `metricId`, `provenance`, `source`, `observedAt`,
   `stale`, and a `downgradeReason` when the record was downgraded.
   Unavailable rows serialise `value: null` — never a fabricated zero,
   never a silent fallback. Exports for surfaces without an audited
   source are disabled with a user-visible reason
   (`describeExportBlock`).

## Rejected alternatives

- **Optimistic-`live` defaults.** Considered rendering the last-good
  value with `live` while re-validating in the background. Rejected:
  during the initial mount, disabled state, and every failed
  validation the UI would carry an untrue "live" claim. Failing closed
  is cheaper than every future audit finding.
- **Silent fallback (swap to demo without disclosure).** Considered
  swapping in `mockData` when the Kit fails so the UI remains
  populated. Rejected: this is exactly the pre-Phase 1A defect. Users
  must be told when they are looking at demonstration values.
- **Section-only provenance labelling.** Considered a single banner per
  domain view. Rejected in 1A.3.c.1 review because a mixed section (some
  `demo`, some `unavailable`, some `static` targets) cannot be honestly
  summarised by one label. Per-metric provenance is now mandatory.

## Consequences

- New surfaces MUST register their metrics in `metricCatalog.ts` and
  render via `KpiCardProvenance` / `MetricValue` — a bare number is a
  review-blocking regression.
- Exports MUST route through `src/lib/provenance/exporters/`. Ad-hoc
  CSV/JSON writers are disallowed.
- Simulation chrome may not use "LIVE" copy; use "SIMULATION" with
  `data-provenance="simulated"`.
- `capability-traceability.md` statuses do NOT upgrade because
  provenance is truthful — Omniverse, telemetry, simulation, and
  compliance capabilities remain at their Phase 0 status until wired.

## References

- `src/lib/provenance/{types,kitMetrics,metricCatalog,staleness}.ts`
- `src/lib/provenance/exporters/schema.ts`
- `src/components/provenance/{ProvenanceBadge,KpiCardProvenance,MetricProvenanceManifest}.tsx`
- `tests/truth-in-ui/*.spec.ts` + `docs/remediation/evidence/phase-1a3/`
- ADR 0004 (Data Provenance Model), ADR 0005 (Compliance Claim Types)