import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Legacy twin-model retirement contract.
 *
 * See docs/remediation/legacy-twin-model-retirement.md.
 *
 * The `digital-twin-*` edge functions belong to the retired legacy twin model.
 * They must remain outside the production perimeter and must never acquire a
 * client consumer.
 */

const REPO = process.cwd();
const FUNCTIONS_DIR = join(REPO, 'supabase/functions');
const INVENTORY = join(
  REPO,
  'docs/remediation/evidence/pr-0.1/edge-function-inventory.json',
);
const PROMOTIONS = join(
  REPO,
  'docs/remediation/evidence/pr-0.1/edge-function-promotions.json',
);

function legacyFunctionNames(): string[] {
  return readdirSync(FUNCTIONS_DIR)
    .filter((name) => name.startsWith('digital-twin-'))
    .filter((name) => statSync(join(FUNCTIONS_DIR, name)).isDirectory())
    .sort();
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe('legacy twin function retirement', () => {
  const legacy = legacyFunctionNames();

  it('still identifies the retired legacy function family', () => {
    expect(legacy.length).toBeGreaterThan(0);
  });

  it('keeps every legacy twin function out of the production allowlist', () => {
    const inventory = JSON.parse(readFileSync(INVENTORY, 'utf8')) as Array<{
      function: string;
      production_disposition: string;
    }>;
    const promoted = existsSync(PROMOTIONS)
      ? ((JSON.parse(readFileSync(PROMOTIONS, 'utf8'))?.promotions ?? []) as Array<{
          function: string;
        }>).map((p) => p.function)
      : [];

    const allowlisted = inventory
      .filter(
        (entry) =>
          legacy.includes(entry.function) &&
          entry.production_disposition === 'production-allowlisted',
      )
      .map((entry) => entry.function);

    expect(allowlisted).toEqual([]);
    expect(promoted.filter((name) => legacy.includes(name))).toEqual([]);
  });

  it('has no client invocation of any legacy twin function', () => {
    const offenders = walk(join(REPO, 'src')).filter((file) => {
      const source = readFileSync(file, 'utf8');
      return legacy.some((name) => source.includes(`'${name}'`) || source.includes(`"${name}"`));
    });

    expect(offenders).toEqual([]);
  });
});
