# AURA Remediation — Phase 0 Baseline

**Mode:** Read-only. No source, migration, dependency, config, or infrastructure changes were made.
**Scope:** Reproduce the audit findings and record the verified state of the repository plus the outcome of local, non-destructive quality gates.
**Authorized deliverables:** this file, `capability-traceability.md`, `external-blockers.md`. Nothing else was written.

---

## 1. Git status

### Before Phase 0

```
(empty — working tree clean)
```

`git status --short` returned zero lines prior to execution.

### After Phase 0 (expected)

Only the three authorized documents plus temporary build/test artifacts (see §5). No source files, migrations, config, or lockfiles are modified.

```
?? docs/remediation/baseline.md
?? docs/remediation/capability-traceability.md
?? docs/remediation/external-blockers.md
?? dist/                       # produced by `vite build` gate — safe to delete
```

---

## 2. Repository inventory (verified)

| Area | Location | Notes |
|---|---|---|
| Frontend | React 18.3.1 + Vite + TS | `package.json`, `vite.config.ts` |
| Backend | Supabase (Lovable Cloud), 17 migrations | `supabase/migrations/` |
| Edge functions | 144 functions | `supabase/functions/` |
| Twin engines (duplicated) | 4 modules — see §3 | `src/simulation/`, `src/twins/*/` |
| Mock data (duplicated) | 3 modules — see §3 | `src/twins/*/mockData.ts`, `src/sovereignty/mockData.ts` |
| 3D visualization | Three.js procedural | `src/components/twin-visualization/` |
| Omniverse client | REST + WebRTC scaffolding | `src/integrations/omniverseKit/`, `OmniverseStreamViewer.tsx` |
| Auth & RBAC | Working, `user_roles` + `has_role()` | migrations, `RBACContext.tsx` |
| Agents/RAG/Workflows | CRUD + streaming edge functions | `agent-*`, `rag-*`, `workflow-*` |
| i18n | en / fr-CA | `src/i18n/config.ts` |
| CI | 4 workflows | `.github/workflows/` |

---

## 3. Duplicated engines and mock data (audit finding reproduced)

**Simulation engines — 4 concurrent implementations:**

1. `src/simulation/SimulationEngine.ts` (18 KB, canonical candidate)
2. `src/simulation/generateSimulationResult.ts` (12 KB)
3. `src/twins/dataCenter/simulationEngine.ts`
4. `src/twins/sovereignDataCenter/simulationEngine.ts` **and** `enhancedSimulationEngine.ts`

**Mock data trees — 3 concurrent sources:**

- `src/twins/dataCenter/mockData.ts`
- `src/twins/sovereignDataCenter/mockData.ts`
- `src/sovereignty/mockData.ts`

**`Math.random()` usage across simulation + twin + engines + sovereignty code:** 222 lines across 8 files. Full sweep across `src/`: 235 matches in 43 files. Confirms audit claim that "live" KPIs are synthesized.

---

## 4. Hard-coded infrastructure endpoints (redacted)

A single non-routable-from-repo IPv4 endpoint is embedded in three locations as a `||` fallback:

| File | Line | Kind |
|---|---|---|
| `vite.config.ts` | 14 | Dev-server proxy `/kit-api` target |
| `src/components/twin-visualization/OmniverseStreamViewer.tsx` | 41 | AppStreamer host default |
| `src/integrations/omniverseKit/client.ts` | 10 | Kit REST base URL default |

All three read `VITE_OMNIVERSE_KIT_URL` first; the raw address is used only when the env var is unset. **The literal address is intentionally not reproduced in this report** — see §8. Phase 1 must eliminate the fallback and fail-closed when the env var is missing.

No other hard-coded IPv4 or non-localhost HTTP hosts were found under `src/` outside `node_modules`.

---

## 5. Quality gate results

