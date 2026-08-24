import { describe, expect, it } from 'vitest';
import {
  LOVABLE_ORPHAN_BRANCH,
  normalizeReleaseBranch,
  resolveReleaseEnvironment,
} from '../../scripts/releaseMetadata';

describe('release metadata normalization', () => {
  it('maps the Lovable provider checkout marker to canonical main', () => {
    expect(normalizeReleaseBranch(LOVABLE_ORPHAN_BRANCH)).toBe('main');
  });

  it('does not rewrite ordinary Git branch names', () => {
    expect(normalizeReleaseBranch('hardening/postrelease-20260824')).toBe(
      'hardening/postrelease-20260824',
    );
    expect(normalizeReleaseBranch('HEAD')).toBe('HEAD');
  });

  it('prefers explicit release environment metadata', () => {
    expect(
      resolveReleaseEnvironment({
        rawBranch: LOVABLE_ORPHAN_BRANCH,
        explicitEnvironment: 'staging',
        providerEnvironment: 'preview',
      }),
    ).toBe('staging');
  });

  it('uses provider environment metadata when explicit AURA metadata is absent', () => {
    expect(
      resolveReleaseEnvironment({
        rawBranch: 'feature/example',
        providerEnvironment: 'preview',
      }),
    ).toBe('preview');
  });

  it('classifies Lovable orphan publishes as production', () => {
    expect(
      resolveReleaseEnvironment({ rawBranch: LOVABLE_ORPHAN_BRANCH }),
    ).toBe('production');
  });

  it('does not infer production for generic detached or unknown checkouts', () => {
    expect(resolveReleaseEnvironment({ rawBranch: 'HEAD' })).toBe('unknown');
    expect(resolveReleaseEnvironment({ rawBranch: 'unknown' })).toBe('unknown');
  });
});
