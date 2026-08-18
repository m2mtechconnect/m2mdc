/**
 * Phase 6 - canonical asset / version / validation model.
 *
 * One resolver decides the validation state of a 3D asset. It binds three
 * previously separate sources into a single answer:
 *
 *  1. identity  - the manifest entry (`assetRegistry`), authored at build time
 *  2. version   - the derivative checksum of the entry that is runtime-current
 *  3. validation- saved administrator runs in `asset_gpu_validation_runs`
 *
 * The binding rule is deliberate: a saved pass only validates the exact build
 * it ran against. A pass recorded for an older checksum never promotes the
 * current build, and a superseded build can never be validated at all.
 */

import {
  getAsset,
  isSupersededChecksum,
  type AssetManifestEntry,
} from '@/components/twin-visualization/assetRegistry';

/** A saved hardware acceptance run, as stored in the evidence table. */
export interface SavedValidationRun {
  id: string;
  assetChecksum: string;
  acceptanceResult: 'pass' | 'warning' | 'fail' | 'invalid' | string;
  verdict: string;
  validatedAt: string;
}

export type AssetValidationState =
  | 'unknown-asset'
  | 'build-superseded'
  | 'checksum-missing'
  | 'gpu-validated'
  | 'validated-other-build'
  | 'run-warning'
  | 'run-failed'
  | 'awaiting-hardware-run';

export interface AssetValidationResolution {
  assetId: string;
  state: AssetValidationState;
  /** True only for `gpu-validated`. Never inferred from anything else. */
  gpuValidated: boolean;
  label: string;
  /** Checksum of the build the UI is talking about, when one exists. */
  buildChecksum: string | null;
  /** Latest saved run for this asset, whatever build it targeted. */
  latestRun: SavedValidationRun | null;
  /** Latest saved run recorded against the current build checksum. */
  currentBuildRun: SavedValidationRun | null;
  /** Human-readable provenance for the state, for UI citation. */
  evidence: string;
}

export const ASSET_VALIDATION_LABEL: Record<AssetValidationState, string> = {
  'unknown-asset': 'No registered asset',
  'build-superseded': 'Superseded build - retained for audit history only',
  'checksum-missing': 'Awaiting hardware GPU validation',
  'gpu-validated': 'GPU validated',
  'validated-other-build': 'Awaiting hardware GPU validation for this build',
  'run-warning': 'Hardware run recorded warnings',
  'run-failed': 'Hardware run failed',
  'awaiting-hardware-run': 'Awaiting hardware GPU validation',
};

function sameChecksum(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Manifest-declared validation only counts when the manifest names the saved
 * run that produced it. A bare status string is a claim without evidence.
 */
function manifestPassRunId(entry: AssetManifestEntry): string | null {
  const record = entry.gpuValidation;
  if (!record || record.status !== 'gpu-validated') return null;
  return record.lastPassedRunId ?? null;
}

/**
 * Resolve the single validation answer for an asset.
 *
 * `runs` may be given in any order; the newest is selected here so callers
 * never depend on query ordering.
 */
export function resolveAssetValidation(
  assetId: string,
  runs: SavedValidationRun[],
): AssetValidationResolution {
  const entry = getAsset(assetId);
  const sorted = [...runs].sort(
    (a, b) => Date.parse(b.validatedAt) - Date.parse(a.validatedAt),
  );
  const latestRun = sorted[0] ?? null;

  const base = {
    assetId,
    gpuValidated: false,
    buildChecksum: entry?.checksum ?? null,
    latestRun,
    currentBuildRun: null as SavedValidationRun | null,
  };

  const done = (
    state: AssetValidationState,
    evidence: string,
    extra: Partial<AssetValidationResolution> = {},
  ): AssetValidationResolution => ({
    ...base,
    state,
    label: ASSET_VALIDATION_LABEL[state],
    evidence,
    ...extra,
  });

  if (!entry) return done('unknown-asset', `No manifest entry for ${assetId}`);
  if (entry.superseded === true || (entry.checksum && isSupersededChecksum(entry.checksum))) {
    return done('build-superseded', 'Manifest marks this build superseded');
  }
  if (!entry.checksum) {
    return done('checksum-missing', 'Manifest entry carries no derivative checksum');
  }

  const currentBuildRun =
    sorted.find((r) => sameChecksum(r.assetChecksum, entry.checksum)) ?? null;

  if (currentBuildRun) {
    const cite = `asset_gpu_validation_runs:${currentBuildRun.id}`;
    if (currentBuildRun.acceptanceResult === 'pass') {
      return done('gpu-validated', `Passed hardware run ${cite}`, {
        gpuValidated: true,
        currentBuildRun,
      });
    }
    if (currentBuildRun.acceptanceResult === 'warning') {
      return done('run-warning', `Hardware run with warnings ${cite}`, { currentBuildRun });
    }
    return done('run-failed', `Hardware run result "${currentBuildRun.acceptanceResult}" ${cite}`, {
      currentBuildRun,
    });
  }

  const declaredRunId = manifestPassRunId(entry);
  if (declaredRunId) {
    return done('gpu-validated', `Manifest cites passed run asset_gpu_validation_runs:${declaredRunId}`, {
      gpuValidated: true,
    });
  }

  if (latestRun) {
    return done(
      'validated-other-build',
      `Latest saved run asset_gpu_validation_runs:${latestRun.id} targets checksum ${latestRun.assetChecksum}, not the current build`,
    );
  }

  return done('awaiting-hardware-run', 'No saved hardware run exists for this asset');
}