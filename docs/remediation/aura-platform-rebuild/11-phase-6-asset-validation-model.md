# Phase 6 - Canonical asset / version / validation model

## Problem measured
Three sources answered "is this 3D asset validated?" independently:

1. `assets/manifest.json` -> `gpuValidation.status` (a build-time string)
2. `asset_gpu_validation_runs` (saved administrator hardware runs)
3. `useSavedGpuValidation`, which OR-ed the two

Defects that follow from the OR:
- A manifest status of `gpu-validated` promoted an asset with no cited run.
- The latest saved pass promoted the asset even when the run targeted a
  different checksum (an older derivative build).
- A superseded build could still be reported as validated.

## Change
`src/validation/gpuAcceptance/assetValidationModel.ts` is the single resolver.
It binds identity (manifest entry), version (derivative checksum) and
validation (saved runs) into one answer:

- a saved `pass` validates only the build whose checksum it recorded;
- a manifest claim counts only when it cites `lastPassedRunId`;
- a superseded build (or superseded checksum) can never be validated;
- states: `gpu-validated`, `validated-other-build`, `run-warning`,
  `run-failed`, `awaiting-hardware-run`, `build-superseded`,
  `checksum-missing`, `unknown-asset`.

Every resolution carries an `evidence` sentence citing the record
(`asset_gpu_validation_runs:<id>`), rendered on `/admin/asset-pipeline`.

`useSavedGpuValidation` is now a thin read adapter (fetches up to 20 runs and
delegates the decision). `getGpuValidationStatus` in `assetRegistry` keeps only
its design-time role and now also requires a cited run id.

## Scope note
`dsx_asset_mappings` is external-telemetry mapping, not a 3D asset record, and
stays in the connections family. `asset_canary_events` remains the rollout
evidence log and is not merged into validation.

## Verification
- 10 new unit tests in `__tests__/assetValidationModel.test.ts`
- full suite: 1798 passed, 91 skipped
