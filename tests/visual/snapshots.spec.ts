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
 * These tests capture the supported lifecycle workspaces on desktop and the
 * highest-value responsive surfaces on mobile. CI generates fresh Linux
 * Chromium screenshots for human review and fingerprint verification.
 */

const VISUAL_BUILDER_ID = '00000000-0000-4000-8000-000000000099';
const VISUAL_TWIN_ID = '00000000-0000-4000-8000-000000000199';
const MOBILE_WIDTH = 375;
const MOBILE_HEIGHT = 667;

const visualTwin = {
  id: VISUAL_TWIN_ID,
  location_id: null,
  name: 'Visual Regression Facility',
  city: 'Toronto',
  region_code: 'canada-central',
  tier: 'Tier III',
  capacity_kw: 4200,
  industry: 'data_centre',
  sovereignty_level: null,
  pue_target: null,
  renewable_target_pct: null,
  carbon_intensity: null,
  metadata: {
    created_from: 'visual-regression',
    evidence_state: 'operator_supplied_design_inputs',
    facility_inputs: {
      region_code: 'canada-central',
      tier: 'Tier III',
      capacity_kw: 4200,
    },
  },
  blueprint_id: null,
  created_by_user: '00000000-0000-4000-8000-000000000001',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const visualBuilder = {
  id: VISUAL_BUILDER_ID,
  name: 'Visual Regression Data Centre Twin',
  description: 'Deterministic visual-regression fixture',
  status: 'draft',
  config: {
    source: 'facility',
    goal: 'Optimize sovereign data-centre operations',
    industry: 'Data Centre',
    department: 'Operations',
    type: '3d_twin',
    template_id: 'visual-regression-template',
    twin_id: VISUAL_TWIN_ID,
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
    try {
      window.localStorage.setItem('theme', 'light');
      window.localStorage.setItem('m2m_tour_state_v1', JSON.stringify({
        studioIntro: { seen: true },
        overview: { seen: true },
        simulation: { seen: true },
        blueprint: { seen: true },
      }));
    } catch { /* storage disabled */ }
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

async function expectLifecycleNavigation(page: Page) {
  await expect(page.getByRole('button', { name: /^Design & Build$/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Operations$/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /^Simulation$/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /^Evidence$/i }).first()).toBeVisible();
}

async function installBuilderTenantMock(context: BrowserContext) {
  const organizationId = '00000000-0000-4000-8000-000000000010';
  const headers = {
    'access-control-allow-origin': '*',
    'access-control-expose-headers': 'content-range,content-profile',
    'content-type': 'application/json',
  };

  await context.route('**/rest/v1/org_memberships*', (route) =>
    route.fulfill({
      status: 200,
      headers,
      body: JSON.stringify([{
        org_id: organizationId,
        role: 'owner',
        status: 'active',
        is_default: true,
      }]),
    }),
  );
  await context.route('**/rest/v1/organizations*', (route) =>
    route.fulfill({
      status: 200,
      headers,
      body: JSON.stringify([{
        id: organizationId,
        name: 'AURA Qualification Organization',
        domain: 'aura.local',
      }]),
    }),
  );
  await context.route('**/rest/v1/rpc/active_org_id*', (route) =>
    route.fulfill({ status: 200, headers, body: JSON.stringify(organizationId) }),
  );
  await context.route('**/rest/v1/rpc/tenant_people_access_snapshot*', (route) =>
    route.fulfill({
      status: 200,
      headers,
      body: JSON.stringify({
        organization: { id: organizationId, name: 'AURA Qualification Organization' },
        members: [{
          userId: '00000000-0000-4000-8000-000000000001',
          name: 'AURA Qualification Owner',
          email: 'owner@aura.local',
          role: 'owner',
          status: 'active',
          joinedAt: '2026-01-01T00:00:00.000Z',
          avatarUrl: null,
          avatarBgColor: null,
          avatarInitials: 'AQ',
        }],
        invites: [],
      }),
    }),
  );
}

async function installBuilderVisualMock(context: BrowserContext) {
  // The shared Supabase mock intentionally returns an empty array for unknown
  // REST resources. Builder Phase 2 now requires a real facility identity, so
  // visual tests that exercise wizard steps must explicitly provide one
  // deterministic, non-placeholder facility. This is test-only fixture data.
  await context.route('**/rest/v1/data_centre_twins*', async (route) => {
    const method = route.request().method().toUpperCase();
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-expose-headers': 'content-range,content-profile',
      'content-type': 'application/json',
    };
    if (method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...headers,
          'access-control-allow-methods': 'GET,HEAD,OPTIONS',
          'access-control-allow-headers': 'authorization,apikey,content-type,accept,prefer,x-client-info',
        },
        body: '',
      });
      return;
    }
    if (method === 'HEAD') {
      await route.fulfill({ status: 200, headers, body: '' });
      return;
    }

    const accept = (route.request().headers()['accept'] ?? '').toLowerCase();
    const wantsSingle = accept.includes('pgrst.object');
    await route.fulfill({
      status: 200,
      headers: {
        ...headers,
        'content-type': wantsSingle ? 'application/vnd.pgrst.object+json' : 'application/json',
      },
      body: JSON.stringify(wantsSingle ? visualTwin : [visualTwin]),
    });
  });

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

