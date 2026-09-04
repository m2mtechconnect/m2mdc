/**
 * Real-click navigation regression for the authenticated AURA DC shell.
 *
 * Covers desktop primary links, supporting routes, the mobile drawer,
 * dashboard actions and command-palette route targets under the network guard.
 */

import { test, expect } from './_setup/fixtures';
import { assertNoOnboardingOverlay, seedDismissedTours } from './_setup/app-state';
import { installSupabaseMock } from './_setup/supabase-mock';

async function installSessionAndOpen(
  context: import('@playwright/test').BrowserContext,
  page: import('@playwright/test').Page,
  path = '/dashboard',
) {
  // Navigation correctness is exercised as a returning operator. First-run
  // onboarding has its own coverage and must not intercept unrelated links.
  await seedDismissedTours(context);
  // This journey verifies the authorized Builder surface, so model the
  // server-owned tenant membership and active_org_id contract explicitly.
  const mock = await installSupabaseMock(context, { withActiveOrganization: true });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect
    .poll(() => mock.profileHits(), { timeout: 5_000, message: 'approval-gate profile query must be issued' })
    .toBeGreaterThan(0);
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
  await expect(page.locator('text=Account Pending Approval')).toHaveCount(0);
  await assertNoOnboardingOverlay(page, `navigation ${path}`);
  return mock;
}

async function expectPath(page: import('@playwright/test').Page, expected: string) {
  await expect
    .poll(() => new URL(page.url()).pathname + new URL(page.url()).search, { timeout: 5_000 })
    .toBe(expected);
}

async function expectWorkspaceCommitted(
  page: import('@playwright/test').Page,
  workspace: 'dashboard' | 'builder' | 'operations' | 'simulation' | 'evidence',
) {
  const marker = workspace === 'dashboard'
    ? page.getByTestId('facility-highlights').getByRole('heading', { level: 1 })
    : workspace === 'builder'
      // The mocked organization is intentionally empty. A successful Builder
      // navigation therefore commits the tenant-scoped first-facility state;
      // it must not fabricate a saved facility just to reach the build form.
      ? page.getByRole('heading', { name: 'Create your first facility', level: 1 })
      : workspace === 'operations'
        ? page.getByRole('heading', { name: 'Operations & Telemetry', level: 1 })
        : workspace === 'simulation'
          ? page.getByTestId('aura-workspace')
          : page.getByTestId('dsx-workspace-title');

  await expect(marker, `${workspace} must commit visible page content, not only update the URL`).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText('Loading workspace...', { exact: true })).toHaveCount(0);
}

async function expectEvidenceContext(
  page: import('@playwright/test').Page,
  expectedPath: string,
) {
  await expect
    .poll(
      () => {
        const current = new URL(page.url());
        return {
          pathname: current.pathname,
          facility: current.searchParams.get('facility'),
          scenario: current.searchParams.get('scenario'),
          mode: current.searchParams.get('mode'),
          runPresent: Boolean(current.searchParams.get('run')),
          tick: current.searchParams.get('tick'),
        };
      },
      { timeout: 5_000, message: 'Evidence route must resolve complete reproducible provenance' },
    )
    .toEqual({
      pathname: expectedPath,
      facility: 'aura-reference-facility',
      scenario: 'cooling_degradation',
      mode: 'SIMULATED',
      runPresent: true,
      tick: '0',
    });
}

