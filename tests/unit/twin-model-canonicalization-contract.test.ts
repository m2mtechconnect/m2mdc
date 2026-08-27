import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Twin-model canonicalization contract.
 *
 * The frontend has exactly ONE canonical twin read model: `data_centre_twins`.
 * The legacy `digital_twins` table remains only behind edge functions and
 * historical migrations; client code must never fork onto it again.
 */

const SRC_ROOT = join(process.cwd(), 'src');
const ALLOWED = new Set(['src/integrations/supabase/types.ts']);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('twin model canonicalization', () => {
  const files = walk(SRC_ROOT);

  it('has no client-side reads of the legacy digital_twins table', () => {
    const offenders = files.filter((file) => {
      const rel = file.slice(process.cwd().length + 1).split('\\').join('/');
      if (ALLOWED.has(rel)) return false;
      return /\bdigital_twins\b/.test(readFileSync(file, 'utf8'));
    });

    expect(offenders).toEqual([]);
  });

  it('retains the canonical data_centre_twins read path', () => {
    const canonical = files.filter((file) =>
      /\bdata_centre_twins\b/.test(readFileSync(file, 'utf8')),
    );

    expect(canonical.length).toBeGreaterThan(0);
  });
});
