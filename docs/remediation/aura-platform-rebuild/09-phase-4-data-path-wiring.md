# Phase 4 - Backend data-path wiring

Scope: replace fabricated frontend data with authorized backend records, starting with the
surface that made the largest untrue claim. Verified in a browser against the live schema.

## Defect found

`/search` was registered in the capability registry with `dataSource: "Authorized AURA records"`.
The page actually rendered a hardcoded array: a "HIPAA Compliance Report" and a "Marketing
Strategy" document, each attributed to a Google Drive or SharePoint connector that does not
exist in `connector_definitions`. No query was ever issued. The registry claim and the runtime
behaviour disagreed, which is exactly the class of defect this program exists to remove.

## Implementation

| File | Role |
| --- | --- |
| `src/search/platformSearchApi.ts` | Typed search service. Declares one `SearchSource` per record family, builds the PostgREST `or=` filter, maps rows to results carrying `recordTable` + `recordId`. |
| `src/search/RecordResultsList.tsx` | Renders results with their record citation and a deep link. |
| `src/search/RecordKindFilter.tsx` | Per-kind filter with counts, including explicit `0`. |
| `src/pages/Search.tsx` | Rewritten on `useQuery`; deep-linkable via `?q=`. |

Record families searched, all RLS-scoped (the database, not the client, decides visibility):

| Kind | Table | Deep link |
| --- | --- | --- |
| Facilities | `data_centre_twins` | `/blueprint/:id` |
| Agents | `agent_definitions` | `/app/agents/:slug/detail` |
| Connections | `connection_instances` | `/manage/connections?connection=:id` |
| Simulation runs | `simulation_runs` | `/simulation?run=:id` |

Truthfulness properties:

- Latency is measured around the round trip, not synthesised.
- "Records found" is the returned row count; "record types searched" is the number of sources queried.
- A source that fails (for example a permission error) is reported in `failures` and surfaced in the
  UI; the remaining sources still return. Search degrades, it does not lie.
- `sanitizeSearchTerm` strips `,`, `(`, `)` and `%` so a query cannot restructure or widen its own filter.

## Deletions

| Path | Reason |
| --- | --- |
| `src/lib/mock/dcSimulationData.ts` | Zero references anywhere in `src/` or `tests/`. |
| `src/components/search/SearchResultsList.tsx` | Rendered the fabricated document results. |
| `src/components/search/SearchFilters.tsx` | Filtered by document types that do not exist. |

## Registry correction

`src/config/dsxCapabilityRegistry.ts` now points `runtimeEvidence` at the service, and records the
real limitations: substring matching only (no ranking, stemming or semantic retrieval), four record
families, RLS-scoped results.

## Evidence

- Unit tests: `src/search/__tests__/platformSearchApi.test.ts`, 12 tests covering sanitisation,
  filter construction, source declarations, per-source failure isolation and measured latency.
- Full suite: 1774 passed / 91 skipped (was 1762).
- `tsgo --noEmit` clean; `bun run build` clean including the SEO gate.
- Browser run at `/search?q=a` as an engineer-role user: 15 records across 4 record types in 467 ms,
  every row showing its source table and UUID. No console errors.

## Blockers

- `search_history` and `search_analytics` exist in the schema and remain unwritten. Recording
  queries is a product decision with a privacy dimension, not a wiring fix; left untouched.
- Other surfaces still hold fixture data (`aocMockData`, `simulationMockData`). Both are
  failure-path fallbacks behind a backend call rather than unconditional fiction, so they are
  ranked below `/search` and remain open for a later phase.
