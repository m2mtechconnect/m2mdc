import { describe, expect, it, vi, beforeEach } from 'vitest';

const entries: Record<string, Record<string, unknown>> = {};

vi.mock('@/components/twin-visualization/assetRegistry', () => ({
  getAsset: (id: string) => entries[id],
  isSupersededChecksum: (c: string) =>
    Object.values(entries).some((e) =>
      ((e.supersededChecksums as string[]) ?? []).includes(c),
    ),
}));

import { resolveAssetValidation, type SavedValidationRun } from '../assetValidationModel';

const run = (over: Partial<SavedValidationRun> = {}): SavedValidationRun => ({
  id: 'run-1',
  assetChecksum: 'abc123',
  acceptanceResult: 'pass',
  verdict: 'looks correct',
  validatedAt: '2026-08-01T00:00:00Z',
  ...over,
});

beforeEach(() => {
  for (const key of Object.keys(entries)) delete entries[key];
  entries['asset.a'] = { assetId: 'asset.a', checksum: 'abc123' };
});

describe('resolveAssetValidation', () => {
  it('reports unknown assets', () => {
    expect(resolveAssetValidation('missing', []).state).toBe('unknown-asset');
  });

  it('awaits a hardware run when none exists', () => {
    const r = resolveAssetValidation('asset.a', []);
    expect(r.state).toBe('awaiting-hardware-run');
    expect(r.gpuValidated).toBe(false);
  });

  it('validates only when a pass targets the current build checksum', () => {
    const r = resolveAssetValidation('asset.a', [run()]);
    expect(r.state).toBe('gpu-validated');
    expect(r.gpuValidated).toBe(true);
    expect(r.evidence).toContain('asset_gpu_validation_runs:run-1');
  });

  it('never promotes a pass recorded against a different build', () => {
    const r = resolveAssetValidation('asset.a', [run({ assetChecksum: 'old999' })]);
    expect(r.state).toBe('validated-other-build');
    expect(r.gpuValidated).toBe(false);
  });

  it('surfaces failures and warnings for the current build', () => {
    expect(resolveAssetValidation('asset.a', [run({ acceptanceResult: 'fail' })]).state).toBe(
      'run-failed',
    );
    expect(resolveAssetValidation('asset.a', [run({ acceptanceResult: 'warning' })]).state).toBe(
      'run-warning',
    );
  });

  it('picks the newest run regardless of input order', () => {
    const r = resolveAssetValidation('asset.a', [
      run({ id: 'old', acceptanceResult: 'fail', validatedAt: '2026-01-01T00:00:00Z' }),
      run({ id: 'new', acceptanceResult: 'pass', validatedAt: '2026-07-01T00:00:00Z' }),
    ]);
    expect(r.state).toBe('gpu-validated');
    expect(r.currentBuildRun?.id).toBe('new');
  });

  it('refuses to validate a superseded build even with a passing run', () => {
    entries['asset.a'] = { assetId: 'asset.a', checksum: 'abc123', superseded: true };
    const r = resolveAssetValidation('asset.a', [run()]);
    expect(r.state).toBe('build-superseded');
    expect(r.gpuValidated).toBe(false);
  });

  it('refuses to validate a build whose checksum is superseded elsewhere', () => {
    entries['asset.b'] = { assetId: 'asset.b', supersededChecksums: ['abc123'] };
    expect(resolveAssetValidation('asset.a', [run()]).state).toBe('build-superseded');
  });

  it('reports checksum-missing when the manifest has no derivative checksum', () => {
    entries['asset.a'] = { assetId: 'asset.a' };
    expect(resolveAssetValidation('asset.a', []).state).toBe('checksum-missing');
  });

  it('accepts a manifest claim only when it cites the passing run', () => {
    entries['asset.a'] = {
      assetId: 'asset.a',
      checksum: 'abc123',
      gpuValidation: { status: 'gpu-validated', lastPassedRunId: null },
    };
    expect(resolveAssetValidation('asset.a', []).state).toBe('awaiting-hardware-run');

    entries['asset.a'] = {
      assetId: 'asset.a',
      checksum: 'abc123',
      gpuValidation: { status: 'gpu-validated', lastPassedRunId: 'run-9' },
    };
    const r = resolveAssetValidation('asset.a', []);
    expect(r.state).toBe('gpu-validated');
    expect(r.evidence).toContain('run-9');
  });
});