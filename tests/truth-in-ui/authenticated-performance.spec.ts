/**
 * Authenticated route performance and recovery gate.
 *
 * This replaces the retired unauthenticated suite that measured `/agents`,
 * Marketplace and numbered Builder steps. A route is ready only when its
 * user-visible outcome has committed; `networkidle`, a mounted container and
 * an unchanged URL are not readiness evidence.
 */
import { performance } from 'node:perf_hooks';
import type { BrowserContext, Locator, Page, Route } from '@playwright/test';
import { test, expect } from './_setup/fixtures';
import { seedDismissedTours } from './_setup/app-state';
import { installSupabaseMock } from './_setup/supabase-mock';

const BUDGETS = {
  coldMeaningfulMs: 6_000,
  warmPrimaryNavigationMs: 3_500,
  firstContentfulPaintMs: 3_000,
  cumulativeLayoutShift: 0.1,
  totalBlockingMs: 500,
} as const;

type PerfState = {
  lcpMs: number | null;
  cls: number;
  layoutShifts: Array<{ value: number; startTime: number; sources: string[] }>;
  totalBlockingMs: number;
};

type PerfWindow = Window & { __auraPerfState?: PerfState };

async function installPerformanceCapture(page: Page) {
  await page.addInitScript(() => {
    const target = window as PerfWindow;
    const state: PerfState = { lcpMs: null, cls: 0, layoutShifts: [], totalBlockingMs: 0 };
    target.__auraPerfState = state;

    const observe = (type: string, onEntries: (entries: PerformanceEntry[]) => void) => {
      try {
        const observer = new PerformanceObserver((list) => onEntries(list.getEntries()));
        observer.observe({ type, buffered: true });
      } catch {
        // Unsupported metrics remain null/zero; the mandatory FCP and
        // meaningful-content assertions still prevent a false pass.
      }
    };

    observe('largest-contentful-paint', (entries) => {
      const latest = entries.at(-1);
      if (latest) state.lcpMs = latest.startTime;
    });
    observe('layout-shift', (entries) => {
      for (const entry of entries) {
        const shift = entry as PerformanceEntry & {
          value?: number;
          hadRecentInput?: boolean;
          sources?: Array<{ node?: Node | null }>;
        };
        if (!shift.hadRecentInput) {
          const value = shift.value ?? 0;
          state.cls += value;
          state.layoutShifts.push({
            value,
            startTime: shift.startTime,
            sources: (shift.sources ?? []).map(({ node }) => {
              if (!(node instanceof Element)) return 'unknown';
              const id = node.id ? `#${node.id}` : '';
              const classes = Array.from(node.classList).slice(0, 4).map((name) => `.${name}`).join('');
              return `${node.tagName.toLowerCase()}${id}${classes}`;
            }),
          });
        }
      }
    });
    observe('longtask', (entries) => {
      for (const entry of entries) state.totalBlockingMs += Math.max(0, entry.duration - 50);
    });
  });
}

async function installAuthorizedSession(context: BrowserContext) {
  await seedDismissedTours(context);
  return installSupabaseMock(context, { withActiveOrganization: true, profileRole: 'admin' });
}

function meaningfulMarker(page: Page, id: RouteCase['id']): Locator {
  switch (id) {
    case 'dashboard':
      return page.getByTestId('facility-highlights').getByRole('heading', { level: 1 });
    case 'builder':
      return page.getByRole('heading', { name: /Create your first facility|Start a facility build/i, level: 1 });
    case 'operations':
      return page.getByRole('heading', { name: 'Operations & Telemetry', level: 1 });
    case 'simulation':
      return page.getByTestId('aura-workspace');
    case 'evidence':
      return page.getByTestId('dsx-workspace-title').or(
        page.getByRole('heading', { name: 'Evidence unavailable for this facility', level: 1 }),
      );
    case 'search':
      return page.getByRole('search');
    case 'workspace-settings':
      return page.getByRole('heading', { name: 'Workspace settings', level: 1 });
    case 'ai-settings':
      return page.getByTestId('ai-settings-workspace');
  }
}

type RouteCase = {
  id:
    | 'dashboard'
    | 'builder'
    | 'operations'
    | 'simulation'
    | 'evidence'
    | 'search'
    | 'workspace-settings'
    | 'ai-settings';
  path: string;
};

const CURRENT_AUTHENTICATED_ROUTES: RouteCase[] = [
  { id: 'dashboard', path: '/dashboard' },
  { id: 'builder', path: '/builder' },
  { id: 'operations', path: '/analytics' },
  { id: 'simulation', path: '/simulation?step=inspect' },
  { id: 'evidence', path: '/evidence/overview' },
  { id: 'search', path: '/search' },
  { id: 'workspace-settings', path: '/account/settings' },
  { id: 'ai-settings', path: '/settings/ai' },
];

async function readVitals(page: Page) {
  await expect
    .poll(
      () => page.evaluate(() => performance.getEntriesByName('first-contentful-paint').length),
      { timeout: 2_000, message: 'first contentful paint must be observable' },
    )
    .toBeGreaterThan(0);

  return page.evaluate(() => {
    const state = (window as PerfWindow).__auraPerfState;
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    return {
      fcpMs: fcp?.startTime ?? null,
      lcpMs: state?.lcpMs ?? null,
      cls: state?.cls ?? 0,
      layoutShifts: state?.layoutShifts ?? [],
      totalBlockingMs: state?.totalBlockingMs ?? 0,
    };
  });
}