function builderVisualUrl(step: number): string {
  return `/builder?new=true&step=${step}&twin=${VISUAL_TWIN_ID}&source=facility&type=3d_twin`;
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => {
    const innerWidth = window.innerWidth;
    const offenders = Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          testId: element.dataset.testid ?? null,
          className: typeof element.className === 'string' ? element.className.slice(0, 180) : '',
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          scrollWidth: element.scrollWidth,
        };
      })
      .filter((item) => item.right > innerWidth + 1 || item.left < -1 || item.scrollWidth > innerWidth + 1)
      .sort((a, b) => Math.max(b.right, b.scrollWidth) - Math.max(a.right, a.scrollWidth))
      .slice(0, 12);

    return {
      innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      offenders,
    };
  });
  expect(
    dimensions.documentScrollWidth,
    `document overflow: ${JSON.stringify(dimensions)}`,
  ).toBeLessThanOrEqual(dimensions.innerWidth);
  expect(
    dimensions.bodyScrollWidth,
    `body overflow: ${JSON.stringify(dimensions)}`,
  ).toBeLessThanOrEqual(dimensions.innerWidth);
}

async function expectPinnedMobileViewport(page: Page) {
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    outerWidth: window.outerWidth,
    devicePixelRatio: window.devicePixelRatio,
  }));
  expect(dimensions.innerWidth, `mobile visual viewport drifted: ${JSON.stringify(dimensions)}`).toBe(MOBILE_WIDTH);
  expect(dimensions.devicePixelRatio, `mobile visual device scale drifted: ${JSON.stringify(dimensions)}`).toBe(1);
}

test.use({ colorScheme: 'light' });

test.beforeEach(async ({ context, page }) => {
  await installSupabaseMock(context);
  // Visual acceptance represents an authenticated tenant owner, not a
  // platform-only administrator. Keep the tenant authority explicit so route
  // guards cannot silently turn workspace screenshots into dashboard redirects.
  await installBuilderTenantMock(context);
  await primeGlobalLightTheme(page);
});

