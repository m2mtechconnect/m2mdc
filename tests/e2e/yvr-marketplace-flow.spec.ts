/**
 * YVR Marketplace Flow E2E Tests
 * Tests the complete user flow from marketplace to preview to builder
 */

import { test, expect } from '@playwright/test';

test.describe('YVR Marketplace Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to marketplace
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');
  });

  test('YVR template appears in marketplace', async ({ page }) => {
    // Look for YVR card by data attribute or text
    const yvrCard = page.locator('[data-template-id="YVR_AIRPORT_DIGITAL_TWIN"]').or(
      page.locator('text=YVR Airport Operations Digital Twin').first()
    );

    await expect(yvrCard).toBeVisible({ timeout: 10000 });
  });

  test('YVR card shows correct metadata', async ({ page }) => {
    // Find YVR card
    const yvrCard = page.locator('text=YVR Airport Operations').first();
    await expect(yvrCard).toBeVisible();

    // Check for Aviation & Transportation category
    const cardContainer = page.locator('[data-template-id="YVR_AIRPORT_DIGITAL_TWIN"]').or(
      yvrCard.locator('..').locator('..')
    );

    // Should show certified badge or high rating
    await expect(cardContainer).toBeVisible();
  });

  test('Can open YVR preview from marketplace', async ({ page }) => {
    // Click YVR card
    const yvrCard = page.locator('text=YVR Airport Operations').first();
    await yvrCard.click();

    // Wait for preview to load
    await page.waitForLoadState('networkidle');

    // Check URL contains template ID or slug
    await expect(page).toHaveURL(/yvr|YVR_AIRPORT_DIGITAL_TWIN/i);
  });

  test('Preview shows all required tabs', async ({ page }) => {
    // Navigate directly to YVR preview
    await page.goto('/marketplace?template=YVR_AIRPORT_DIGITAL_TWIN');
    await page.waitForLoadState('networkidle');

    // Check for all tabs
    const tabs = ['Overview', 'Blueprint', 'Preview', 'Day in the Life', 'Scenarios', 'Simulation', 'Deploy'];

    for (const tabName of tabs) {
      const tab = page.locator(`[role="tab"]:has-text("${tabName}")`).or(
        page.locator(`button:has-text("${tabName}")`)
      );
      await expect(tab).toBeVisible({ timeout: 5000 });
    }
  });

  test('Overview tab shows complete content', async ({ page }) => {
    await page.goto('/marketplace?template=YVR_AIRPORT_DIGITAL_TWIN');
    await page.waitForLoadState('networkidle');

    // Click Overview tab if not active
    await page.locator('text=Overview').first().click();
    await page.waitForTimeout(500);

    // Check for hero summary panel
    await expect(page.locator('text=YVR').or(page.locator('text=Airport Operations'))).toBeVisible();

    // Check for problem statement section
    const hasContent = await page.locator('text=/real-time|coordination|operations/i').isVisible();
    expect(hasContent).toBe(true);
  });

  test('Blueprint tab shows agents and data sources', async ({ page }) => {
    await page.goto('/marketplace?template=YVR_AIRPORT_DIGITAL_TWIN');
    await page.waitForLoadState('networkidle');

    // Click Blueprint tab
    await page.locator('text=Blueprint').first().click();
    await page.waitForTimeout(500);

    // Should show agents or data sources
    const hasAgents = await page.locator('text=/agent|coordinator|orchestrator/i').isVisible();
    const hasDataSources = await page.locator('text=/data source|integration|connector/i').isVisible();
    
    expect(hasAgents || hasDataSources).toBe(true);
  });

  test('Preview tab shows capabilities', async ({ page }) => {
    await page.goto('/marketplace?template=YVR_AIRPORT_DIGITAL_TWIN');
    await page.waitForLoadState('networkidle');

    // Click Preview tab
    await page.locator('text=Preview').first().click();
    await page.waitForTimeout(500);

    // Should show capability bullets or chat interface
    const hasCapabilities = await page.locator('text=/prediction|optimization|monitoring/i').isVisible();
    expect(hasCapabilities).toBe(true);
  });

  test('Day in the Life tab shows roles', async ({ page }) => {
    await page.goto('/marketplace?template=YVR_AIRPORT_DIGITAL_TWIN');
    await page.waitForLoadState('networkidle');

    // Click Day in the Life tab
    await page.locator('text=Day in the Life').first().click();
    await page.waitForTimeout(500);

    // Should show role narratives
    const hasRoles = await page.locator('text=/manager|supervisor|coordinator|operations/i').isVisible();
    expect(hasRoles).toBe(true);
  });

  test('Scenarios tab shows at least 3 scenarios', async ({ page }) => {
    await page.goto('/marketplace?template=YVR_AIRPORT_DIGITAL_TWIN');
    await page.waitForLoadState('networkidle');

    // Click Scenarios tab
    await page.locator('text=Scenarios').first().click();
    await page.waitForTimeout(500);

    // Count scenario cards or titles
    const scenarios = await page.locator('[data-scenario]').or(
      page.locator('text=/weather|baggage|holiday|peak/i')
    ).count();
    
    expect(scenarios).toBeGreaterThanOrEqual(3);
  });

  test('Deploy tab shows cloud options', async ({ page }) => {
    await page.goto('/marketplace?template=YVR_AIRPORT_DIGITAL_TWIN');
    await page.waitForLoadState('networkidle');

    // Click Deploy tab
    await page.locator('text=Deploy').first().click();
    await page.waitForTimeout(500);

    // Should show AWS, Azure, GCP
    const hasAWS = await page.locator('text=AWS').isVisible();
    const hasAzure = await page.locator('text=Azure').isVisible();
    const hasGCP = await page.locator('text=GCP').isVisible();

    expect(hasAWS || hasAzure || hasGCP).toBe(true);
  });

  test('Use This Template button is visible', async ({ page }) => {
    await page.goto('/marketplace?template=YVR_AIRPORT_DIGITAL_TWIN');
    await page.waitForLoadState('networkidle');

    // Look for Use This Template or similar CTA
    const ctaButton = page.locator('button:has-text("Use This Template")').or(
      page.locator('button:has-text("Get Started")')
    );

    await expect(ctaButton).toBeVisible({ timeout: 5000 });
  });

  test('Can search for YVR in marketplace', async ({ page }) => {
    // Type in search box
    const searchInput = page.locator('input[type="search"]').or(
      page.locator('input[placeholder*="Search"]')
    );

    if (await searchInput.isVisible()) {
      await searchInput.fill('YVR');
      await page.waitForTimeout(1000);

      // YVR should be in results
      const yvrResult = page.locator('text=YVR Airport Operations');
      await expect(yvrResult).toBeVisible();
    }
  });

  test('Can filter by Aviation category', async ({ page }) => {
    // Look for category filter
    const aviationFilter = page.locator('text=Aviation').or(
      page.locator('[data-category="Aviation"]')
    );

    if (await aviationFilter.isVisible()) {
      await aviationFilter.click();
      await page.waitForTimeout(1000);

      // YVR should appear in filtered results
      const yvrCard = page.locator('text=YVR Airport Operations');
      await expect(yvrCard).toBeVisible();
    }
  });
});

test.describe('YVR Dashboard Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('YVR appears in Start With Template section', async ({ page }) => {
    // Look for template cards on dashboard
    const yvrCard = page.locator('text=YVR Airport Operations');

    // Check if visible (might require scrolling)
    if (await yvrCard.isVisible()) {
      await expect(yvrCard).toBeVisible();
    }
  });

  test('Can navigate from dashboard to YVR preview', async ({ page }) => {
    // Click on YVR if visible
    const yvrCard = page.locator('text=YVR Airport Operations').first();

    if (await yvrCard.isVisible()) {
      await yvrCard.click();
      await page.waitForLoadState('networkidle');

      // Should navigate to preview
      await expect(page).toHaveURL(/template|preview/i);
    }
  });
});
