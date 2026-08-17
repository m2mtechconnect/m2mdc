/**
 * Non-data-centre templates stay deleted.
 *
 * The aviation ("YVR Airport Operations Digital Twin") and other non-DC
 * verticals were hard-deleted when the data centre became the exclusive master
 * template. Large suites still asserted those templates existed, so they failed
 * permanently and described a product that no longer ships. They are replaced
 * by this guard: the source tree must not reintroduce the identifiers, and the
 * template loader must not resolve them.
 *
 * The source-tree half runs offline and is the meaningful assertion. The loader
 * half needs the backend, so it is skipped rather than failed when the
 * live-backend guard blocks the request.
 */
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { loadTemplateById } from '@/lib/templates/unifiedTemplateService';

const REMOVED_TEMPLATE_IDS = [
  'YVR_AIRPORT_DIGITAL_TWIN',
  'TRANSPORT_CANADA_TWIN',
] as const;

/** Matches in src/, ignoring the retired mock modules that are not runtime-reachable. */
function sourceMatches(pattern: string): string[] {
  try {
    const out = execFileSync(
      'rg',
      ['-l', pattern, 'src', '--glob', '!src/lib/mock/**'],
      { encoding: 'utf8', cwd: process.cwd() },
    );
    return out.split('\n').filter(Boolean);
  } catch (error) {
    // rg exits 1 with no output when there are no matches, which is the pass case.
    if ((error as { status?: number }).status === 1) return [];
    throw error;
  }
}

describe('non-data-centre templates remain removed', () => {
  it('has no aviation template identifiers in application source', () => {
    expect(sourceMatches('YVR_AIRPORT_DIGITAL_TWIN')).toEqual([]);
    expect(sourceMatches('YVR Airport')).toEqual([]);
  });

  it('has no aviation vertical category in application source', () => {
    expect(sourceMatches('Aviation & Transportation')).toEqual([]);
  });

  for (const id of REMOVED_TEMPLATE_IDS) {
    it(`does not resolve ${id} from the template loader`, async () => {
      let resolved: unknown;
      try {
        resolved = await loadTemplateById(id);
      } catch {
        // Backend unreachable in this environment: nothing to assert.
        return;
      }
      expect(resolved).toBeNull();
    });
  }
});
