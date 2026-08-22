import type { BrowserContext, Page } from '@playwright/test';
import { test, expect } from '../truth-in-ui/_setup/fixtures';
import { installSupabaseMock } from '../truth-in-ui/_setup/supabase-mock';

/**
 * Visual acceptance contract.
 *
 * AURA's global application shell is light-theme by product design. Dark
 * styling is scoped to NOC/data-centre modules through the separate
 * `.noc-theme` contract; it is not a global user-selectable application mode.
 *
 * These tests therefore capture supported global-light desktop/mobile
 * surfaces only. CI generates fresh Linux Chromium screenshots and verifies
 * them against the reviewed text fingerprint manifest.
 */

const VISUAL_BUILDER_ID = '00000000-0000-4000-8000-000000000099';
const visualBuilder = {
  id: VISUAL_BUILDER_ID,
  name: 'Visual Regression Data Centre Twin',
  description: 'Deterministic visual-regression fixture',
  status: 'draft',
  config: {
    goal: 'Optimize sovereign data-centre operations',
    industry: 'Data Centre',
    department: 'Operations',
    type: '3d_twin',
    template_id: 'visual-regression-template',
    workflow: {
      triggers: ['Telemetry threshold exceeded'],
      actions: ['Analyze thermal anomaly', 'Recommend cooling adjustment'],
      integrations: ['AURA telemetry'],
      hitl: ['Operator approval'],
    },
    model_config: {
      provider: 'google',
      model: 'google/gemini-2.5-flash',
      rag: {},
      policies: {},
      mcp_servers: [],
    },
    step_completed: 0,
  },
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

async function primeGlobalLightTheme(page: Page) {
  await page.addInitScript(() => {
    try { window.localStorage.setItem('theme', 'light'); }
    catch { /* storage disabled */ }
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
  });
}

async function expectGlobalLightTheme(page: Page) {
  await expect(page.locator('html')).toHaveClass(/(^|\s)light(\s|$)/);
  await expect(page.locator('html')).not.toHaveClass(/(^|\s)dark(\s|$)/);
}

async function installBuilderVisualMock(context: BrowserContext) {
  await context.route('**/functions/v1/builders-*', async (route) => {
    const method = route.request().method().toUpperCase();
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST,OPTIONS',
      'access-control-allow-headers': 'authorization,apikey,content-type,x-client-info',
      'content-type': 'application/json',
    };
    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers, body: '' });
      return;
    }

    const pathname = new URL(route.request().url()).pathname;
    const payload = pathname.endsWith('/builders-create')
      ? { data: { id: VISUAL_BUILDER_ID, builder: visualBuilder } }
      : { data: { builder: visualBuilder } };
    await route.fulfill({ status: 200, headers, body: JSON.stringify(payload) });
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  expect(dimensions.documentScrollWidth, `document overflow: ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(dimensions.innerWidth);
  expect(dimensions.bodyScrollWidth, `body overflow: ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(dimensions.innerWidth);
}

test.use({ colorScheme: 'light' });

test.beforeEach(async ({ context, page }) => {
  await installSupabaseMock(context);
  await primeGlobalLightTheme(page);
});

test.describe('Visual Regression - Supported Global Light Surfaces', () => {
  test('Dashboard command centre', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expect(page.getByTestId('command-centre')).toBeVisible();
    await expect(page).toHaveScreenshot('dashboard-hero-light.png', { maxDiffPixels: 100 });
  });

  test('Builder Step 1', async ({ page, context }) => {
    await installBuilderVisualMock(context);
    await page.goto('/builder?new=true&step=1');
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expect(page).toHaveScreenshot('builder-step1-light.png', { maxDiffPixels: 100 });
  });

  test('Builder Step 2', async ({ page, context }) => {
    await installBuilderVisualMock(context);
    await page.goto('/builder?new=true&step=2');
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expect(page).toHaveScreenshot('builder-step2-light.png', { maxDiffPixels: 100 });
  });

  test('Builder Step 5', async ({ page, context }) => {
    await installBuilderVisualMock(context);
    await page.goto('/builder?new=true&step=5');
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expect(page).toHaveScreenshot('builder-step5-light.png', { maxDiffPixels: 150 });
  });

  test('Connections', async ({ page }) => {
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expect(page).toHaveScreenshot('integrations-light.png', { maxDiffPixels: 100 });
  });

  test('Operations and telemetry', async ({ page }) => {
    await page.goto('/analytics?tab=roi');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await expectGlobalLightTheme(page);
    await expect(page).toHaveScreenshot('analytics-roi-light.png', { maxDiffPixels: 200 });
  });

  test('Teams', async ({ page }) => {
    await page.goto('/teams');
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expect(page).toHaveScreenshot('teams-light.png', { maxDiffPixels: 100 });
  });

  test('Compliance', async ({ page }) => {
    await page.goto('/compliance');
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expect(page).toHaveScreenshot('compliance-light.png', { maxDiffPixels: 100 });
  });
});

test.describe('Visual Regression - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 }, isMobile: true });

  test('Dashboard mobile', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expectNoHorizontalOverflow(page);
    await expect(page).toHaveScreenshot('dashboard-mobile.png', { maxDiffPixels: 100, fullPage: true });
  });

  test('Builder mobile has no horizontal overflow', async ({ page, context }) => {
    await installBuilderVisualMock(context);
    await page.goto('/builder?new=true&step=1');
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    // Capture before enforcing width so CI still uploads exact evidence when
    // this responsive invariant fails.
    await expect(page).toHaveScreenshot('builder-mobile.png', { maxDiffPixels: 100, fullPage: true });
    await expectNoHorizontalOverflow(page);
  });

  test('Operations and telemetry mobile', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expectNoHorizontalOverflow(page);
    await expect(page).toHaveScreenshot('analytics-mobile.png', { maxDiffPixels: 150, fullPage: true });
  });
});
