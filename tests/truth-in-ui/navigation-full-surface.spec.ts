/**
 * AURA DC full-surface navigation coverage.
 *
 * Complements the real-click navigation audit with deep-link/refresh coverage,
 * role-declared destinations, pilot isolation and browser history semantics.
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { test as guardedTest } from './_setup/fixtures';
import { installSupabaseMock, buildFakeSession } from './_setup/supabase-mock';
import { getRoleDashboardConfig } from '@/config/roleDashboardConfig';
import type { AppRole } from '@/contexts/RBACContext';

/** Canonical routes plus compatibility aliases that must continue to resolve. */
const DEEP_LINK_ROUTES: readonly string[] = [
  '/',
  '/dashboard',
  '/builder',
  '/deploy',
  '/deployments',
  '/analytics',
  '/operations',
  '/intelligence',
  '/account/profile',
  '/account/settings',
  '/account/access-control',
  '/teams',
  '/teams/access-control',
  '/teams/onboarding',
  '/admin/onboarding-submissions',
  '/admin/user-approvals',
  '/admin/signups-dashboard',
  '/admin/platform-readiness',
  '/admin/dsx-capabilities',
  '/admin/dataset-registry',
  '/admin/asset-pipeline',
  '/admin/reference-facility-validation',
  '/compliance',
  '/marketplace',
  '/marketplace/integrations',
  '/app/agents',
  '/blueprint/default',
  '/blueprint/preview',
  '/simulation',
  '/simulation/preview',
  '/help',
  '/connect/monitor',
  '/connect/health',
  '/search',
  '/universal-search',
  '/settings/ai',
  '/playbook',
  '/data-centre-twin',
  '/data-centre-twin?view=simulation',
  '/data-centre-twin/default',
  '/twin-preview',
  '/twin-datacentre',
  '/twin-debug',
  '/infrastructure',
  '/digital-twins-demo/funding-intake',
];

async function openAuthed(context: BrowserContext, page: Page, path: string): Promise<void> {
  const mock = await installSupabaseMock(context);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect.poll(() => mock.profileHits(), { timeout: 5_000 }).toBeGreaterThan(0);
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
}

function currentPath(page: Page): string {
  const u = new URL(page.url());
  return u.pathname + u.search;
}

async function clickManageDestination(page: Page, label: string): Promise<void> {
  // A route change can happen before Radix finishes the previous menu's close
  // animation. Reopening during that transition races the trigger and can leave
  // the next menu visually closed even though navigation is healthy.
  await expect(page.getByTestId('manage-menu')).toBeHidden().catch(() => {});
  await page.getByTestId('manage-trigger').click();
  const menu = page.getByTestId('manage-menu');
  await expect(menu).toBeVisible();
  await menu.getByRole('menuitem', { name: new RegExp(label, 'i') }).click();
}

guardedTest.describe('AURA DC full-surface deep-link coverage', () => {
  for (const route of DEEP_LINK_ROUTES) {
    guardedTest(`deep-link ${route} mounts inside authenticated shell`, async ({ context, page, guard }) => {
      if (/twin|infrastructure/.test(route)) guardedTest.setTimeout(60_000);
      await page.setViewportSize({ width: 1440, height: 900 });
      const consoleErrors: string[] = [];
      page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(`console.error: ${msg.text()}`);
      });

      await openAuthed(context, page, route);

      const landed = currentPath(page);
      expect(landed, `${route} must not silently redirect to pilot shell`).not.toMatch(/^\/pilot(\/|$)/);
      expect(landed, `${route} must not silently redirect to sign-in`).not.toMatch(/^\/(auth|sign-in|sign-up)/);
      const header = page.locator('header').first();
      await expect(header, `${route} renders the authenticated shell header`).toBeVisible({ timeout: 5_000 });

      const beforeReload = new URL(page.url()).pathname;
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
      expect(new URL(page.url()).pathname).toBe(beforeReload);

      const uncaught = consoleErrors.filter((line) =>
        !/ResizeObserver|WebGL|hydrat|ERR_BLOCKED_BY_CLIENT|Failed to load resource|net::/i.test(line),
      );
      expect(uncaught, `no uncaught runtime errors at ${route}`).toEqual([]);
      expect(guard.anyExternalCompleted()).toBe(false);
    });
  }
});

guardedTest.describe('AURA DC per-role header navigation (real clicks)', () => {
  const roles: AppRole[] = ['engineer', 'executive', 'manager', 'security_admin'];

  for (const roleKey of roles) {
    const cfg = getRoleDashboardConfig(roleKey);
    if (!cfg) continue;
    const primaryLinks = cfg.navigation.filter((n) => n.group === 'primary');

    guardedTest(`role=${roleKey} primary nav clicks land on declared routes`, async ({ context, page, guard }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      const mock = await installSupabaseMock(context);
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await expect.poll(() => mock.profileHits(), { timeout: 5_000 }).toBeGreaterThan(0);

      for (const item of primaryLinks) {
        const link = page.getByRole('link', { name: new RegExp(item.fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first();
        if (!(await link.count())) continue;
        if (!(await link.isVisible())) continue;
        await link.click();
        await expect
          .poll(() => currentPath(page), { timeout: 5_000, message: `${item.fullName} -> ${item.href}` })
          .toMatch(new RegExp(`^${item.href.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}(/|\\\\?|$)`));
        await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
      }

      expect(guard.anyExternalCompleted()).toBe(false);
    });
  }
});

guardedTest.describe('AURA DC pilot isolation', () => {
  guardedTest('pilot role stays inside /pilot/* even when deep-linking to /dashboard', async ({ context, page, guard }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const session = buildFakeSession('00000000-0000-4000-8000-000000000abc');
    const mock = await installSupabaseMock(context, { session, profileRole: 'user' });
    await context.route('**/rest/v1/user_roles*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => mock.profileHits(), { timeout: 5_000 }).toBeGreaterThan(0);
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 5_000, message: 'pilot deep-link must land inside /pilot' })
      .toMatch(/^\/pilot(\/|$)/);

    expect(guard.anyExternalCompleted()).toBe(false);
  });
});

guardedTest.describe('AURA DC browser back/forward preserves navigation', () => {
  guardedTest('back and forward step through canonical Manage history', async ({ context, page, guard }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await openAuthed(context, page, '/dashboard');

    await clickManageDestination(page, 'Facilities');
    await expect.poll(() => new URL(page.url()).pathname).toBe('/manage/facilities');

    await clickManageDestination(page, 'Agents');
    await expect.poll(() => new URL(page.url()).pathname).toBe('/app/agents');

    await page.goBack({ waitUntil: 'domcontentloaded' });
    await expect.poll(() => new URL(page.url()).pathname).toBe('/manage/facilities');

    await page.goForward({ waitUntil: 'domcontentloaded' });
    await expect.poll(() => new URL(page.url()).pathname).toBe('/app/agents');

    expect(guard.anyExternalCompleted()).toBe(false);
  });
});

void test;
void expect;
