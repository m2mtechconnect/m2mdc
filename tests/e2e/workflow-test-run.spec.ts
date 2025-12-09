import { test, expect } from '@playwright/test';

test.describe('Workflow Editor - Test Run', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/builder?id=system_test_01&step=5');
    await page.waitForLoadState('networkidle');
  });

  test('should have test run button disabled initially', async ({ page }) => {
    const testRunButton = page.getByRole('button', { name: /test run/i });
    await expect(testRunButton).toBeVisible();
    await expect(testRunButton).toBeDisabled();
  });

  test('should keep test run disabled after adding nodes (Phase 1)', async ({ page }) => {
    // Add some nodes
    await page.getByRole('button', { name: 'Analyze' }).click();
    await page.getByRole('button', { name: 'Classify' }).click();
    
    // Test Run should still be disabled (execution engine not yet implemented)
    const testRunButton = page.getByRole('button', { name: /test run/i });
    await expect(testRunButton).toBeDisabled();
  });

  test('should show proper button styling for disabled state', async ({ page }) => {
    const testRunButton = page.getByRole('button', { name: /test run/i });
    
    // Check that button has proper disabled styling
    const opacity = await testRunButton.evaluate((el) => {
      return window.getComputedStyle(el).opacity;
    });
    
    expect(parseFloat(opacity)).toBeLessThan(1);
  });

  test('should have Play icon in test run button', async ({ page }) => {
    const testRunButton = page.getByRole('button', { name: /test run/i });
    
    // Check for SVG icon (Lucide Play icon)
    const hasSvg = await testRunButton.locator('svg').count();
    expect(hasSvg).toBeGreaterThan(0);
  });
});
