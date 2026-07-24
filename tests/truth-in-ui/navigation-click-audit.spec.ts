/**
 * Real-click navigation regression for the authenticated AURA DC shell.
 *
 * Covers desktop primary links, desktop submenu links, mobile drawer links,
 * dashboard card links, and command-palette route targets under the existing
 * network guard. The suite verifies real route changes, not just rendered text.
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

test.describe('AURA DC authenticated navigation real-click matrix', () => {
  test('desktop header links navigate with React Router anchors', async ({ context, page, guard }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await installSessionAndOpen(context, page);

    const matrix = [
      { name: 'Engineering Workbench', path: '/' },
      { name: 'Build Data Centre Twin', path: '/builder' },
      { name: 'Subsystem Agents', path: '/app/agents' },
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

  test('desktop More submenu opens and navigates below xl breakpoint', async ({ context, page, guard }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await installSessionAndOpen(context, page);

    await page.getByRole('button', { name: 'More navigation' }).click();
    await page.getByRole('menuitem', { name: /Telemetry & Analytics/i }).click();
    await expectPath(page, '/intelligence');

    await page.getByRole('button', { name: 'More navigation' }).click();
    await page.getByRole('menuitem', { name: /Simulation/i }).click();
    await expectPath(page, '/data-centre-twin?view=simulation');

    await page.getByRole('button', { name: 'More navigation' }).click();
    await page.getByRole('menuitem', { name: /Teams/i }).click();
    await expectPath(page, '/teams');

    await page.getByRole('button', { name: 'More navigation' }).click();
    await page.getByRole('menuitem', { name: /Infrastructure/i }).click();
    await expectPath(page, '/infrastructure');

    expect(guard.anyExternalCompleted()).toBe(false);
  });

  test('mobile drawer links navigate and close the drawer', async ({ context, page, guard }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await installSessionAndOpen(context, page);

    await page.getByRole('button', { name: 'Toggle mobile menu' }).click();
    await expect(page.getByRole('dialog', { name: /Data Centre Twin Studio/i })).toBeVisible();
    await page.getByRole('link', { name: 'Build Data Centre Twin' }).click();
    await expectPath(page, '/builder');
    await expect(page.getByRole('dialog', { name: /Data Centre Twin Studio/i })).toHaveCount(0);

    expect(guard.anyExternalCompleted()).toBe(false);
  });

  test('dashboard KPI, quick-link, and action cards are real links', async ({ context, page, guard }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await installSessionAndOpen(context, page);

    await page.getByRole('link', { name: /Global PUE - open data centre twin/i }).click();
    await expectPath(page, '/data-centre-twin');

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: /Open Data Centre Twin Dashboard/i }).click();
    await expectPath(page, '/data-centre-twin');

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: /View Blueprint/i }).click();
    await expectPath(page, '/blueprint/default');

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: /Run Simulation/i }).click();
    await expectPath(page, '/data-centre-twin/default?view=simulation&demo=true');

    const nestedInteractive = await page.locator('main a button, main button a').count();
    expect(nestedInteractive, 'dashboard must not nest links and buttons').toBe(0);
    expect(guard.anyExternalCompleted()).toBe(false);
  });

  test('command palette route targets resolve to real routes', async ({ context, page, guard }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await installSessionAndOpen(context, page);

    await page.getByRole('button', { name: 'Open command palette' }).click();
    await page.getByRole('option', { name: /Prometheus Integration/i }).click();
    await expectPath(page, '/connect/monitor');

    await page.getByRole('button', { name: 'Open command palette' }).click();
    await page.getByRole('option', { name: /GPU Scheduler Agent Config/i }).click();
    await expectPath(page, '/app/agents');

    expect(guard.anyExternalCompleted()).toBe(false);
  });
});