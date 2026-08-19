# Phase 8 - Truth suite shards 1 and 3

## Shard 1/4
68/68 passed (6.1m). No action required.

## Shard 3/4 - 7 failures, all triaged
| Failure | Diagnosis | Fix |
|---|---|---|
| `/account/access-control` deep link: 72 console errors | React key warning. The Supabase test mock returned `user_roles` rows without `id`, so every `<TableRow key={undefined}>` collided. Product side keyed on `id` with no fallback. | Mock now returns the real row shape (`id`, `scope`, `granted_at`, `expires_at`); `AccessControl` falls back to a composite `user_id:role:scope` key. |
| `/data-centre-twin?view=simulation` deep link: 20s timeout | Harness budget, not a defect - the WebGL scene is CPU-rasterized here (see Phase 7). | 60s timeout for twin/infrastructure deep links. |
| role=engineer/executive/manager/security_admin nav clicks | `/blueprint` legitimately resolves to the canonical child `/blueprint/default`; the spec asserted byte-identical URLs. | Assert the landed path is inside the declared destination. |
| back/forward history | Stale labels: the spec clicked "Build Data Centre Twin" / "Subsystem Agents", which no longer exist in the canonical header. | Use canonical labels "OpenUSD Asset Pipeline" / "Agents & Optimization". |

Only one of the seven was a product defect (the unkeyed roster rows); the rest
were harness drift against the Canonical Information Architecture.

## Verification
Re-ran `navigation-full-surface.spec.ts`: all previously failing cases pass
(`/account/access-control` 6.3s, `?view=simulation` 18.3s, per-role nav 3.6-4.3s).
The full-file re-run exceeded the sandbox command budget; shard-level closure
belongs to the CI lane (`.github/workflows/aura-truth-suite.yml`).

Verdict: **PHASE_8_PARTIAL** - shard 1 closed, shard 3 defects fixed and
individually verified, shard 4 not yet executed.
