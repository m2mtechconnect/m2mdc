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
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadTemplateById } from '@/lib/templates/unifiedTemplateService';

const REMOVED_TEMPLATE_IDS = [
  'YVR_AIRPORT_DIGITAL_TWIN',
  'TRANSPORT_CANADA_TWIN',
] as const;

function applicationSourceFiles(root: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    const relativePath = relative(process.cwd(), path).split(sep).join('/');

    if (entry.isDirectory()) {
      if (relativePath === 'src/lib/mock') continue;
      files.push(...applicationSourceFiles(path));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }

  return files;
}

/** Matches in src/, ignoring the retired mock modules that are not runtime-reachable. */
function sourceMatches(pattern: string): string[] {
  return applicationSourceFiles(join(process.cwd(), 'src'))
    .filter((path) => readFileSync(path, 'utf8').includes(pattern))
    .map((path) => relative(process.cwd(), path).split(sep).join('/'));
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
