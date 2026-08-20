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

  it('installs Bun before the visual regression workflow uses it', () => {
    const workflow = repositoryFile('.github/workflows/visual-regression.yml');
    expect(workflow).toContain('uses: oven-sh/setup-bun@v2');
    expect(workflow.indexOf('uses: oven-sh/setup-bun@v2')).toBeLessThan(
      workflow.indexOf('run: bun install --frozen-lockfile'),
    );
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

  it('makes the user-specific profile backfill safe for clean replay', () => {
    const userBackfill = repositoryFile(
      'supabase/migrations/20260218142636_a59bb8cb-5e00-4e13-b63d-19eb97d7d4bb.sql',
    );
    expect(userBackfill).toContain('FROM auth.users AS source_user');
    expect(userBackfill).toContain("WHERE source_user.id = 'dc4ffd38-7474-4ece-a76d-9203538687ed'::uuid");
    expect(userBackfill).not.toContain('INSERT INTO auth.users');
  });

  it('makes the user-specific administrative grant safe for clean replay', () => {
    const roleBackfill = repositoryFile(
      'supabase/migrations/20260731185028_01b5764d-1ffd-480a-a835-acc0b51997fd.sql',
    );
    expect(roleBackfill).toContain('FROM auth.users AS source_user');
    expect(roleBackfill).toContain(
      "WHERE source_user.id = 'f3c0f534-4df8-4cb1-901a-b8d6abe08742'::uuid",
    );
    expect(roleBackfill).not.toContain('INSERT INTO auth.users');
  });

  it('keeps browser security checks on explicit loopback Supabase configuration', () => {
    const config = repositoryFile('playwright.truth.config.ts');
    const mock = repositoryFile('tests/truth-in-ui/_setup/supabase-mock.ts');

    expect(config).toContain('VITE_SUPABASE_URL=http://127.0.0.1:54321');
    expect(config).toContain('VITE_SUPABASE_PUBLISHABLE_KEY=safe-placeholder-anon-key');
    expect(mock).toContain("new Set(['127.0.0.1', 'localhost', '[::1]', '::1'])");
  });

  it('provides a declared Node 20 WebSocket transport for test-only Supabase clients', () => {
    const helper = repositoryFile('tests/helpers/testSupabaseClient.ts');
    const packageJson = repositoryFile('package.json');
    expect(helper).toContain("import WebSocket from 'ws'");
    expect(helper).toContain('realtime: { transport: WebSocket }');
    expect(packageJson).toContain('"ws": "8.21.0"');
  });

  it('does not auto-download the landing-page background video while idle', () => {
    const hero = repositoryFile('src/components/landing/TwinHero.tsx');
    const viteConfig = repositoryFile('vite.config.ts');

    expect(hero).toContain("addEventListener('pointerdown', revealVideo");
    expect(hero).not.toContain('requestIdleCallback');
    expect(viteConfig).toContain("'react-dom/client'");
    expect(viteConfig).not.toMatch(/'vendor-3d'\s*:/);
  });

  it('keeps the public landing page audit-friendly without weakening Lighthouse', () => {
    const hero = repositoryFile('src/components/landing/TwinHero.tsx');
    const feature = repositoryFile('src/components/landing/TwinFeatureSection.tsx');
    const footer = repositoryFile('src/components/landing/TwinFooter.tsx');
    const lighthouse = repositoryFile('lighthouserc.json');

    expect(hero).toContain('width={1920}');
    expect(hero).toContain('width={1564}');
    expect(feature).toContain('loading="lazy"');
    expect(feature).toContain('width={imageWidth}');
    expect(footer).not.toContain('<h4');
    expect(lighthouse).toContain('"preset": "lighthouse:recommended"');
    expect(lighthouse).toContain('"categories:performance": ["error", {"minScore": 0.85}]');
  });
});
