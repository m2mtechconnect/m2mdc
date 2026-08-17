# Operational isolation

Proven by `src/data/dsxReference/__tests__/referenceBaseline.test.ts`:

| Property | Test | Result |
| --- | --- | --- |
| Reference data cannot mutate Montreal records | no reference record carries `site === 'Montreal'` | pass |
| Montreal cannot silently fall back to DSX values | `referenceKpi('montreal-dsx-aligned-scenario', 'pue')` returns `null` | pass |
| Reference facilities do not affect operational totals | `operationalFacilities()` is empty; every facility has `countsTowardOperationalTotals === false` | pass |
| Derived scenarios stay distinguishable | Montreal is `DERIVED_SCENARIO` / `SIMULATED_NOT_MEASURED` / authored by AURA | pass |
| NVIDIA values never claim measurement | every record `is_measured === false`, `is_operational === false`, `operational_status === 'REFERENCE_ONLY'` | pass |
| Compare rejects incompatible metrics | `comparableMetric` rejects unit mismatch and unsupplied metrics | pass |
| Archived mock data excluded by default | `AURA_LEGACY_SYNTHETIC_BASELINE_V1` marked archived, non-authoritative | pass |

Not yet proven, because the page-by-page migration (Phase 7) has not been
executed: export lineage, search classification, assistant grounding, RLS on
reference records, admin-only dataset activation, re-import idempotency,
version immutability and rollback restoration.