| Gate | Command | Started | Exit | Result | Failure reason | Pre-existing? | Reference |
|---|---|---|---|---|---|---|---|
| Typecheck | `npx tsgo --noEmit` | ✓ | 0 | **PASS** | — | n/a | full `src/` tree |
| ESLint | `npx eslint .` | ✓ | non-zero | **FAIL** | 1471 problems (1335 errors, 136 warnings); 26 auto-fixable | **Yes** — matches audit | see `/tmp/eslint2.log` during run |
| Unit + integration tests | `npx vitest run` | ✓ | 0 (runner) but suite red | **FAIL** | 198 tests failed / 557 passed / 103 skipped across 145 failed files / 24 passing files (858 total) | **Yes** — matches audit; representative failure: `src/lib/utils/normalizeCompanyName.test.ts › sanitizeTwinName` regex leaves `"Https "` prefix | see run log |
| Production build | `npx vite build` | ✓ | 0 | **PASS** | — but `index-*.js` = 3.24 MB (gzip 840 KB) > 1 MB warning | Pre-existing | `dist/` |
| SEO gate | (bundled in build) | ✓ | 0 | **PASS** | 0 errors / 0 warnings | n/a | `dist/seo-report.json` |
| Playwright e2e | **NOT EXECUTED** | — | — | **NOT EXECUTED** | Requires running dev server + browser install; deferred per Phase 0 "local, non-destructive" scope | n/a | — |
| Dependency audit | **NOT EXECUTED** | — | — | **NOT EXECUTED** | Skipped to avoid registry calls / lockfile mutation per your clarification #5 | n/a | — |

### Failure attribution

All observed failures are **pre-existing** — the working tree was clean before Phase 0 ran and no file was edited. Two failure categories dominate:

1. **Vitest suite:** the 198 failures span company-name normalization, blueprint helpers, RBAC permissions, simulation engine, and template loading suites. Root cause is not investigated in Phase 0 (read-only); it is a Phase 1 P0 item.
2. **ESLint:** the 1335 errors are dominated by `@typescript-eslint/no-explicit-any` and unused-vars in generated/legacy files. Also Phase 1 P0.

---

## 6. Temporary artifacts created by Phase 0

Only `vite build` produces artifacts. Everything below is safe to remove; none of it is a product change.

| Path | Origin | Disposition |
|---|---|---|
| `dist/` | `vite build` gate | Untracked; delete or ignore |
| `/tmp/git_status_pre.txt` | Sandbox scratch | Outside repo |
| `/tmp/tsc.log`, `/tmp/vitest.log`, `/tmp/eslint.log`, `/tmp/eslint2.log`, `/tmp/build.log` | Sandbox scratch | Outside repo |

No cache under `node_modules/.vite`, no `coverage/`, no Playwright artifacts, no screenshots were generated.

---

## 7. Baseline confirms audit — key claims reproduced

| Audit claim | Reproduced how |
|---|---|
| 3D "twin" is procedural | Three.js only under `src/components/twin-visualization/`; no USD/Kit runtime linked |
| KPIs are synthetic | 222 `Math.random()` lines in simulation/twin/engine/sovereignty code |
| Duplicated simulation engines | 4 engine files enumerated in §3 |
| Duplicated mock data | 3 mock files enumerated in §3 |
| Kit endpoint unreachable and hard-coded | 3 fallback sites, §4 |
| Compliance claims lack evidence | "SOC 2 / ISO 27001 / Law 25" strings appear across 20+ presentation and template files with no backing evidence table in the schema |
| Test suite red | 198 failing tests, 145 failing files |
| Lint red | 1471 problems |

---

## 8. Redactions and safety

- No secret env values were read or printed.
- The hard-coded Kit IPv4 is referenced by file and line only.
- `.env`, `.env.example`, `.env.test` were not opened during Phase 0.
- No calls to NVIDIA, Omniverse, BMS, DCIM, or third-party operational endpoints were made.
- No dependency install, upgrade, or lockfile change occurred.
- No `supabase` migration was executed; no `psql`, no `supabase db` commands were run.

---

## 9. Recommended Phase 1 entry criteria

Do not enter Phase 1 until you approve:

1. This baseline.
2. The capability traceability matrix (`capability-traceability.md`).
3. The external blocker list (`external-blockers.md`) with named owners.
4. A written decision that the failing lint + test baseline is accepted as the starting line (Phase 1 must not regress it).

Phase 1 proposal is included at the end of `external-blockers.md`.