import { createHash } from 'node:crypto';
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

  it('installs Bun for every Test Suite job that executes Bun commands', () => {
    const workflow = repositoryFile('.github/workflows/test.yml');
    expect(workflow.match(/uses: oven-sh\/setup-bun@v2/g)).toHaveLength(6);
    expect(workflow).toContain("bun-version: '1.3.3'");
    expect(workflow).toContain('run: bun audit --audit-level=moderate');
    expect(workflow).not.toContain('run: npm audit');
    expect(workflow).not.toContain('secrets.TEST_SUPABASE');
    expect(workflow).toContain('TEST_SUPABASE_URL: http://127.0.0.1:54321');
    expect(workflow).toContain('Verify loopback-only test backend');
  });

  it('runs the focused QA accessibility command only on its installed browser', () => {
    const workflow = repositoryFile('.github/workflows/qa-suite.yml');
    expect(workflow).toContain('playwright install --with-deps chromium');
    expect(workflow).toContain('playwright test --project=chromium --grep "@a11y"');
  });

  it('restores the replay search path without rewriting security migration history', () => {
    const bridge = repositoryFile(
      'supabase/migrations/20260206150807_restore_public_search_path.sql',
    );
    const historicalMigration = repositoryFile(
      'supabase/migrations/20260206150808_4cb276a5-a341-4b08-a939-83ac1e9b5bcc.sql',
    );
    expect(bridge).toContain("set_config('search_path', 'public', false)");
    expect(createHash('sha256').update(historicalMigration).digest('hex')).toBe(
      'a100fe44048877237b50f90f78d08bb1d61eb1a0e2402d34a70ed4e30a1cbb34',
    );
  });
});
