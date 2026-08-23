/**
 * Brand regression guard.
 *
 * The authenticated shell and auth-adjacent surfaces must render the AURA
 * logo system (`AuraLogo` / `AuraNodeMark`) and must not reintroduce the
 * legacy `m2mLogo` raster import, which previously produced a
 * `ReferenceError: m2mLogo is not defined` at runtime.
 *
 * Public marketing surfaces under `src/components/landing/` intentionally
 * keep the parent-brand raster mark and are exempt.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '..');
const EXEMPT_DIRS = [path.join(SRC, 'components', 'landing')];
const SKIP_DIRS = new Set(['node_modules', '__snapshots__']);
const EXTENSIONS = new Set(['.ts', '.tsx']);

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      collectSourceFiles(full, out);
      continue;
    }
    if (EXTENSIONS.has(path.extname(entry))) out.push(full);
  }
  return out;
}

describe('AURA brand asset regression guard', () => {
  it('has no m2mLogo reference outside public marketing surfaces', () => {
    const offenders = collectSourceFiles(SRC)
      .filter((file) => !EXEMPT_DIRS.some((dir) => file.startsWith(dir)))
      .filter((file) => file !== __filename)
      .filter((file) => readFileSync(file, 'utf8').includes('m2mLogo'))
      .map((file) => path.relative(SRC, file));

    expect(offenders).toEqual([]);
  });

  it('exposes the AURA node mark used by the authenticated shell lockup', () => {
    const logo = readFileSync(path.join(SRC, 'components', 'brand', 'AuraLogo.tsx'), 'utf8');
    expect(logo).toContain('AuraNodeMark');
    expect(logo).not.toContain('m2m-logo');
  });
});
