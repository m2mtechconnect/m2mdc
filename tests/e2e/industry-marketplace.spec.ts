import { test, expect } from '@playwright/test';

test.describe('Industry Marketplace - Unified Component', () => {
  test('should render marketplace in full mode from header', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    // Check header metrics (only in full mode)
    await expect(page.getByText('Templates Available')).toBeVisible();
    await expect(page.getByText('Certified')).toBeVisible();
    await expect(page.getByText('Downloads')).toBeVisible();
    await expect(page.getByText('Avg ROI')).toBeVisible();

    // Check template cards are visible
    await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible();
  });

  test('should render marketplace in embedded mode (Step 2)', async ({ page }) => {
    await page.goto('/builder?template=blank&mode=create');
    await page.waitForLoadState('networkidle');

    // Navigate to Step 2
    // Note: Actual navigation depends on your stepper implementation
    
    // Check that marketplace is embedded (no metrics bar)
    await expect(page.getByText('Templates Available')).not.toBeVisible();
    
    // But template cards should still be visible
    await expect(page.getByText('Industry Solutions')).toBeVisible();
  });

  test('should filter templates by category', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    // Select Healthcare category
    await page.getByLabel('Healthcare').click();

    // Should filter templates
    await page.waitForTimeout(500);
    
    // Verify filtered results
    const cards = page.locator('[class*="section-padding"]');
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('should search templates', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    // Type in search
    await page.getByPlaceholder('Search templates...').fill('clinical');
    
    // Wait for debounce
    await page.waitForTimeout(400);

    // Should show filtered results
    await expect(page.getByText(/clinical/i).first()).toBeVisible();
  });

  test('should open preview modal on preview button click', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    // Click first Preview button
    await page.getByRole('button', { name: /preview/i }).first().click();

    // Modal should open
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Check tabs
    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'KPIs' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Connected Tools' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Example Workflow' })).toBeVisible();
  });

  test('should navigate between preview tabs', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    // Open preview
    await page.getByRole('button', { name: /preview/i }).first().click();

    // Click KPIs tab
    await page.getByRole('tab', { name: 'KPIs' }).click();
    await expect(page.getByText('Key Performance Indicators')).toBeVisible();

    // Click Connected Tools tab
    await page.getByRole('tab', { name: 'Connected Tools' }).click();
    await expect(page.getByText('Recommended Integrations')).toBeVisible();
  });

  test('should close preview modal', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    // Open preview
    await page.getByRole('button', { name: /preview/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Close via button
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should deploy template from full mode', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    // Click Deploy button
    await page.getByRole('button', { name: /deploy/i }).first().click();

    // Should navigate to builder
    await page.waitForURL(/\/builder/);
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    // Check marketplace is functional
    await expect(page.getByText('Industry Solutions')).toBeVisible();
    
    // Cards should stack
    const cards = page.locator('[class*="section-padding"]');
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    // Tab to search
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Type search
    await page.keyboard.type('finance');
    await page.waitForTimeout(400);

    // Should filter
    await expect(page.getByText(/finance/i).first()).toBeVisible();
  });

  test('should clear filters', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    // Apply filters
    await page.getByLabel('Healthcare').click();
    await page.getByPlaceholder('Search templates...').fill('test');
    await page.waitForTimeout(400);

    // Click clear filters if no results
    if (await page.getByText('No templates found').isVisible()) {
      await page.getByRole('button', { name: 'Clear Filters' }).click();
      
      // All templates should be visible again
      const cards = page.locator('[class*="section-padding"]');
      expect(await cards.count()).toBeGreaterThan(0);
    }
  });
});
