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
 * Both halves run offline. The loader receives a deterministic not-found
 * response from a local mock so this guard never contacts a deployed backend
 * and never passes merely because a network request failed.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { loadTemplateById } from '@/lib/templates/unifiedTemplateService';

const templateQuery = vi.hoisted(() => ({
  from: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: templateQuery.from.mockImplementation(() => ({
      select: () => ({
        eq: templateQuery.eq.mockImplementation(() => ({
          single: templateQuery.single.mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'not found' },
          }),
        })),
      }),
    })),
  },
}));

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
      await expect(loadTemplateById(id)).resolves.toBeNull();
      expect(templateQuery.from).toHaveBeenLastCalledWith('agent_templates');
      expect(templateQuery.eq).toHaveBeenLastCalledWith('id', id);
    });
  }
});
