import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  LOVABLE_ORPHAN_BRANCH,
  RELEASE_FINGERPRINT_SCHEMA,
  assertProductionFingerprint,
  buildReleaseFingerprint,
  isSourceSha,
  normalizeReleaseBranch,
  readGitMetadataFromDisk,
  readStampedSourceFingerprint,
  resolveReleaseEnvironment,
  resolveReleaseSource,
} from '../../scripts/releaseMetadata';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

const tempDirs: string[] = [];

function makeRoot(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'aura-release-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

/** Environment with no provider metadata and no git binary on PATH. */
function bareEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return { PATH: '', npm_package_version: '0.1.0', ...overrides };
}

describe('release metadata normalization', () => {
  it('maps the Lovable provider checkout marker to canonical main', () => {
    expect(normalizeReleaseBranch(LOVABLE_ORPHAN_BRANCH)).toBe('main');
  });

  it('does not rewrite ordinary Git branch names', () => {
    expect(normalizeReleaseBranch('hardening/postrelease-20260824')).toBe(
      'hardening/postrelease-20260824',
    );
  });

  it('normalizes internal Lovable working checkouts to main', () => {
    expect(normalizeReleaseBranch('edit/edt-1234')).toBe('main');
    expect(normalizeReleaseBranch('preview/foo')).toBe('main');
  });

  it('normalizes ambiguous checkout markers to main', () => {
    expect(normalizeReleaseBranch('HEAD')).toBe('main');
    expect(normalizeReleaseBranch('')).toBe('main');
    expect(normalizeReleaseBranch('unknown')).toBe('main');
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
    expect(resolveReleaseEnvironment({ rawBranch: LOVABLE_ORPHAN_BRANCH })).toBe('production');
  });

  it('classifies release builds without provider metadata as production', () => {
    expect(resolveReleaseEnvironment({ rawBranch: '', isReleaseBuild: true })).toBe('production');
    expect(resolveReleaseEnvironment({ rawBranch: 'HEAD', isReleaseBuild: true })).toBe(
      'production',
    );
  });

  it('does not infer production for non-release resolution', () => {
    expect(resolveReleaseEnvironment({ rawBranch: 'HEAD' })).toBe('unknown');
  });
});

describe('source SHA resolution', () => {
  it('validates 40-hex source SHAs only', () => {
    expect(isSourceSha(SHA_A)).toBe(true);
    expect(isSourceSha('unknown')).toBe(false);
    expect(isSourceSha('abc123')).toBe(false);
  });

  it('prefers provider metadata over every other source', () => {
    const root = makeRoot();
    writeFileSync(
      path.join(root, 'release-source.json'),
      JSON.stringify({ sha: SHA_B, branch: 'main' }),
    );
    const resolved = resolveReleaseSource({
      rootDir: root,
      env: bareEnv({ AURA_COMMIT_SHA: SHA_A, AURA_RELEASE_BRANCH: 'main' }),
    });
    expect(resolved).toMatchObject({ sha: SHA_A, shaSource: 'provider' });
  });

  it('reads HEAD from on-disk git metadata when the git binary is unavailable', () => {
    const root = makeRoot();
    const gitDir = path.join(root, '.git');
    mkdirSync(path.join(gitDir, 'refs', 'heads'), { recursive: true });
    writeFileSync(path.join(gitDir, 'HEAD'), 'ref: refs/heads/main\n');
    writeFileSync(path.join(gitDir, 'refs', 'heads', 'main'), `${SHA_A}\n`);

    expect(readGitMetadataFromDisk(root)).toEqual({ sha: SHA_A, branch: 'main' });
    expect(resolveReleaseSource({ rootDir: root, env: bareEnv() })).toMatchObject({
      sha: SHA_A,
      shaSource: 'git-dir',
    });
  });

  it('resolves packed refs', () => {
    const root = makeRoot();
    const gitDir = path.join(root, '.git');
    mkdirSync(gitDir, { recursive: true });
    writeFileSync(path.join(gitDir, 'HEAD'), 'ref: refs/heads/main\n');
    writeFileSync(path.join(gitDir, 'packed-refs'), `# pack-refs\n${SHA_B} refs/heads/main\n`);
    expect(readGitMetadataFromDisk(root).sha).toBe(SHA_B);
  });

  it('falls back to the committed source stamp when no git metadata exists', () => {
    const root = makeRoot();
    writeFileSync(
      path.join(root, 'release-source.json'),
      JSON.stringify({ sha: SHA_B, branch: 'main', stampedAt: '2026-08-24T00:00:00.000Z' }),
    );
    expect(readStampedSourceFingerprint(root)?.sha).toBe(SHA_B);
    expect(resolveReleaseSource({ rootDir: root, env: bareEnv() })).toMatchObject({
      sha: SHA_B,
      shaSource: 'stamped',
    });
  });

  it('ignores a malformed source stamp', () => {
    const root = makeRoot();
    writeFileSync(path.join(root, 'release-source.json'), JSON.stringify({ sha: 'unknown' }));
    expect(readStampedSourceFingerprint(root)).toBeUndefined();
    expect(resolveReleaseSource({ rootDir: root, env: bareEnv() }).shaSource).toBe('unknown');
  });
});

