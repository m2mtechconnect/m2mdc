import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { repositoryFilesContaining } from '../../../tests/helpers/repositorySearch';

const root = process.cwd();
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

function grep(pattern: string): string[] {
  return repositoryFilesContaining({
    roots: ['src'],
    pattern: new RegExp(pattern),
    exclude: (path) => path.endsWith('/types.ts'),
  });
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
