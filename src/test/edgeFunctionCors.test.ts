import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Phase 4 ratchet: no edge function may serve a wildcard
 * `Access-Control-Allow-Origin`. Origins are resolved per request through
 * `supabase/functions/_shared/cors.ts`, which holds the single allowlist.
 */
const FUNCTIONS_DIR = 'supabase/functions';

function functionEntrypoints(): string[] {
  return readdirSync(FUNCTIONS_DIR)
    .map((name) => join(FUNCTIONS_DIR, name, 'index.ts'))
    .filter((path) => {
      try {
        return statSync(path).isFile();
      } catch {
        return false;
      }
    });
}

describe('edge function CORS', () => {
  it('has no wildcard Access-Control-Allow-Origin', () => {
    const offenders = functionEntrypoints().filter((path) => {
      const source = readFileSync(path, 'utf8');
      return (
        source.includes("'Access-Control-Allow-Origin': '*'") ||
        source.includes('"Access-Control-Allow-Origin": "*"')
      );
    });

    expect(offenders).toEqual([]);
  });

  it('resolves origins through the shared allowlist wherever CORS is emitted', () => {
    const offenders = functionEntrypoints().filter((path) => {
      const source = readFileSync(path, 'utf8');
      if (!source.includes('Access-Control-Allow-Origin')) return false;
      return !source.includes('_shared/cors.ts');
    });

    expect(offenders).toEqual([]);
  });
});
