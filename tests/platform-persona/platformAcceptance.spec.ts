import { test, expect, type Page } from '@playwright/test';
import { installPlatformBackend, type PlatformPersonaRole } from './platformBackend';

const FORBIDDEN_CUSTOMER_TERMS = /\b(?:lovable|zapier|mcp|supabase|openai|gemini|gpt(?:-?\d+)?|google cloud|vertex ai)\b/i;
const PLACEHOLDER_SUCCESS_TERMS = /\b(?:coming soon|will be available soon|placeholder feature|mock data|fake data)\b/i;
const FATAL_ROUTE_TERMS = /\b(?:page not found|something went wrong|authorization error|system could not be loaded)\b/i;
const ROUTE_LOADING_TERMS = /(?:loading your workspace|loading workspace\.\.\.|checking administrator permissions\.\.\.)/i;

interface RouteCase {
  path: string;
  expectedPath?: string;
}

interface PersonaCase {
  name: string;
  role: PlatformPersonaRole;
  routes: RouteCase[];
}

const PERSONAS: PersonaCase[] = [
  {
    name: 'platform admin',
    role: 'admin',
    routes: [
      { path: '/dashboard' },
      { path: '/analytics' },
      { path: '/account/profile' },
      { path: '/account/settings' },
      { path: '/teams' },
      { path: '/admin/platform-readiness' },
      { path: '/manage/integrations' },
      { path: '/manage/facilities' },
      { path: '/marketplace' },
      { path: '/app/agents' },
      { path: '/builder?new=true&goal=Acceptance&type=agent&step=1' },
      { path: '/settings/ai' },
      { path: '/infrastructure', expectedPath: '/blueprint/default' },
      { path: '/dsx/evidence-beta', expectedPath: '/dsx/evidence-beta/overview' },
    ],
  },
  {
    name: 'tenant admin',
    role: 'owner',
    routes: [
      { path: '/dashboard' },
      { path: '/account/settings' },
      { path: '/teams' },
      { path: '/teams/access-control' },
      { path: '/admin/platform-readiness' },
      { path: '/manage/integrations' },
      { path: '/manage/facilities' },
      { path: '/builder?new=true&goal=Tenant+Acceptance&type=agent&step=1' },
      { path: '/analytics' },
    ],
  },
  {
    name: 'operations engineer',
    role: 'engineer',
    routes: [
      { path: '/dashboard' },
      { path: '/analytics' },
      { path: '/manage/integrations' },
      { path: '/manage/facilities' },
      { path: '/studio/systems/system-1/manage' },
      { path: '/simulation' },
      { path: '/dsx/evidence-beta/operations/thermal' },
    ],
  },
  {
    name: 'builder manager',
    role: 'manager',
    routes: [
      { path: '/dashboard' },
      { path: '/builder?new=true&goal=Manager+Acceptance&type=agent&step=1' },
      { path: '/analytics' },
      { path: '/settings/ai' },
      { path: '/teams' },
      { path: '/blueprint/preview' },
      { path: '/simulation/preview' },
    ],
  },
  {
    name: 'executive',
    role: 'executive',
    routes: [
      { path: '/dashboard' },
      { path: '/analytics' },
      { path: '/account/settings' },
      { path: '/teams' },
      { path: '/dsx/evidence-beta/sustainability' },
    ],
  },
  {
    name: 'compliance officer',
    role: 'compliance',
    routes: [
      { path: '/dashboard' },
      { path: '/analytics' },
      { path: '/teams/access-control' },
      { path: '/dsx/evidence-beta/decisions/log' },
      { path: '/dsx/evidence-beta/sustainability/sovereignty' },
    ],
  },
  {
    name: 'viewer',
    role: 'viewer',
    routes: [
      { path: '/dashboard' },
      { path: '/analytics' },
      { path: '/manage/integrations' },
      { path: '/app/agents' },
    ],
  },
];

function canonicalPath(route: RouteCase): string {
  return route.expectedPath ?? new URL(route.path, 'http://acceptance.local').pathname;
}

async function assertRouteCommitted(page: Page, route: RouteCase) {
  const expectedPath = canonicalPath(route);
  await page.goto(route.path, { waitUntil: 'domcontentloaded' });

  await expect.poll(async () => {
    const body = await page.locator('body').innerText();
    return {
      path: new URL(page.url()).pathname,
      committed: body.length > 40 && !ROUTE_LOADING_TERMS.test(body),
    };
  }, { timeout: 30_000, intervals: [100, 250, 500, 1000] }).toEqual({
    path: expectedPath,
    committed: true,
  });

  await expect(page.getByTestId('route-load-recovery')).toHaveCount(0);
  const body = await page.locator('body').innerText();
  expect(body, `${route.path} rendered a fatal route state`).not.toMatch(FATAL_ROUTE_TERMS);
  expect(body, `${route.path} exposed customer-facing implementation terminology`).not.toMatch(FORBIDDEN_CUSTOMER_TERMS);
  expect(body, `${route.path} exposed an operational-looking placeholder`).not.toMatch(PLACEHOLDER_SUCCESS_TERMS);
}