test.describe('authenticated meaningful-content performance', () => {
  test('current routes commit meaningful content within explicit budgets', async ({ context }, testInfo) => {
    test.setTimeout(90_000);
    await installAuthorizedSession(context);

    const results: Array<Record<string, string | number | null>> = [];
    for (const route of CURRENT_AUTHENTICATED_ROUTES) {
      // A fresh document per route makes this a genuine cold-load check and
      // guarantees FCP is recorded; reusing one page can restore a same-origin
      // document without emitting a new paint entry.
      const page = await context.newPage();
      await installPerformanceCapture(page);
      const startedAt = performance.now();
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await expect(meaningfulMarker(page, route.id), `${route.path} meaningful content`).toBeVisible({
        timeout: BUDGETS.coldMeaningfulMs,
      });
      await expect(page.getByText('Loading workspace...', { exact: true })).toHaveCount(0);
      const meaningfulMs = performance.now() - startedAt;
      // Capture late async layout work after the meaningful marker commits.
      await page.waitForTimeout(500);
      const vitals = await readVitals(page);

      expect(meaningfulMs, `${route.path} time to meaningful content`).toBeLessThan(BUDGETS.coldMeaningfulMs);
      expect(vitals.fcpMs, `${route.path} first contentful paint`).not.toBeNull();
      expect(vitals.fcpMs as number, `${route.path} first contentful paint`).toBeLessThan(
        BUDGETS.firstContentfulPaintMs,
      );
      expect(
        vitals.cls,
        `${route.path} cumulative layout shift; sources=${JSON.stringify(vitals.layoutShifts)}`,
      ).toBeLessThanOrEqual(
        BUDGETS.cumulativeLayoutShift,
      );
      expect(vitals.totalBlockingMs, `${route.path} total blocking time`).toBeLessThanOrEqual(
        BUDGETS.totalBlockingMs,
      );
      results.push({ route: route.path, meaningfulMs, ...vitals });
      await page.close();
    }

    await testInfo.attach('authenticated-route-performance.json', {
      body: Buffer.from(JSON.stringify({ budgets: BUDGETS, results }, null, 2)),
      contentType: 'application/json',
    });
  });

  test('primary header navigation reaches meaningful content without a reload', async ({ context, page }, testInfo) => {
    test.setTimeout(45_000);
    await installAuthorizedSession(context);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(meaningfulMarker(page, 'dashboard')).toBeVisible();

    const journeys = [
      { name: 'Design & Build', route: { id: 'builder', path: '/builder' } },
      { name: 'Operations', route: { id: 'operations', path: '/analytics' } },
      { name: 'Simulation', route: { id: 'simulation', path: '/simulation?step=inspect' } },
      { name: 'Evidence', route: { id: 'evidence', path: '/evidence/overview' } },
      { name: 'Command Center', route: { id: 'dashboard', path: '/dashboard' } },
    ] satisfies Array<{ name: string; route: RouteCase }>;
    const results: Array<{ route: string; meaningfulMs: number }> = [];

    for (const journey of journeys) {
      const link = page.getByTestId('primary-navigation').getByRole('link', { name: journey.name }).first();
      await expect(link).toBeVisible();
      const startedAt = performance.now();
      await link.click();
      await expect(meaningfulMarker(page, journey.route.id), `${journey.name} meaningful content`).toBeVisible({
        timeout: BUDGETS.warmPrimaryNavigationMs,
      });
      const meaningfulMs = performance.now() - startedAt;
      expect(meaningfulMs, `${journey.name} click to meaningful content`).toBeLessThan(
        BUDGETS.warmPrimaryNavigationMs,
      );
      await expect(page.getByText('Loading workspace...', { exact: true })).toHaveCount(0);
      results.push({ route: journey.route.path, meaningfulMs });
    }

    await testInfo.attach('primary-navigation-performance.json', {
      body: Buffer.from(JSON.stringify({ budgetMs: BUDGETS.warmPrimaryNavigationMs, results }, null, 2)),
      contentType: 'application/json',
    });
  });
});

test.describe('bounded loading and recovery', () => {
  test('AI readiness exposes loading, failure and an operable recovery action', async ({ context, page }) => {
    await installAuthorizedSession(context);

    let releaseFailure: (() => void) | undefined;
    let releaseRecovery: (() => void) | undefined;
    let failFirstRequest = true;
    await context.route('**/functions/v1/ai-config', async (route: Route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'POST,OPTIONS',
            'access-control-allow-headers': 'authorization,apikey,content-type,x-client-info',
          },
          body: '',
        });
        return;
      }

      if (failFirstRequest) {
        await new Promise<void>((resolve) => { releaseFailure = resolve; });
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify({ message: 'Injected readiness outage' }),
        });
        return;
      }

      await new Promise<void>((resolve) => { releaseRecovery = resolve; });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({
          runtimeControl: 'server_owned',
          ready: true,
          managedAi: { available: true },
          groundingSearch: { available: false, reason: 'Not configured in this qualification fixture.' },
          profiles: [],
        }),
      });
    });

    await page.goto('/settings/ai', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('status')).toContainText('Loading AI runtime readiness');
    await expect.poll(() => Boolean(releaseFailure), { message: 'injected request reached the gate' }).toBe(true);
    releaseFailure?.();

    await expect(page.getByRole('alert')).toContainText(/Injected readiness outage|Edge Function/i);
    await expect(page.getByTestId('ai-settings-workspace')).toBeVisible();

    failFirstRequest = false;
    await page.getByRole('button', { name: 'Retry loading readiness' }).click();
    await expect(page.getByRole('status')).toContainText('Loading AI runtime readiness');
    await expect.poll(() => Boolean(releaseRecovery), { message: 'recovery request reached the gate' }).toBe(true);
    releaseRecovery?.();
    await expect(page.getByTestId('ai-settings-workspace')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByText('Configured—not verified')).toBeVisible();
  });
});
