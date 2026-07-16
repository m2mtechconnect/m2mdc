# ADR-0005: Compliance-claim type surface

Status: Accepted (Phase 1A). Evidence store deferred to Phase 2.

## Context

Marketing and dashboard surfaces reference "PIPEDA / Law 25 / ISO 27001 / SOC 2 / HIPAA / OSFI / Canadian residency / carbon neutrality / Tier 3 certification" without an evidence pipeline. Legal review is listed as an external blocker.

## Decision

Introduce `src/lib/compliance/types.ts` with a discriminated `ClaimStatus` enum:

```
applicable  → framework in scope
configured  → requirement configured in product
evidence    → evidence collected, unassessed
assessed    → internal / external assessment recorded
certified   → third-party certification issued
not-assessed → no defensible claim; explicit reason required
```

A default registry (`DEFAULT_COMPLIANCE_REGISTRY`) starts every framework at a defensible status:

- PIPEDA / QC-Law25 → `applicable` with a `notAssessedReason` explaining no independent assessment.
- ISO 27001 / SOC 2 / HIPAA / OSFI / Carbon-Neutral / Uptime-Tier → `not-assessed` with framework-appropriate reasons.
- CA-Residency → `configured` with a note that residency evidence pipeline is Phase 2.

Phase 1A ships types only. No copy sweep in this phase. Consumers of compliance strings across `src/pages/`, `src/components/`, and `src/data/` remain as-is; Phase 1B will migrate them to the registry.

## Rules

- No component may render `"Certified"` for a framework whose registry entry is not `certified`.
- Every negative status (`not-assessed`) requires a `notAssessedReason`.
- Legal review of the current copy is a blocker (see `docs/remediation/external-blockers.md` §5).

## Consequences

A single source of truth exists for compliance-status semantics. Phase 1B copy edits and the Phase 2 evidence store can build on this without renaming.