for (const persona of PERSONAS) {
  test(`${persona.name}: canonical routes commit without placeholders, vendor plumbing or unexpected egress`, async ({ context, page }) => {
    test.setTimeout(300_000);
    const backend = await installPlatformBackend(context, persona.role);
    const findings: string[] = [];

    for (const route of persona.routes) {
      try {
        await assertRouteCommitted(page, route);
      } catch (error) {
        findings.push(`${route.path}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (backend.blockedRequests().length > 0) {
      findings.push(`unexpected application/backend egress: ${backend.blockedRequests().join(', ')}`);
    }

    expect(findings, `${persona.name} route findings`).toEqual([]);
  });
}

test('direct admin routes follow canonical permissions for platform and tenant roles', async ({ browser }) => {
  for (const role of ['admin', 'owner'] as PlatformPersonaRole[]) {
    const context = await browser.newContext();
    await installPlatformBackend(context, role);
    const page = await context.newPage();
    await page.goto('/admin/platform-readiness', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => new URL(page.url()).pathname).toBe('/admin/platform-readiness');
    await context.close();
  }

  for (const role of ['executive', 'manager', 'engineer', 'compliance', 'viewer'] as PlatformPersonaRole[]) {
    const context = await browser.newContext();
    await installPlatformBackend(context, role);
    const page = await context.newPage();
    await page.goto('/admin/platform-readiness', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => new URL(page.url()).pathname).toBe('/dashboard');
    await context.close();
  }
});

test('workspace settings authority follows canonical permissions and persistence uses the backend', async ({ browser }) => {
  for (const role of ['admin', 'owner'] as PlatformPersonaRole[]) {
    const context = await browser.newContext();
    const backend = await installPlatformBackend(context, role);
    const page = await context.newPage();
    await page.goto('/account/settings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Workspace settings' })).toBeVisible();
    const save = page.getByRole('button', { name: 'Save Changes' });
    await expect(save, `${role} must be able to persist workspace settings`).toBeVisible();
    await page.getByLabel('Workspace Name').fill(`Acceptance ${role}`);
    await save.click();
    await expect.poll(() => backend.countWrite('/rest/v1/organizations')).toBeGreaterThan(0);
    await context.close();
  }

  const context = await browser.newContext();
  await installPlatformBackend(context, 'executive');
  const page = await context.newPage();
  await page.goto('/account/settings', { waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('Workspace Name')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Save Changes' })).toHaveCount(0);
  await context.close();
});

test('team invitation is a real server request and is sealed from viewers', async ({ browser }) => {
  const adminContext = await browser.newContext();
  const adminBackend = await installPlatformBackend(adminContext, 'admin');
  const adminPage = await adminContext.newPage();
  await adminPage.goto('/teams', { waitUntil: 'domcontentloaded' });
  const invite = adminPage.getByRole('button', { name: /invite/i }).first();
  await expect(invite).toBeEnabled();
  await invite.click();
  const dialog = adminPage.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Invite Team Member' })).toBeVisible();
  await dialog.getByLabel('Email Address').fill('new.member@acceptance.example');
  await dialog.getByRole('combobox').first().click();
  await adminPage.getByRole('option', { name: /Engineer/ }).click();
  await dialog.getByRole('button', { name: 'Send Invite' }).click();
  await expect.poll(() => adminBackend.countFunction('/functions/v1/teams-invite')).toBe(1);
  await adminContext.close();

  const viewerContext = await browser.newContext();
  await installPlatformBackend(viewerContext, 'viewer');
  const viewerPage = await viewerContext.newPage();
  await viewerPage.goto('/teams', { waitUntil: 'domcontentloaded' });
  await expect(viewerPage.getByRole('button', { name: /invite/i })).toHaveCount(0);
  await viewerContext.close();
});

test('AI settings truthfully persist locally and health check invokes the server capability', async ({ context, page }) => {
  const backend = await installPlatformBackend(context, 'manager');
  await page.goto('/settings/ai', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('ai-settings-workspace')).toBeVisible();
  await page.locator('#ai-project-id').fill('acceptance-project');
  await page.getByRole('button', { name: 'Save Configuration' }).click();
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('copilot_settings'))).not.toBeNull();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('copilot_settings') ?? '{}'));
  expect(stored.projectId).toBe('acceptance-project');

  await page.getByRole('button', { name: 'Run Health Check' }).click();
  await expect.poll(() => backend.countFunction('/functions/v1/copilot-health')).toBe(1);
});

test('analytics export produces a real provenance-preserving download', async ({ context, page }) => {
  await installPlatformBackend(context, 'manager');
  await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
  const trigger = page.getByTestId('intelligence-export-trigger');
  await expect(trigger).toBeVisible();
  await trigger.click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Download JSON/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.json$/i);
});

test('system clone is either real or explicitly unavailable, never a fake-success action', async ({ context, page }) => {
  const backend = await installPlatformBackend(context, 'engineer');
  await page.goto('/studio/systems/system-1/manage', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'System Management' })).toBeVisible();

  const clone = page.getByRole('button', { name: /clone/i }).first();
  if (await clone.count() === 0) return;

  if (await clone.isDisabled()) {
    const label = `${await clone.getAttribute('aria-label') ?? ''} ${await clone.innerText()}`;
    expect(label).toMatch(/unavailable|not available/i);
    return;
  }

  const before = backend.writes().length + backend.functionCalls().length;
  await clone.click();
  await expect.poll(() => backend.writes().length + backend.functionCalls().length).toBeGreaterThan(before);
});
