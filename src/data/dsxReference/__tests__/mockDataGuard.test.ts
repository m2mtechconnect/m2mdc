/**
 * Phase 8 guard: fails when new unclassified synthetic operational data is
 * added to production source.
 *
 * The guard is a ratchet against the frozen AURA_LEGACY_SYNTHETIC_BASELINE_V1
 * counts. It deliberately does NOT flag legitimate constants (units, enums,
 * validation thresholds, UI labels, camera presets) or test fixtures, because
 * it only counts non-deterministic value generation inside `src/`.
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const SNAPSHOT = JSON.parse(
  readFileSync('docs/dsx-reference-data/cutover/legacy-baseline-snapshot.json', 'utf8'),
);

/** Frozen ceiling. This number may go DOWN as pages migrate, never up. */
const BASELINE_RANDOM_FILES: number = SNAPSHOT.counts.files_with_nondeterministic_random;

function filesWithNondeterministicRandom(): string[] {
  const out = execSync("rg -l 'Math\\.random\\(' src || true", { encoding: 'utf8' });
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    // Test files and test-only fixtures are excluded from production bundles.
    .filter((f) => !/__tests__|\.test\.|\.spec\./.test(f));
}

describe('synthetic data ratchet', () => {
  it('does not add new production files that generate non-deterministic values', () => {
    const files = filesWithNondeterministicRandom();
    expect(
      files.length,
      `Non-deterministic value generation grew past the frozen baseline of ${BASELINE_RANDOM_FILES}.\n` +
        'Every new operational-looking value must be a normalized reference record with provenance.\n' +
        `Current files:\n${files.join('\n')}`,
    ).toBeLessThanOrEqual(BASELINE_RANDOM_FILES);
  });

  it('keeps the legacy baseline archived rather than deleted', () => {
    expect(SNAPSHOT.snapshot_id).toBe('AURA_LEGACY_SYNTHETIC_BASELINE_V1');
    expect(SNAPSHOT.status).toContain('Archived');
    expect(SNAPSHOT.status).toContain('Not operational');
    expect(Object.keys(SNAPSHOT.file_checksums).length).toBeGreaterThan(0);
  });

  it('never commits raw NVIDIA source material into the repository', () => {
    const leaked = execSync(
      "rg -l 'CONFIGURATOR_OPTIONS|SIMULATION_OPTIONS' src --glob '!src/data/dsxReference/**' || true",
      { encoding: 'utf8' },
    ).trim();
    expect(leaked, `Raw NVIDIA source symbols leaked into: ${leaked}`).toBe('');
  });
});
