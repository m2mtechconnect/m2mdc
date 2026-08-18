import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

function grep(pattern: string): string[] {
  try {
    return execSync(`rg -l --glob '!**/types.ts' ${JSON.stringify(pattern)} src`, {
      cwd: root,
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
}

describe('Phase 10 - connection identity is single-sourced', () => {
  it('no client code queries the legacy connection generations', () => {
    expect(grep("from\\('integrations_connections'")).toEqual([]);
    expect(grep("from\\('dsx_connections'")).toEqual([]);
  });

  it('client connection reads go through connection_instances only', () => {
    expect(read('src/connections/api.ts')).toContain("from('connection_instances')");
  });

  it('the orphaned integration marketplace surface stays deleted', () => {
    for (const file of [
      'FieldMapper',
      'IntegrationCard',
      'IntegrationDrawer',
      'IntegrationFilters',
      'IntegrationMarketplace',
      'IntegrationStatusBadge',
      'ZapierAppCard',
      'ZapierConnectModal',
      'ZapierMarketplace',
    ]) {
      expect(
        existsSync(resolve(root, `src/components/integrations/${file}.tsx`)),
        `${file} was re-added without a mount point`,
      ).toBe(false);
    }
  });
});