test.describe('AURA DC authenticated navigation real-click matrix', () => {
  test('desktop header links navigate with React Router anchors', async ({ context, page, guard }) => {
    // This is a five-workspace correctness journey, not a performance budget.
    // Each destination must commit real content before the next click, so the
    // suite-level 20 s default is too short on a cold CI runner even when every
    // navigation is healthy. Performance thresholds live in the dedicated
    // performance and route-stress suites.
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1600, height: 900 });
    await installSessionAndOpen(context, page);

    const matrix = [
      { name: 'Design & Build', path: '/builder', workspace: 'builder' },
      { name: 'Operations', path: '/analytics', workspace: 'operations' },
      // Simulation owns its active workflow step in the canonical URL. The
      // workspace initializes on Inspect when no explicit step is supplied,
      // so the real-click contract must wait for that committed URL rather
      // than asserting the transient bare route.
      { name: 'Simulation', path: '/simulation?step=inspect', workspace: 'simulation' },
      { name: 'Evidence', path: '/evidence/overview', workspace: 'evidence' },
      { name: 'Command Center', path: '/dashboard', workspace: 'dashboard' },
    ] as const;

    for (const item of matrix) {
      const candidate = page.getByRole('link', { name: item.name }).first();
      if (!(await candidate.isVisible().catch(() => false))) {
        await page.getByRole('button', { name: 'Toggle mobile menu' }).click();
      }
      const link = page.getByRole('link', { name: item.name }).filter({ visible: true }).first();
      await expect(link, `${item.name} is a visible link`).toBeVisible();
      await link.click();
      if (item.name === 'Evidence') {
        await expectEvidenceContext(page, item.path);
      } else {
        await expectPath(page, item.path);
      }
      await expectWorkspaceCommitted(page, item.workspace);
    }

    const nestedInteractive = await page.locator('header a button, header button a').count();
    expect(nestedInteractive, 'header must not nest links and buttons').toBe(0);
    expect(guard.anyExternalCompleted()).toBe(false);
  });

  test('supporting workspace routes remain reachable but outside global navigation', async ({ context, page, guard }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1400, height: 900 });
    await installSessionAndOpen(context, page);

    const supportingRoutes = [
      '/manage/facilities',
      '/blueprint',
      '/manage/integrations',
      '/settings/ai',
      '/app/agents',
      '/deployments',
      '/admin/platform-readiness',
    ] as const;

    for (const href of supportingRoutes) {
      await page.goto(href, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
      await expect(page.locator('header').first(), `${href} remains inside the authenticated shell`).toBeVisible();
      await page.getByRole('button', { name: 'Toggle mobile menu' }).click();
      const drawer = page.locator('#mobile-nav-sheet');
      await expect(drawer).toBeVisible();
      await expect(drawer.locator(`a[href="${href}"]`), `${href} is not promoted globally`).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(drawer).toBeHidden();
    }

    expect(guard.anyExternalCompleted()).toBe(false);
  });

  test('mobile drawer links navigate and close the drawer', async ({ context, page, guard }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await installSessionAndOpen(context, page);

    await page.getByRole('button', { name: 'Toggle mobile menu' }).click();
    const drawer = page.locator('#mobile-nav-sheet');
    await expect(drawer).toBeVisible();
    await drawer.getByRole('link', { name: 'Simulation' }).first().click();
    // The compact workspace intentionally opens the inspector and owns that
    // state in the canonical URL so refresh/back preserve the active step.
    await expectPath(page, '/simulation?step=inspect');
    await expectWorkspaceCommitted(page, 'simulation');
    await expect(drawer).toBeHidden();

    // Simulation intentionally opens its workspace inspector on mobile. Close
    // that independent dialog before exercising the global navigation trigger.
    const workspaceInspector = page.getByTestId('workspace-inspector-drawer');
    await expect(workspaceInspector).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press('Escape');
    await expect(workspaceInspector).toBeHidden();

    const trigger = page.getByRole('button', { name: 'Toggle mobile menu' });
    await trigger.click();
    await expect(drawer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();

    expect(guard.anyExternalCompleted()).toBe(false);
  });

  test('dashboard primary actions and workspace links are real', async ({ context, page, guard }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await installSessionAndOpen(context, page);

    await page.getByRole('link', { name: /^Start simulation$/i }).first().click();
    // The simulation workflow owns its active step in the URL. A dashboard
    // link without an explicit step is canonicalized to the inspect state.
    await expectPath(page, '/simulation?twin=aura-reference-facility&step=inspect');

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: /^Open Blueprint$/i }).first().click();
    await expectPath(page, '/blueprint/aura-reference-facility');

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page
      .getByTestId('primary-navigation')
      .getByRole('link', { name: /^Evidence$/i })
      .click();
    await expectEvidenceContext(page, '/evidence/overview');

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
