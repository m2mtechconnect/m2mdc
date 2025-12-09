import { test, expect } from '@playwright/test';

test.describe('Workflow Editor - Render', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Builder Step 5 with test system
    await page.goto('/builder?id=system_test_01&step=5');
    await page.waitForLoadState('networkidle');
  });

  test('should render toolbar with all action buttons', async ({ page }) => {
    // Check toolbar buttons
    await expect(page.getByRole('button', { name: /save draft/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /validate/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /test run/i })).toBeVisible();
    
    // Node counter should start at 0
    await expect(page.getByText('0 nodes')).toBeVisible();
  });

  test('should render canvas with grid', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    
    // Check canvas dimensions
    const box = await canvas.boundingBox();
    expect(box?.width).toBeGreaterThan(1000);
    expect(box?.height).toBeGreaterThan(600);
  });

  test('should render node palette with all node types', async ({ page }) => {
    await expect(page.getByText('Analyze')).toBeVisible();
    await expect(page.getByText('Classify')).toBeVisible();
    await expect(page.getByText('Notify Teams')).toBeVisible();
    await expect(page.getByText('Create Jira Ticket')).toBeVisible();
    await expect(page.getByText('Write Salesforce')).toBeVisible();
    await expect(page.getByText('Generate Report')).toBeVisible();
  });

  test('should support keyboard focus on canvas', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    await canvas.click();
    
    // Check canvas has focus
    const focused = await page.evaluate(() => {
      const activeElement = document.activeElement;
      return activeElement?.tagName === 'CANVAS';
    });
    expect(focused).toBeTruthy();
  });

  test('should show unsaved changes badge when dirty', async ({ page }) => {
    // Add a node to trigger dirty state
    await page.getByRole('button', { name: 'Analyze' }).click();
    
    // Wait for unsaved changes badge
    await expect(page.getByText('Unsaved changes')).toBeVisible();
  });

  test('should have proper ARIA labels for accessibility', async ({ page }) => {
    await expect(page.getByRole('button', { name: /save draft/i })).toHaveAttribute('aria-label');
    await expect(page.getByRole('button', { name: /validate/i })).toHaveAttribute('aria-label');
  });
});
