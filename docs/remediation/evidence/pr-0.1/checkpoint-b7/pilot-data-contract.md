# PR-0.1 Checkpoint B7.4E — Pilot Data Contract

Anchor: `b1f26438195f141fbc5130f18a3bd6e0133e5ac5`
Inherits: B7.4D (`5f616cb0dfa547bc33534b5625b5d7214869c2e2fb0830be72de94d67ac2a7f7`).
Scope: one approved-user, read-only AURA overview + one linked inspection.

## Overview: `/pilot/overview`

| Field | Value |
|---|---|
| Selected source | `public.data_centre_twins` |
| Permitted columns | `id, name, city, region_code, tier, capacity_kw, pue_target, updated_at, created_at, created_by_user` |
| Primary identifier | `id` (uuid) |
| Tenant / ownership predicate | `created_by_user = auth.uid()` (client filter; RLS is the authoritative boundary) |
| Approved-user requirement | `profiles.is_approved = true` enforced upstream in `AuthenticatedApp` before `/pilot/*` mounts |
| Minimum role | standard authenticated user (no elevated role required or requested) |
| Validation rule | row exists AND RLS returned it; fields shown verbatim |
| Provenance rule | table+column path + owner uuid disclosed inline in the page copy |
| Freshness rule | `updated_at` shown as ISO-8601 timestamp; no synthetic recency |
| Stale-data behaviour | N/A for overview rows — timestamps are shown as-is |
| Missing-data behaviour | empty state: "No twins are visible under your account." |
| Unavailable behaviour | explicit `unavailable` state with sanitized reason code; no fallback rows |
| Record limit / ordering | `LIMIT 25`, `ORDER BY updated_at DESC` |
| Expected query count | 1 SELECT + 1 `auth.getUser()` on mount |
| Prohibited classifications | seeded/demo/fixture rows, cross-tenant rows |
| Unverified remote assumptions | effective remote RLS enforcement; presence of validated rows for the pilot user |

## Inspection: `/pilot/asset/:twinId`

| Field | Value |
|---|---|
| Selected sources | `public.data_centre_twins`, `public.twin_kpi_snapshots` |
| Permitted twin columns | same set as overview |
| Permitted KPI columns | `id, twin_id, kpi_key, kpi_value, kpi_unit, domain, snapshot_at` |
| Primary identifier | `data_centre_twins.id` from URL |
| Tenant predicate | inherited: KPI rows are visible only via the owner-scoped twin subselect |
| Validation rule | KPI is "fresh" only if `kpi_value IS NOT NULL` AND `now - snapshot_at ≤ 24h`; else `stale` or `unvalidated` |
| Provenance rule | source table displayed inline; row keyed by `id` |
| Freshness rule | 24-hour horizon (`KPI_FRESHNESS_HORIZON_MS`) — displayed per row |
| Stale-data behaviour | labelled `stale` in amber; never re-labelled as fresh |
| Missing-data behaviour | explicit empty state per section |
| Unavailable behaviour | explicit alert with sanitized reason; no fallback rows |
| Record limit / ordering | `LIMIT 50`, `ORDER BY snapshot_at DESC` |
| Expected query count | 2 SELECT + 1 `auth.getUser()` on mount |
| Prohibited classifications | fabricated/interpolated KPI values, synthetic timestamps |
| Unverified remote assumptions | effective remote RLS on `twin_kpi_snapshots`; existence of at least one snapshot per pilot twin |

## Failure-mode summary

A record may render as "fresh"/"validated" ONLY when every contract predicate above is satisfied for that record. Otherwise the UI must render one of: `stale`, `unvalidated`, `empty`, `denied`, or `unavailable`. Under no failure mode may the adapter substitute fixture or interpolated data.