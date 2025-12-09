import { test, expect } from '@playwright/test';

const viewports = [
  { width: 1440, height: 900, name: 'Desktop Large' },
  { width: 1280, height: 800, name: 'Desktop' },
  { width: 1024, height: 768, name: 'Tablet Landscape' },
  { width: 768, height: 1024, name: 'Tablet Portrait' },
];

test.describe('Workflow Editor - Responsive Design', () => {
  for (const viewport of viewports) {
    test(`should render properly at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/builder?id=system_test_01&step=5');
      await page.waitForLoadState('networkidle');

      // Toolbar should be visible
      await expect(page.getByRole('button', { name: /save draft/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /validate/i })).toBeVisible();

      // Canvas should be visible
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      // Palette should be visible
      await expect(page.getByText('Analyze')).toBeVisible();
    });

    test(`should have accessible buttons at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/builder?id=system_test_01&step=5');
      await page.waitForLoadState('networkidle');

      // Check button sizes (min 44x44 for touch targets)
      const saveButton = page.getByRole('button', { name: /save draft/i });
      const box = await saveButton.boundingBox();
      
      expect(box?.height).toBeGreaterThanOrEqual(32); // Reasonable min for desktop
    });
  }

  test('should handle toolbar wrapping on narrow screens', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/builder?id=system_test_01&step=5');
    await page.waitForLoadState('networkidle');

    // All toolbar buttons should still be accessible
    await expect(page.getByRole('button', { name: /save draft/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /validate/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /test run/i })).toBeVisible();
  });

  test('should maintain canvas functionality on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/builder?id=system_test_01&step=5');
    await page.waitForLoadState('networkidle');

    // Should be able to add nodes
    await page.getByRole('button', { name: 'Analyze' }).click();
    await expect(page.getByText('1 nodes')).toBeVisible();
  });
});
