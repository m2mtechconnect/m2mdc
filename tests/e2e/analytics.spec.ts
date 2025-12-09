import { test, expect } from '@playwright/test';

test.describe('Analytics - ROI, Compliance, Run Insights', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('should display analytics tabs', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /roi/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /compliance/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /run insights/i })).toBeVisible();
  });

  test('should switch date range and update charts', async ({ page }) => {
    // Open date range picker
    const dateButton = page.getByRole('button', { name: /last.*days/i });
    await dateButton.click();

    // Select 30 days
    await page.getByRole('option', { name: /30 days/i }).click();

    // Wait for charts to update
    await page.waitForTimeout(1000);
    
    // Verify charts are visible
    await expect(page.locator('canvas, svg[class*="recharts"]')).toBeVisible();
  });

  test('should export CSV', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /export/i }).click(),
    ]);

    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should display ROI chart with data', async ({ page }) => {
    await page.getByRole('tab', { name: /roi/i }).click();
    
    // Check for chart
    await expect(page.locator('[data-testid="roi-chart"]')).toBeVisible();
    
    // Check for metrics
    await expect(page.getByText(/savings|cost|growth/i)).toBeVisible();
  });

  test('should show compliance accuracy metrics', async ({ page }) => {
    await page.getByRole('tab', { name: /compliance/i }).click();
    
    await expect(page.getByText(/accuracy|citation|grounding/i)).toBeVisible();
  });

  test('should display run insights table', async ({ page }) => {
    await page.getByRole('tab', { name: /run insights/i }).click();
    
    // Check for table
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /system|status|duration/i })).toBeVisible();
  });

  test('should filter runs by system', async ({ page }) => {
    await page.getByRole('tab', { name: /run insights/i }).click();
    
    const systemFilter = page.getByRole('combobox', { name: /system/i });
    if (await systemFilter.isVisible()) {
      await systemFilter.click();
      const firstOption = page.getByRole('option').first();
      await firstOption.click();
      
      await page.waitForTimeout(500);
      // Table should update
      await expect(page.getByRole('table')).toBeVisible();
    }
  });

  test('should paginate run results', async ({ page }) => {
    await page.getByRole('tab', { name: /run insights/i }).click();
    
    const nextButton = page.getByRole('button', { name: /next/i });
    if (await nextButton.isVisible() && await nextButton.isEnabled()) {
      await nextButton.click();
      await page.waitForTimeout(500);
      // Should load next page
    }
  });
});
