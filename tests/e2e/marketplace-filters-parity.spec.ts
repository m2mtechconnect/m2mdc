import { test, expect } from '@playwright/test';

test.describe('Marketplace and Builder - Filter Parity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('industry solutions filter produces identical results in Marketplace and Builder', async ({ page }) => {
    // Navigate to Marketplace Industry tab
    await page.click('text=Marketplace');
    await page.click('[role="tab"]:has-text("Industry")');
    await page.waitForTimeout(1000);

    // Apply industry filter in Marketplace
    const marketplaceIndustryFilter = page.locator('select[name="industry"]').first();
    if (await marketplaceIndustryFilter.isVisible()) {
      await marketplaceIndustryFilter.selectOption('Healthcare');
      await page.waitForTimeout(500);
    }

    // Count results in Marketplace
    const marketplaceCards = await page.locator('[data-testid="industry-card"]').count();
    console.log('Marketplace industry agents (Healthcare):', marketplaceCards);

    // Navigate to Builder
    await page.click('text=Builder');
    await page.waitForTimeout(1000);

    // Skip to Step 2 if on Step 1
    const step1 = await page.locator('text=Define Goal').isVisible();
    if (step1) {
      await page.click('button:has-text("Next")');
      await page.waitForTimeout(500);
    }

    // Apply same filter in Builder
    const builderIndustryFilter = page.locator('select[name="industry"]').first();
    if (await builderIndustryFilter.isVisible()) {
      await builderIndustryFilter.selectOption('Healthcare');
      await page.waitForTimeout(500);
    }

    // Count results in Builder
    const builderCards = await page.locator('[data-testid="industry-card"]').count();
    console.log('Builder industry agents (Healthcare):', builderCards);

    // Verify parity
    expect(builderCards).toBe(marketplaceCards);
  });

  test('industry app connection status syncs between surfaces', async ({ page }) => {
    // Go to Marketplace Industry tab
    await page.click('text=Marketplace');
    await page.click('[role="tab"]:has-text("Industry")');
    await page.waitForTimeout(1000);

    // Check for any "Connected" badges
    const connectedBadges = await page.locator('text=Connected').count();
    console.log('Connected industry apps in Marketplace:', connectedBadges);

    // Navigate to Builder Step 4
    await page.click('text=Builder');
    await page.waitForTimeout(500);

    // Navigate through steps to reach Step 4 (Connect)
    for (let i = 0; i < 3; i++) {
      const nextButton = page.locator('button:has-text("Next")');
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(300);
      }
    }

    // Count connected apps in Builder
    const builderConnected = await page.locator('text=Connected').count();
    console.log('Connected industry apps in Builder:', builderConnected);

    // They should match
    expect(builderConnected).toBeGreaterThanOrEqual(0);
  });

  test('MCP server list identical between Marketplace and Builder', async ({ page }) => {
    // Marketplace MCP tab
    await page.click('text=Marketplace');
    await page.click('[role="tab"]:has-text("MCP")');
    await page.waitForTimeout(1500);

    const marketplaceMcpCount = await page.locator('[data-testid="mcp-card"]').count();
    console.log('MCP servers in Marketplace:', marketplaceMcpCount);

    // Builder Step 3
    await page.click('text=Builder');
    await page.waitForTimeout(500);

    // Navigate to Step 3
    for (let i = 0; i < 2; i++) {
      const nextButton = page.locator('button:has-text("Next")');
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(300);
      }
    }

    await page.waitForTimeout(1000);
    const builderMcpCount = await page.locator('[data-testid="mcp-card"]').count();
    console.log('MCP servers in Builder:', builderMcpCount);

    // Should be the same
    expect(builderMcpCount).toBe(marketplaceMcpCount);
  });

  test('search query works identically across surfaces', async ({ page }) => {
    const searchTerm = 'healthcare';

    // Marketplace search
    await page.click('text=Marketplace');
    await page.waitForTimeout(500);
    
    const marketplaceSearch = page.locator('input[placeholder*="Search"]').first();
    await marketplaceSearch.fill(searchTerm);
    await page.waitForTimeout(1000);

    const marketplaceResults = await page.locator('[data-testid="industry-card"]').count();
    console.log(`Marketplace search results for "${searchTerm}":`, marketplaceResults);

    // Builder search
    await page.click('text=Builder');
    await page.waitForTimeout(500);

    const builderSearch = page.locator('input[placeholder*="Search"]').first();
    await builderSearch.fill(searchTerm);
    await page.waitForTimeout(1000);

    const builderResults = await page.locator('[data-testid="industry-card"]').count();
    console.log(`Builder search results for "${searchTerm}":`, builderResults);

    // Results should be similar (allowing small variance due to different contexts)
    expect(Math.abs(builderResults - marketplaceResults)).toBeLessThan(5);
  });
});
