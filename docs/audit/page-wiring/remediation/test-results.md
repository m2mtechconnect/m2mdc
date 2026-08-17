# Test results - final published source

- Typecheck (`tsgo --noEmit`): clean.
- Remediation-scoped suites (`src/workspace/__tests__`, `src/lib/provenance/__tests__`): 12 files, **103 tests passing**, which includes the 80 remediation tests plus the provenance exporter tests.
- Full suite: **228 failing / 1339 passing / 109 skipped across 1676 tests, 40 failing files**.

Failing files are legacy: `tests/integration/*` (builder, templates, YVR, intake, operations), `tests/unit/*` (builder store, template loader, validators), `tests/performance/*`, `tests/simulationEngine.test.ts`, `tests/digitalTwinRuntime.test.ts`, plus `src/lib/__tests__/simulationTemplates.test.ts`, `src/lib/__tests__/twinNameMigration.test.ts`, `src/lib/utils/normalizeCompanyName.test.ts`, `src/simulation/providers/__tests__/contract.test.ts`.

- These predate this remediation and were failing before it started.
- None touch routing, authentication, the simulation workspace workflow, export or navigation code paths changed here.
- Release risk: low for this remediation scope, but the legacy suites give no regression coverage for the builder/template subsystem.
- Recommended triage: a separate work item to categorise the 40 files into stale fixtures vs real defects, starting with `tests/unit/templateLoader` and `normalizeCompanyName`.

The application test suite as a whole does not pass.
