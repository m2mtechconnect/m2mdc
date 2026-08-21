import type { BrowserContext } from '@playwright/test';
import { test, expect } from '../truth-in-ui/_setup/fixtures';
import { installSupabaseMock } from '../truth-in-ui/_setup/supabase-mock';

/**
 * Visual Regression Tests
 * Captures deterministic authenticated surfaces and compares against baselines.
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

async function primeAppTheme(context: BrowserContext, theme: 'light' | 'dark') {
  await context.addInitScript((value) => {
    try { window.localStorage.setItem('theme', value); }
    catch { /* storage disabled */ }
  }, theme);
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

test.beforeEach(async ({ context }) => {
  await installSupabaseMock(context);
});

test.describe('Visual Regression - Light Theme', () => {
  test.use({ colorScheme: 'light' });
  test.beforeEach(async ({ context }) => primeAppTheme(context, 'light'));

  test('Dashboard hero section', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByTestId('command-centre')).toBeVisible();
    await expect(page).toHaveScreenshot('dashboard-hero-light.png', {
      maxDiffPixels: 100,
    });
  });

  test('Builder Step 1', async ({ page, context }) => {
    await installBuilderVisualMock(context);
    await page.goto('/builder?new=true&step=1');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('builder-step1-light.png', {
      maxDiffPixels: 100,
    });
  });

  test('Builder Step 2 - Industry Marketplace', async ({ page, context }) => {
    await installBuilderVisualMock(context);
    await page.goto('/builder?new=true&step=2');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('builder-step2-light.png', {
      maxDiffPixels: 100,
    });
  });

  test('Builder Step 5 - Workflow Editor', async ({ page, context }) => {
    await installBuilderVisualMock(context);
    await page.goto('/builder?new=true&step=5');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('builder-step5-light.png', {
      maxDiffPixels: 150,
    });
  });

  test('Integrations Hub', async ({ page }) => {
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('integrations-light.png', {
      maxDiffPixels: 100,
    });
  });

  test('Analytics - ROI Tab', async ({ page }) => {
    await page.goto('/analytics?tab=roi');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for charts
    
    await expect(page).toHaveScreenshot('analytics-roi-light.png', {
      maxDiffPixels: 200, // Charts may have minor variations
    });
  });

  test('Operations Monitor', async ({ page }) => {
    await page.goto('/operations');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('operations-light.png', {
      maxDiffPixels: 100,
    });
  });

  test('Teams Page', async ({ page }) => {
    await page.goto('/teams');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('teams-light.png', {
      maxDiffPixels: 100,
    });
  });

  test('Compliance Page', async ({ page }) => {
    await page.goto('/compliance');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('compliance-light.png', {
      maxDiffPixels: 100,
    });
  });
});

test.describe('Visual Regression - Dark Theme', () => {
  test.use({ colorScheme: 'dark' });
  test.beforeEach(async ({ context }) => primeAppTheme(context, 'dark'));

  test('Dashboard hero section', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('dashboard-hero-dark.png', {
      maxDiffPixels: 100,
    });
  });

  test('Builder Step 1', async ({ page, context }) => {
    await installBuilderVisualMock(context);
    await page.goto('/builder?new=true&step=1');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('builder-step1-dark.png', {
      maxDiffPixels: 100,
    });
  });

  test('Builder Step 5 - Workflow Editor', async ({ page, context }) => {
    await installBuilderVisualMock(context);
    await page.goto('/builder?new=true&step=5');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('builder-step5-dark.png', {
      maxDiffPixels: 150,
    });
  });

  test('Integrations Hub', async ({ page }) => {
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('integrations-dark.png', {
      maxDiffPixels: 100,
    });
  });

  test('Analytics - ROI Tab', async ({ page }) => {
    await page.goto('/analytics?tab=roi');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('analytics-roi-dark.png', {
      maxDiffPixels: 200,
    });
  });
});

test.describe('Visual Regression - Mobile', () => {
  test.use({ 
    viewport: { width: 375, height: 667 },
    isMobile: true,
  });
  test.beforeEach(async ({ context }) => primeAppTheme(context, 'light'));

  test('Dashboard mobile', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      maxDiffPixels: 100,
      fullPage: true,
    });
  });

  test('Builder mobile', async ({ page, context }) => {
    await installBuilderVisualMock(context);
    await page.goto('/builder?new=true&step=1');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('builder-mobile.png', {
      maxDiffPixels: 100,
      fullPage: true,
    });
  });

  test('Analytics mobile', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('analytics-mobile.png', {
      maxDiffPixels: 150,
      fullPage: true,
    });
  });
});

test.describe('Visual Regression - Components', () => {
  test.beforeEach(async ({ context }) => primeAppTheme(context, 'light'));

  test('KPI Cards', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const kpiSection = page.locator('[data-testid="kpi-cards"]');
    if (await kpiSection.isVisible()) {
      await expect(kpiSection).toHaveScreenshot('kpi-cards.png', {
        maxDiffPixels: 50,
      });
    }
  });

  test('Search Bar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const searchBar = page.locator('[data-testid="search-bar"]');
    if (await searchBar.isVisible()) {
      await expect(searchBar).toHaveScreenshot('search-bar.png', {
        maxDiffPixels: 50,
      });
    }
  });

  test('Workflow Palette', async ({ page, context }) => {
    await installBuilderVisualMock(context);
    await page.goto('/builder?new=true&step=5');
    await page.waitForLoadState('networkidle');
    
    const palette = page.locator('[data-testid="workflow-palette"]');
    if (await palette.isVisible()) {
      await expect(palette).toHaveScreenshot('workflow-palette.png', {
        maxDiffPixels: 50,
      });
    }
  });
});