describe('production fingerprint fail-closed gate', () => {
  it('rejects a fingerprint that claims unknown provenance', () => {
    const root = makeRoot();
    const fingerprint = buildReleaseFingerprint({ rootDir: root, env: bareEnv() });
    expect(fingerprint.sha).toBe('');
    expect(fingerprint.shaSource).toBe('unknown');
    expect(() => assertProductionFingerprint(fingerprint)).toThrowError(
      /not publishable \(fail-closed\)/,
    );
  });

  it('rejects unknown sha, branch and environment values individually', () => {
    const base = {
      schema: RELEASE_FINGERPRINT_SCHEMA,
      sha: SHA_A,
      branch: 'main',
      builtAt: '2026-08-24T00:00:00.000Z',
      buildId: 'b1',
      environment: 'production',
      version: '0.1.0',
      shaSource: 'stamped',
    } as const;

    expect(() => assertProductionFingerprint({ ...base, sha: 'unknown' })).toThrow(/sha/);
    expect(() => assertProductionFingerprint({ ...base, branch: 'unknown' })).toThrow(/branch/);
    expect(() => assertProductionFingerprint({ ...base, environment: 'unknown' })).toThrow(
      /environment/,
    );
    expect(() => assertProductionFingerprint({ ...base, buildId: '' })).toThrow(/buildId/);
  });

  it('produces a publishable fingerprint from the stamp alone', () => {
    const root = makeRoot();
    writeFileSync(
      path.join(root, 'release-source.json'),
      JSON.stringify({ sha: SHA_B, branch: 'main', stampedAt: '2026-08-24T00:00:00.000Z' }),
    );
    const fingerprint = buildReleaseFingerprint({ rootDir: root, env: bareEnv() });
    expect(fingerprint).toMatchObject({
      schema: RELEASE_FINGERPRINT_SCHEMA,
      sha: SHA_B,
      branch: 'main',
      environment: 'production',
    });
    expect(fingerprint.buildId).not.toBe('');
    expect(() => assertProductionFingerprint(fingerprint)).not.toThrow();
  });

  it('keeps the repository source stamp valid and canonical', () => {
    const stamp = readStampedSourceFingerprint(process.cwd());
    expect(stamp).toBeDefined();
    expect(isSourceSha(stamp!.sha)).toBe(true);
    expect(stamp!.branch).toBe('main');
  });

  it('resolves a publishable fingerprint for this repository checkout', () => {
    const fingerprint = buildReleaseFingerprint({ rootDir: process.cwd() });
    expect(() => assertProductionFingerprint(fingerprint)).not.toThrow();
    expect(fingerprint.branch).not.toBe('unknown');
  });
});

describe('Vite release fingerprint wiring', () => {
  const configSource = readFileSync(path.resolve(process.cwd(), 'vite.config.ts'), 'utf8');

  it('builds one production fingerprint and shares it with the bundle and release.json', () => {
    expect(configSource.match(/buildReleaseFingerprint\(/g)).toHaveLength(1);
    expect(configSource).toContain('releaseFingerprintPlugin(productionFingerprint)');
    expect(configSource).toContain('productionFingerprint?.buildId');
    expect(configSource).toContain('productionFingerprint?.builtAt');
    expect(configSource).toContain('productionFingerprint?.sha');
  });
});

