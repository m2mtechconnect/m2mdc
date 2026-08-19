/**
 * Machine-to-machine webhook entrypoints that deliberately deny every browser
 * origin with `Access-Control-Allow-Origin: 'null'`. That is stricter than the
 * shared allowlist, so they are exempt from the allowlist rule below.
 */
const BROWSERLESS_ENTRYPOINTS = new Set([
  'zapier-webhook',
  'zapier-webhook-trigger',
]);

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
      const name = path.split('/')[2];
      if (BROWSERLESS_ENTRYPOINTS.has(name)) return false;
      const source = readFileSync(path, 'utf8');
      if (!source.includes('Access-Control-Allow-Origin')) return false;
      return !source.includes('_shared/cors.ts');
    });

    expect(offenders).toEqual([]);
  });

  it('keeps browserless webhooks denying every browser origin', () => {
    for (const name of BROWSERLESS_ENTRYPOINTS) {
      const source = readFileSync(join(FUNCTIONS_DIR, name, 'index.ts'), 'utf8');
      expect(source).toContain("'Access-Control-Allow-Origin': 'null'");
    }
  });
});
