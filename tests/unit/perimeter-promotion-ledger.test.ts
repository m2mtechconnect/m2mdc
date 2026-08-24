import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
const verifier = read('scripts/verify-production-perimeter.mjs');
const allowlist = JSON.parse(read('docs/remediation/evidence/pr-0.1/route-allowlist.json')) as { production_functions: string[] };
const promotions = JSON.parse(read('docs/remediation/evidence/pr-0.1/edge-function-promotions.json')) as {
  promotions: Array<{ function: string; production_disposition: string }>;
};

describe('production perimeter promotion ledger', () => {
  it('promotes teams-invite explicitly and keeps source guard verification active', () => {
    expect(allowlist.production_functions).toContain('teams-invite');
    expect(promotions.promotions).toContainEqual(expect.objectContaining({
      function: 'teams-invite',
      production_disposition: 'production-allowlisted',
    }));
    expect(verifier).toContain('promotion ledger: duplicate promotion');
    expect(verifier).toContain('promotion ledger references unknown function');
    expect(verifier).toContain('only production-allowlisted promotions are accepted');
    expect(verifier).toContain("SHARED_IMPORT('callerIdentity')");
    expect(verifier).toContain("SHARED_IMPORT('cors')");
  });
});
