/**
 * Real-click navigation regression for the authenticated AURA DC shell.
 *
 * Covers desktop primary links, Manage/Govern menus, the mobile drawer,
 * dashboard actions and command-palette route targets under the network guard.
 */

import { test, expect } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';

async function installSessionAndOpen(
  context: import('@playwright/test').BrowserContext,
  page: import('@playwright/test').Page,
  path = '/dashboard',
) {
  const mock = await installSupabaseMock(context);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect
    .poll(() => mock.profileHits(), { timeout: 5_000, message: 'approval-gate profile query must be issued' })
    .toBeGreaterThan(0);
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
  await expect(page.locator('text=Account Pending Approval')).toHaveCount(0);
  return mock;
}

async function expectPath(page: import('@playwright/test').Page, expected: string) {
  await expect
    .poll(() => new URL(page.url()).pathname + new URL(page.url()).search, { timeout: 5_000 })
    .toBe(expected);
}

async function auditGroupedDestinations(
  page: import('@playwright/test').Page,
  parentName: string,
  childNames: readonly string[],
) {
  const trigger = page.getByRole('button', { name: parentName });
  await expect(trigger, `${parentName} group is rendered`).toBeVisible();

  for (const childName of childNames) {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await trigger.click();
    const link = page.getByRole('link', { name: childName, exact: true });
    await expect(link, `${parentName} exposes ${childName}`).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href, `${childName} must be a link`).toBeTruthy();
    const target = new URL(href!, 'http://localhost').pathname;
    await link.click();
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 5_000 }).toBe(target);
  }
}

test.describe('AURA DC authenticated navigation real-click matrix', () => {
  test('desktop header links navigate with React Router anchors', async ({ context, page, guard }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await installSessionAndOpen(context, page);

    const matrix = [
      { name: 'Design & Build', path: '/builder' },
      { name: 'Simulation', path: '/simulation' },
      { name: 'Evidence', path: '/evidence/overview' },
      { name: 'Command Center', path: '/dashboard' },
    ];

    for (const item of matrix) {
      const link = page.getByRole('link', { name: item.name }).first();
      await expect(link, `${item.name} is a visible link`).toBeVisible();
      await link.click();
      await expectPath(page, item.path);
    }

    const nestedInteractive = await page.locator('header a button, header button a').count();
    expect(nestedInteractive, 'header must not nest links and buttons').toBe(0);
    expect(guard.anyExternalCompleted()).toBe(false);
  });

  test('desktop Design & Build child destinations are real links', async ({ context, page, guard }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1400, height: 900 });
    await installSessionAndOpen(context, page);
    await auditGroupedDestinations(page, 'Design & Build', ['Facilities', 'Facility Blueprint', 'Connections', 'AI Runtime & Policies']);
    expect(guard.anyExternalCompleted()).toBe(false);
  });

  test('desktop Operations and Platform Admin child destinations are real links', async ({ context, page, guard }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1400, height: 900 });
    await installSessionAndOpen(context, page);
    await auditGroupedDestinations(page, 'Operations', ['Agents', 'Deployments']);
    await auditGroupedDestinations(page, 'Platform Admin', ['Platform Readiness']);
    expect(guard.anyExternalCompleted()).toBe(false);
  });

  test('mobile drawer links navigate and close the drawer', async ({ context, page, guard }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await installSessionAndOpen(context, page);

    await page.getByRole('button', { name: 'Toggle mobile menu' }).click();
    const drawer = page.locator('#mobile-nav-sheet');
    await expect(drawer).toBeVisible();
    await drawer.getByRole('link', { name: 'Simulation' }).first().click();
    await expectPath(page, '/simulation');
    await expect(drawer).toBeHidden();

    expect(guard.anyExternalCompleted()).toBe(false);
  });

  test('dashboard primary actions are real links', async ({ context, page, guard }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await installSessionAndOpen(context, page);

    await page.getByRole('link', { name: /^Start simulation$/i }).first().click();
    await expectPath(page, '/simulation?twin=aura-reference-facility');

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: /^Open Blueprint$/i }).first().click();
    await expectPath(page, '/blueprint/aura-reference-facility');

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: /^View Evidence$/i }).first().click();
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 5_000 })
      .toBe('/evidence/overview');
    const evidenceUrl = new URL(page.url());
    expect(evidenceUrl.searchParams.get('facility')).toBe('aura-reference-facility');
    expect(evidenceUrl.searchParams.get('scenario')).toBe('cooling_degradation');
    expect(evidenceUrl.searchParams.get('mode')).toBe('SIMULATED');
    expect(evidenceUrl.searchParams.get('run')).toBeTruthy();
    expect(evidenceUrl.searchParams.get('tick')).toBe('0');

    const nestedInteractive = await page.locator('main a button, main button a').count();
    expect(nestedInteractive, 'dashboard must not nest links and buttons').toBe(0);
    expect(guard.anyExternalCompleted()).toBe(false);
  });

  test('command palette route targets resolve to real routes', async ({ context, page, guard }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await installSessionAndOpen(context, page);

    await page.getByRole('button', { name: 'Open command palette' }).click();
    await page.getByRole('option', { name: /Prometheus Integration/i }).click();
    await expectPath(page, '/manage/integrations?tab=connections');

    await page.getByRole('button', { name: 'Open command palette' }).click();
    await page.getByRole('option', { name: /GPU Scheduler Agent Config/i }).click();
    await expectPath(page, '/app/agents');

    expect(guard.anyExternalCompleted()).toBe(false);
  });
});
