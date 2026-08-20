import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cleanupTestData } from '../helpers/seedHelpers';

const repositoryFile = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('test harness safety guards', () => {
  it('rejects cleanup without an unambiguous user-scoped mode', async () => {
    await expect(
      cleanupTestData({ userId: '00000000-0000-4000-8000-000000000001' }),
    ).rejects.toThrow('exactly one explicit cleanup mode');
    await expect(
      cleanupTestData({
        userId: '00000000-0000-4000-8000-000000000001',
        allOwnedData: true,
        agentIds: ['00000000-0000-4000-8000-000000000002'],
      }),
    ).rejects.toThrow('exactly one explicit cleanup mode');
  });

  it('rejects missing or malformed ownership identifiers before deletion', async () => {
    await expect(
      cleanupTestData({ userId: '', allOwnedData: true }),
    ).rejects.toThrow('valid user UUID');
    await expect(
      cleanupTestData({
        userId: '00000000-0000-4000-8000-000000000001',
        agentIds: ['not-an-agent-id'],
      }),
    ).rejects.toThrow('valid agent UUIDs');
  });

  it('contains no delete-all sentinel or auth-admin deletion in seed helpers', () => {
    for (const path of ['tests/helpers/seedHelpers.ts', 'tests/seeds/studioData.ts']) {
      const source = repositoryFile(path);
      expect(source).not.toContain(".neq('id'");
      expect(source).not.toContain('auth.admin.deleteUser');
    }
  });

  it('contains no direct cloud Supabase endpoint in executable E2E tests', () => {
    for (const path of [
      'tests/e2e/auth-security.spec.ts',
      'tests/e2e/zapier-api-endpoints.spec.ts',
    ]) {
      expect(repositoryFile(path)).not.toMatch(/https:\/\/[^'"`]+\.supabase\.co/i);
    }
  });
});
