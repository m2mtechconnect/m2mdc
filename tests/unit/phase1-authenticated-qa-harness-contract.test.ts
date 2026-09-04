import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (...parts: string[]) => resolve(process.cwd(), ...parts);
const acceptance = readFileSync(repo('tests', 'e2e', 'acceptance-final.spec.ts'), 'utf8');
const verticalSlice = readFileSync(repo('tests', 'e2e', 'phase1-vertical-slice.spec.ts'), 'utf8');
const goldenJourney = readFileSync(repo('tests', 'e2e', 'golden-user-journey.spec.ts'), 'utf8');
const authSetup = readFileSync(repo('tests', 'global-auth.setup.ts'), 'utf8');
const client = readFileSync(repo('tests', 'helpers', 'testSupabaseClient.ts'), 'utf8');
const playwright = readFileSync(repo('playwright.config.ts'), 'utf8');
const phasePlan = readFileSync(repo('docs', 'audit', 'phase-delivery-plan-2026-09-04.md'), 'utf8');

describe('Phase 1 authenticated QA harness contract', () => {
  it('keeps live acceptance behind an explicit disposable-QA switch', () => {
    expect(acceptance).toContain("process.env.QA_AUTH_BOOTSTRAP === '1'");
    expect(acceptance).toContain('Requires the disposable authenticated QA backend');
    expect(playwright).toContain("globalSetup: QA_AUTH_BOOTSTRAP ? './tests/global-auth.setup.ts' : undefined");
    expect(playwright).toContain("baseURL: PLAYWRIGHT_BASE_URL || 'http://localhost:8080'");
  });

  it('requires runtime identity and signs in through the application UI', () => {
    expect(authSetup).toContain("process.env.QA_BROWSER?.trim()");
    expect(authSetup).toContain("process.env.TEST_USER_ID?.trim()");
    expect(authSetup).toContain('resolveTestUserCredentials()');
    expect(authSetup).toContain("page.getByLabel('Email Address', { exact: true })");
    expect(authSetup).toContain("page.getByRole('button', { name: /^sign in$/i })");
    expect(authSetup).toContain('getBrowserTestSession(context)');
    expect(authSetup).toContain('context.storageState({ path: authStatePath })');
  });

  it('rejects non-loopback Supabase targets and never embeds credentials', () => {
    expect(client).toContain('only loopback hosts are permitted');
    expect(client).toContain('URL must not contain credentials, query parameters, or fragments');
    expect(client).toContain('Pre-seeded test user credentials are not configured');
    expect(client).not.toMatch(/(?:TEST_USER_PASSWORD|SUPABASE_SERVICE_ROLE_KEY)\s*[:=]\s*['"][^'"]+['"]/);
    expect(acceptance).not.toMatch(/(?:password|service_role|sb_secret|eyJ)[\s:=][^\n]+/i);
  });

  it('does not overstate the current live coverage as a complete vertical slice', () => {
    expect(acceptance).toContain('Builder persists one facility-bound draft and reloads that exact draft');
    expect(acceptance).toContain('Connections opens its real guarded setup workflow rather than a placeholder panel');
    expect(acceptance).toContain('platform admin Access Control route resolves to the live platform roster');
    expect(phasePlan).toContain('Repository contract complete; live QA blocked');
    expect(phasePlan).toContain('Authenticated UI-to-API-to-Supabase persistence');
    expect(phasePlan).toContain('append-only decision evidence');
  });

  it('keeps the persisted simulation journey guarded and provenance-aware', () => {
    expect(verticalSlice).toContain("test.skip(!LIVE_QA, 'Requires the disposable authenticated QA backend')");
    expect(verticalSlice).toContain("page.getByTestId('simulation-review-inputs')");
    expect(verticalSlice).toContain("page.getByTestId('workspace-run-scenario')");
    expect(verticalSlice).toContain("from('simulation_runs')");
    expect(verticalSlice).toContain("from('decision_records')");
    expect(verticalSlice).toContain("run_intent: 'preview'");
    expect(verticalSlice).toContain("data_mode: 'SIMULATED'");
    expect(verticalSlice).toContain('reloads the tenant-scoped evidence');
    expect(verticalSlice).not.toMatch(/(?:password|service_role|sb_secret|eyJ)[\s:=][^\n]+/i);
  });

  it('recovers a copied QA session after a prior global sign-out', () => {
    for (const lifecycleSpec of [acceptance, verticalSlice, goldenJourney]) {
      expect(lifecycleSpec).toContain('reauthenticateBrowserTestSessionIfNeeded');
    }
    expect(client).toContain('global sign-out contract');
    expect(client).toContain('never injects a token or bypasses approval');
  });
});
