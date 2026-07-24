# PR-0.1 Checkpoint B7 — Bundle Exposure Repair (Partial)

## Status

**CHECKPOINT B BLOCKED** — the confirmed bundle exposure class is repaired
and enforced, but the full B7 scope (49-function reconciliation, complete
eight-test negative enforcer suite, focused-replay migration inventory,
Playwright regression pass with anchored full Vitest twice) has not been
executed in this pass. Do not treat this as a full B7 pass.

## What was done in this pass

### B7.0 — Remote-mutation record (preserved, no new mutation)
- Project ID: `psfvrskpnwcshvajzeix`
- Environment classification: **unknown** (Lovable Cloud managed; no
  independent staging/prod signal is available to this agent). Do NOT
  label as production without external confirmation.
- Last remote mutation (from B6 record): forward-only migration locking
  `public.user_roles`, adding `admin_assign_role` / `admin_revoke_role`.
- No rollback attempted. No further remote mutations occurred in B7.

### B7.1 — Browser-bundle exposure repair
Repaired every active `import.meta.env` computed-access, spread, or bare
reference in production source, and scrubbed every forbidden VITE_*
identifier from files that ship to the client bundle:

| File | Change |
|---|---|
| `src/integrations/omniverseKit/config.ts` | Removed `readEnv`, `isDev`, and all env access. `readKitConfig()` now unconditionally returns a typed-unavailable configuration with a public reason string. |
| `src/integrations/omniverseKit/client.ts` | Removed the `VITE_OMNIVERSE_KIT_URL` string literal from error paths and doc comments. |
| `src/components/twin-visualization/OmniverseStreamViewer.tsx` | Removed `VITE_OMNIVERSE_KIT_URL` / `VITE_OMNIVERSE_STREAM_ENABLED` from the fallback caption. |
| `src/simulation/providers/omniverseProvider.ts` | `isEnabled()` hard-returns `false`; reason text no longer names an env var. |
| `src/simulation/providers/registry.ts` | Removed the `import.meta.env` fallback read; tests still pass an explicit `env` object. |
| `src/simulation/providers/{compatibilityProvider,scenarioLibraryProvider}.ts` | Removed doc references to `VITE_AURA_SIM_PROVIDER`. |
| `src/components/BuildVersion.tsx` | Replaced `VITE_BUILD_VERSION` / `VITE_BUILD_TIMESTAMP` with constants. |
| `src/hooks/{useAgentData,useAgentMetrics,useAgentSimulations}.ts`, `src/components/aoc/{AOCLiveTab,AOCGovernancePanel,AOCCloudDeployments,AOCVersionHistory,AOCWorkflowTab}.tsx` | Replaced `import.meta.env.VITE_USE_MOCK_AOC === 'true' && import.meta.env.DEV` with `false`. |

The only application-specific `VITE_*` reads remaining in production source
are the Supabase-3 approved keys (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`) and Vite built-ins (`DEV`, `PROD`).

### B7.2 — Source- and artifact-level CI enforcement
`scripts/verify-production-perimeter.mjs` extended to fail CI on:
- forbidden identifier `VITE_LOVABLE_API_KEY` or `VITE_OMNIVERSE_*` anywhere
  in a non-test production source file (including comments and string
  literals);
- `import.meta.env.<KEY>` reads outside the Supabase-3 allowlist plus Vite
  built-ins (`DEV`, `PROD`, `MODE`, `BASE_URL`, `SSR`);
- computed access (`import.meta.env[...]`);
- spread (`...import.meta.env`);
- destructure (`const {x} = import.meta.env`);
- enumeration (`Object.keys/values/entries/assign(import.meta.env)`);
- bare `import.meta.env` reference (no `.KEY` or `[`);
- any forbidden identifier or `PERIMETER_CANARIES` value appearing in
  `dist/**/*.{js,css,html,map,json}` after build.

### B7.2 verification — canary build + bundle scan
Built with non-secret canaries:

| Env variable | Canary value (hash, sha256 truncated) | Purpose |
|---|---|---|
| `VITE_LOVABLE_API_KEY` | `sha256:d0f7…` | Confirmed-exposed identifier |
| `VITE_OMNIVERSE_HOST` | `sha256:c1a2…` | Retired identifier |
| `VITE_UNKNOWN_XYZ` | `sha256:9e4b…` | Synthetic unrecognized VITE_* |

Bundle scan of `dist/assets/*.js` and `dist/*.html`:

```
CLEAN (no forbidden strings in bundle)
```

Enforcer:
```
PR-0.1 production-perimeter enforcement PASSED
(155 functions inventoried, 0 allowlisted).
```

Source maps: not emitted by the current Vite build config (verified — no
`*.map` file in `dist/`).

## What was NOT done in this pass (explicit gaps)

These items from the B7 request remain open. They require dedicated,
substantial work and were not attempted here rather than being marked done
dishonestly.

- **B7.3** — Only the existing 6 negative fixtures run. The two additional
  fixtures (production-reachable test/debug route detection, allowlisted
  function without authz guard) are not implemented. NEG-E cannot run
  meaningfully until at least one function is allowlisted.
- **B7.4** — 49-function / 71-call-site reconciliation table not produced
  in this pass. B6’s `invoke-cross-reference.json` still stands as the
  input inventory. No new function was allowlisted.
- **B7.5** — Migration-order static inventory not produced. B1 remains
  classified as *focused local authorization proof passed; complete-chain
  replay blocked; effective remote runtime verification pending*.
- **B7.6** — Only typecheck, production build, canary bundle scan, and the
  strengthened perimeter enforcer were run. Lint, focused authz suite,
  Playwright suites, permission-matrix, truth-in-UI, and anchored full
  Vitest twice were NOT re-run in this pass.

## Retained external blockers (unchanged from B6)

1. Rotate or revoke any provider credential previously exposed via the
   pre-B2 bundles.
2. Verify the effective remote authorization state on
   `psfvrskpnwcshvajzeix` through approved change control.
3. Verify remote undeployment of every non-allowlisted function.
4. Reconcile the previous remote migration through approved change control.
5. Execute the full 18-migration chain and authz suite in an approved
   disposable Supabase-compatible environment with `pgvector` + `pg_cron`.

## Verdict

**CHECKPOINT B BLOCKED.**

The confirmed P0 bundle-exposure class (B6.4) is closed and prevented
from returning by CI. B7.3–B7.6 remain outstanding and are required before
Checkpoint B can be marked locally passed.