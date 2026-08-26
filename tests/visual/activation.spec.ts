import type { BrowserContext, Page, Route } from '@playwright/test';
import { test, expect } from '../truth-in-ui/_setup/fixtures';
import { installSupabaseMock } from '../truth-in-ui/_setup/supabase-mock';

const SYSTEM_ID = '00000000-0000-4000-8000-000000000299';
const WORKFLOW_ID = '00000000-0000-4000-8000-000000000399';
const MOBILE_WIDTH = 375;
const MOBILE_HEIGHT = 667;

async function primeLightTheme(page: Page) {
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
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    document.documentElement.style.colorScheme = 'light';
  });
}

function jsonHeaders(contentType = 'application/json') {
  return {
    'access-control-allow-origin': '*',
    'access-control-expose-headers': 'content-range,content-profile',
    'content-type': contentType,
  };
}

async function fulfillRest(route: Route, value: unknown) {
  const method = route.request().method().toUpperCase();
  if (method === 'OPTIONS') {
    await route.fulfill({
      status: 204,
      headers: {
        ...jsonHeaders(),
        'access-control-allow-methods': 'GET,HEAD,OPTIONS',
        'access-control-allow-headers': 'authorization,apikey,content-type,accept,prefer,x-client-info',
      },
      body: '',
    });
    return;
  }
  if (method === 'HEAD') {
    await route.fulfill({ status: 200, headers: jsonHeaders(), body: '' });
    return;
  }
  const accept = (route.request().headers()['accept'] ?? '').toLowerCase();
  const wantsSingle = accept.includes('pgrst.object');
  const body = wantsSingle ? value : Array.isArray(value) ? value : [value];
  await route.fulfill({
    status: 200,
    headers: jsonHeaders(wantsSingle ? 'application/vnd.pgrst.object+json' : 'application/json'),
    body: JSON.stringify(body),
  });
}

async function installActivationFixture(context: BrowserContext) {
  await context.route('**/rest/v1/agents*', async (route) => {
    await fulfillRest(route, {
      id: SYSTEM_ID,
      name: 'Visual Regression AURA System',
      status: 'draft',
      config: {
        selectedModel: 'google/gemini-2.5-flash',
        grounding: false,
      },
      connector_ids: [],
    });
  });

  await context.route('**/rest/v1/workflows*', async (route) => {
    await fulfillRest(route, { id: WORKFLOW_ID });
  });

  await context.route('**/rest/v1/intelligence_settings*', async (route) => {
    await fulfillRest(route, { mcp_servers: [] });
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  expect(dimensions.documentScrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.innerWidth);
  expect(dimensions.bodyScrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.innerWidth);
}

test.use({ colorScheme: 'light' });

test.beforeEach(async ({ context, page }) => {
  await installSupabaseMock(context);
  await installActivationFixture(context);
  await primeLightTheme(page);
});

test('AURA configuration activation makes the runtime boundary explicit', async ({ page }) => {
  await page.goto(`/deploy?id=${SYSTEM_ID}`);
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Activate in AURA', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/this action does not provision AWS, Azure, GCP, Kubernetes, GPU capacity, NVIDIA NIM, Omniverse/i)).toBeVisible();
  await expect(page.getByText('Runtime evidence', { exact: true })).toBeVisible();
  await expect(page.getByText('Not provided', { exact: true }).first()).toBeVisible();
  await expect(page).toHaveScreenshot('activation-light.png', { maxDiffPixels: 100, fullPage: true });
});

test.describe('AURA activation mobile', () => {
  test.use({
    viewport: { width: MOBILE_WIDTH, height: MOBILE_HEIGHT },
    screen: { width: MOBILE_WIDTH, height: MOBILE_HEIGHT },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: true,
  });

  test('activation boundary has no mobile overflow', async ({ page }) => {
    await page.goto(`/deploy?id=${SYSTEM_ID}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Activate in AURA', { exact: true }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expect(page).toHaveScreenshot('activation-mobile.png', { maxDiffPixels: 100, fullPage: true });
  });
});
