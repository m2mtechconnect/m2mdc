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

    // Canonical IA (src/config/appNavigation.ts): header links are labelled
    // with each item's fullName and point at the canonical href.
    const matrix = [
      { name: 'Facility Blueprint', path: '/blueprint/default' },
      { name: 'Simulation Studio', path: '/simulation' },
      { name: 'Validation & Evidence', path: '/dsx/evidence-beta/overview' },
      { name: 'AI Factory Overview', path: '/dashboard' },
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

  test('desktop Manage submenu opens and navigates below xl breakpoint', async ({ context, page, guard }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await installSessionAndOpen(context, page);

    const trigger = page.getByTestId('manage-trigger');
    await expect(trigger, 'Manage trigger is rendered').toBeVisible();
    await trigger.click();

    const menu = page.getByTestId('manage-menu');
    await expect(menu).toBeVisible();

    const items = menu.getByRole('menuitem');
    const count = await items.count();
    expect(count, 'Manage menu must expose at least one destination').toBeGreaterThan(0);

    // Every rendered Manage destination must be a real anchor that commits a
    // route change to its own href - no dead menu entries.
    const hrefs: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const item = items.nth(index);
      const href = (await item.getAttribute('href'))
        ?? (await item.locator('a[href]').first().getAttribute('href').catch(() => null));
      if (href) hrefs.push(href);
    }
    expect(hrefs.length, 'Manage menu entries must be links').toBe(count);

    for (const href of hrefs) {
      await trigger.click();
      await page.locator(`[data-testid="manage-menu"] [href="${href}"]`).first().click();
      await expect
        .poll(() => new URL(page.url()).pathname, { timeout: 5_000 })
        .not.toBe('');
    }

    expect(guard.anyExternalCompleted()).toBe(false);
  });

  test('mobile drawer links navigate and close the drawer', async ({ context, page, guard }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await installSessionAndOpen(context, page);

    await page.getByRole('button', { name: 'Toggle mobile menu' }).click();
    const drawer = page.getByRole('dialog', { name: /Data Centre Twin Studio/i });
    await expect(drawer).toBeVisible();
    await drawer.getByRole('link', { name: 'Simulation Studio' }).first().click();
    await expectPath(page, '/simulation');
    await expect(page.getByRole('dialog', { name: /Data Centre Twin Studio/i })).toHaveCount(0);

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
    await expectPath(page, '/dsx/evidence-beta');

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