test.describe('Visual Regression - Lifecycle Workspaces', () => {
  test('Dashboard command centre and lifecycle navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expect(page.getByTestId('command-centre')).toBeVisible();
    await expectLifecycleNavigation(page);
    await expect(page).toHaveScreenshot('dashboard-hero-light.png', { maxDiffPixels: 100 });
  });

  test('Builder first-run facility gate', async ({ page, context }) => {
    await installBuilderTenantMock(context);
    await page.goto('/builder');
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expect(page.getByRole('heading', { name: /create your first facility/i })).toBeVisible();
    await expect(page).toHaveScreenshot('builder-first-run-light.png', { maxDiffPixels: 100 });
  });

  test('Builder Step 1', async ({ page, context }) => {
    await installBuilderTenantMock(context);
    await installBuilderVisualMock(context);
    await page.goto(builderVisualUrl(1));
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expect(page.getByText('System Configuration', { exact: true }).first()).toBeVisible();
    await expect(page).toHaveScreenshot('builder-step1-light.png', { maxDiffPixels: 100 });
  });

  test('Builder Step 2', async ({ page, context }) => {
    await installBuilderTenantMock(context);
    await installBuilderVisualMock(context);
    await page.goto(builderVisualUrl(2));
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expect(page).toHaveScreenshot('builder-step2-light.png', { maxDiffPixels: 100 });
  });

  test('Builder Step 5', async ({ page, context }) => {
    await installBuilderTenantMock(context);
    await installBuilderVisualMock(context);
    await page.goto(builderVisualUrl(5));
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expect(page).toHaveScreenshot('builder-step5-light.png', { maxDiffPixels: 150 });
  });

  test('Connections', async ({ page }) => {
    await page.goto('/manage/integrations');
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expectLifecycleNavigation(page);
    await expect(page).toHaveScreenshot('integrations-light.png', { maxDiffPixels: 100 });
  });

  test('AI runtime', async ({ page }) => {
    await page.goto('/settings/ai');
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expectLifecycleNavigation(page);
    await expect(page).toHaveScreenshot('ai-runtime-light.png', { maxDiffPixels: 100, fullPage: true });
  });

  test('Operations and telemetry', async ({ page }) => {
    await page.goto('/analytics?tab=roi');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await expectGlobalLightTheme(page);
    await expectLifecycleNavigation(page);
    await expect(page).toHaveScreenshot('analytics-roi-light.png', { maxDiffPixels: 200 });
  });

  test('Simulation workspace', async ({ page }) => {
    await page.goto('/simulation');
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expectLifecycleNavigation(page);
    await expect(page.getByTestId('facility-model-canvas')).toBeVisible();
    await page.getByRole('button', { name: '2D' }).click();
    await expect(page.getByRole('button', { name: '2D' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveScreenshot('simulation-light.png', { maxDiffPixels: 200 });
  });

  test('Evidence workspace', async ({ page }) => {
    await page.goto('/evidence/overview');
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expectLifecycleNavigation(page);
    await expect(page).toHaveScreenshot('evidence-overview-light.png', { maxDiffPixels: 150 });
  });

  test('Deployment history', async ({ page }) => {
    await page.goto('/deployments');
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expectLifecycleNavigation(page);
    await expect(page).toHaveScreenshot('deployments-light.png', { maxDiffPixels: 100 });
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
  test.use({
    viewport: { width: MOBILE_WIDTH, height: MOBILE_HEIGHT },
    screen: { width: MOBILE_WIDTH, height: MOBILE_HEIGHT },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: true,
  });

  test('Dashboard mobile', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expectPinnedMobileViewport(page);
    await expectNoHorizontalOverflow(page);
    await expect(page).toHaveScreenshot('dashboard-mobile.png', { maxDiffPixels: 100, fullPage: true });
  });

  test('Builder mobile has no horizontal overflow', async ({ page, context }) => {
    await installBuilderTenantMock(context);
    await installBuilderVisualMock(context);
    await page.goto(builderVisualUrl(1));
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expectPinnedMobileViewport(page);
    await expectNoHorizontalOverflow(page);
    await expect(page).toHaveScreenshot('builder-mobile.png', { maxDiffPixels: 100, fullPage: true });
  });

  test('Operations and telemetry mobile', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expectPinnedMobileViewport(page);
    await expectNoHorizontalOverflow(page);
    await expect(page).toHaveScreenshot('analytics-mobile.png', { maxDiffPixels: 150, fullPage: true });
  });

  test('Simulation mobile', async ({ page }) => {
    await page.goto('/simulation');
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expectPinnedMobileViewport(page);
    await expectNoHorizontalOverflow(page);
    await expect(page).toHaveScreenshot('simulation-mobile.png', { maxDiffPixels: 200, fullPage: true });
  });

  test('Connections mobile', async ({ page }) => {
    await page.goto('/manage/integrations');
    await page.waitForLoadState('networkidle');
    await expectGlobalLightTheme(page);
    await expectPinnedMobileViewport(page);
    await expectNoHorizontalOverflow(page);
    await expect(page).toHaveScreenshot('connections-mobile.png', { maxDiffPixels: 150, fullPage: true });
  });
});