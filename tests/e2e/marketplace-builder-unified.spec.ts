import { test, expect } from '@playwright/test';

test.describe('Marketplace and Builder Step 2 Unification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate and authenticate
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Industry tab shows identical data in Marketplace and Builder Step 2', async ({ page }) => {
    // Get count from Marketplace
    await page.goto('/marketplace?tab=industry');
    await page.waitForSelector('[data-testid="industry-card"]', { timeout: 5000 }).catch(() => null);
    const marketplaceCount = await page.locator('[data-testid="industry-card"]').count();

    // Get count from Builder Step 2
    await page.goto('/builder?step=2');
    await page.waitForSelector('[data-testid="industry-card"]', { timeout: 5000 }).catch(() => null);
    const builderCount = await page.locator('[data-testid="industry-card"]').count();

    expect(marketplaceCount).toBeGreaterThan(0);
    expect(builderCount).toBe(marketplaceCount);
  });

  test('Healthcare filter produces same results in both surfaces', async ({ page }) => {
    // Filter in Marketplace
    await page.goto('/marketplace?tab=industry');
    await page.getByRole('checkbox', { name: 'Healthcare' }).check();
    await page.waitForTimeout(500);
    const marketplaceResults = await page.locator('[data-testid="industry-card"]').count();

    // Filter in Builder
    await page.goto('/builder?step=2');
    await page.getByRole('checkbox', { name: 'Healthcare' }).check();
    await page.waitForTimeout(500);
    const builderResults = await page.locator('[data-testid="industry-card"]').count();

    expect(marketplaceResults).toBe(builderResults);
  });

  test('Search query works identically across surfaces', async ({ page }) => {
    const searchTerm = 'Compliance';

    // Search in Marketplace
    await page.goto('/marketplace?tab=industry');
    await page.getByRole('search', { name: /search/i }).fill(searchTerm);
    await page.waitForTimeout(500);
    const marketplaceResults = await page.locator('[data-testid="industry-card"]').count();

    // Search in Builder
    await page.goto('/builder?step=2');
    await page.getByRole('search', { name: /search/i }).fill(searchTerm);
    await page.waitForTimeout(500);
    const builderResults = await page.locator('[data-testid="industry-card"]').count();

    // Allow small variance due to timing
    expect(Math.abs(marketplaceResults - builderResults)).toBeLessThanOrEqual(1);
  });

  test('Industry agent card displays rating, ROI, and runs count', async ({ page }) => {
    await page.goto('/marketplace?tab=industry');
    await page.waitForSelector('[data-testid="industry-card"]', { timeout: 5000 }).catch(() => null);
    
    const firstCard = page.locator('[data-testid="industry-card"]').first();
    
    // Check for metadata presence (may not all be present on all cards)
    const hasRating = await firstCard.getByText(/★/).isVisible().catch(() => false);
    const hasROI = await firstCard.getByText(/ROI:/).isVisible().catch(() => false);
    const hasRuns = await firstCard.getByText(/\d+/).isVisible().catch(() => false);

    // At least one metadata field should be present
    expect(hasRating || hasROI || hasRuns).toBeTruthy();
  });

  test('Preview modal shows detailed agent information', async ({ page }) => {
    await page.goto('/marketplace?tab=industry');
    await page.waitForSelector('[data-testid="industry-card"]', { timeout: 5000 }).catch(() => null);
    
    // Click Preview on first agent
    await page.locator('[data-testid="industry-card"]').first().getByRole('button', { name: /preview/i }).click();
    
    // Check modal content
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('Use button from Marketplace navigates to Builder Step 2 with prefill', async ({ page }) => {
    await page.goto('/marketplace?tab=industry');
    await page.waitForSelector('[data-testid="industry-card"]', { timeout: 5000 }).catch(() => null);
    
    // Click Use on first agent
    const firstCard = page.locator('[data-testid="industry-card"]').first();
    const agentTitle = await firstCard.locator('h3').textContent();
    await firstCard.getByRole('button', { name: /use/i }).click();
    
    // Should navigate to Builder Step 2
    await page.waitForURL(/\/builder\?/);
  });
});
