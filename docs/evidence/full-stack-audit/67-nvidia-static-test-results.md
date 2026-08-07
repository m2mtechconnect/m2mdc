# Static and hermetic validation results (Stage 3)

All commands ran inside the sandbox. Zero network requests were issued to
NVIDIA, to any production host, or to Supabase project `psfvrskpnwcshvajzeix`.
No application code, schema, migration, policy or prior evidence artifact was
modified.

| # | Validation | Command | Result |
|---|---|---|---|
| 1 | NVIDIA dependency inventory | `rg -i "nvidia\|omniverse\|usd\|pxr" package.json` | **0 NVIDIA packages.** Only `mqtt@^5.15.2` (Eclipse), `zod`, `seedrandom` |
| 2 | Repository term census (word-boundary, files matched) | `rg -il -g '!node_modules' -g '!docs/evidence'` | NVIDIA 85, DSX 92, Omniverse 95, OpenUSD 22, SimReady 5, DGX 18, Isaac Sim 2, NIM 4, NeMo 4, Modulus 8, PhysicsNeMo 1, CUDA 1, Base Command 1; Riva/DeepStream/Metropolis/TensorRT/TAO/Triton/Jetson/IGX/AI Enterprise/Fleet Command/ConnectX/Spectrum-X **0** |
| 3 | OpenUSD asset validation | `rg --files -g '*.usd*'` | **0 files.** Nothing to open, parse or validate |
| 4 | Asset dependency validation | n/a | Not runnable — no assets exist |
| 5 | Upstream manifest integrity | `node scripts/verify-dsx-upstream-manifest.mjs` | **PASS** — "5 reference-only entries, 0 vendored"; all declared touchpoints exist |
| 6 | DSX + Omniverse + provider unit tests | `bunx vitest run src/dsx src/integrations/omniverseKit src/simulation/providers` | **PASS — 15 files, 173 tests, 0 failures, 7.91 s** |
| 7 | NVIDIA client tests with inert configuration | included above (`omniverseKit/__tests__`, 14 tests) | **PASS** — client fails closed with `KitDisabledError`; `readKitConfig()` returns `enabled:false` unconditionally (`config.ts:44-53`) |
| 8 | Mock-versus-live data tracing | source read of `src/dsx/modes.ts`, adapters | `LIVE_MODE_ENABLED = false`; `resolveMode('LIVE')` -> `UNAVAILABLE`; no silent fallback path exists |
| 9 | Telemetry schema validation | `parseDsxEvent` strict contract + `ingestPipeline.ts` | Enforced: schema, version, unit enum, duplicate, staleness (10 min), approved mapping. Rejection taxonomy of 10 reasons |
| 10 | Container inspection | `infra/dsx-exchange/docker-compose.yml` | Single image `eclipse-mosquitto:2.0.22`, published on `127.0.0.1:1883` only. **No NVIDIA image referenced anywhere in the repository** |
| 11 | Simulation reproducibility | seeded fixture + `src/dsx/fixtures/determinism.ts`, covered by the 173 tests | **Reproducible.** Same seed yields identical KPI bundles and run ids |
| 12 | Model and dataset lineage validation | source read | Model is a version string only; dataset is an internally authored fixture. **No external lineage** |
| 13 | Evidence-export verification | `src/dsx/workspaces/evidenceBoundary.ts` + `evidenceBoundary.test.ts` (21 tests) | **PASS** — every claim resolves to source event ids or renders Unavailable |
| 14 | UI claim-to-backend traceability | grep of user-facing NVIDIA copy | **3 unsupported claim sites found** — see doc 60 |
| 15 | Clean dependency install / build / typecheck | not re-run in this stage | Deliberately unchanged; the frozen hermetic gate results in `35-` and `44-` remain authoritative. Stage 3 introduced no code changes |

## Reproducibility note

Percentages in `69-nvidia-dsx-readiness-scorecard.md` were recomputed from the
gate arithmetic in docs 62-66. The earlier 68% and 56% figures were **not**
reused and were not reproducible from evidence.
