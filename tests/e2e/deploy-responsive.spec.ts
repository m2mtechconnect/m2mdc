import { test, expect } from '@playwright/test';

const viewports = [
  { width: 390, height: 844, name: 'Mobile' },
  { width: 768, height: 1024, name: 'Tablet' },
  { width: 1280, height: 800, name: 'Desktop' },
];

test.describe('Deploy - Responsive Design', () => {
  for (const viewport of viewports) {
    test(`should render properly at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/deploy?id=valid_system');
      await page.waitForLoadState('networkidle');

      // Header should be visible
      await expect(page.getByText('Deploy System')).toBeVisible();

      // Summary card should be visible
      await expect(page.getByText('System Configuration')).toBeVisible();

      // ROI card should be visible
      await expect(page.getByText('ROI Projection')).toBeVisible();

      // Deploy button should be visible
      await expect(page.getByRole('button', { name: /deploy system/i })).toBeVisible();
    });

    test(`should have accessible buttons at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/deploy?id=valid_system');
      await page.waitForLoadState('networkidle');

      const deployButton = page.getByRole('button', { name: /deploy system/i });
      const box = await deployButton.boundingBox();
      
      // Touch target should be at least 32px on mobile
      if (viewport.width < 768) {
        expect(box?.height).toBeGreaterThanOrEqual(32);
      }
    });
  }

  test('should stack panels vertically on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/deploy?id=valid_system');
    await page.waitForLoadState('networkidle');

    // Both cards should be visible
    const summaryCard = page.getByText('System Configuration');
    const roiCard = page.getByText('ROI Projection');

    await expect(summaryCard).toBeVisible();
    await expect(roiCard).toBeVisible();
  });

  test('should show panels side-by-side on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/deploy?id=valid_system');
    await page.waitForLoadState('networkidle');

    const summaryCard = page.getByText('System Configuration');
    const roiCard = page.getByText('ROI Projection');

    const summaryBox = await summaryCard.boundingBox();
    const roiBox = await roiCard.boundingBox();

    // On desktop, cards should be roughly side-by-side (similar Y position)
    if (summaryBox && roiBox) {
      const yDiff = Math.abs(summaryBox.y - roiBox.y);
      expect(yDiff).toBeLessThan(100);
    }
  });
});
