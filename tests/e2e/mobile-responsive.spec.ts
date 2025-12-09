import { test, expect, devices } from '@playwright/test';

test.describe('Mobile Responsive Design', () => {
  test.use({ ...devices['iPhone 12'] });

  test('should render dashboard on mobile', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Header should be visible and wrapped
    await expect(page.getByRole('banner')).toBeVisible();
    
    // Search bar should be usable
    const searchBar = page.getByPlaceholder(/search/i);
    await expect(searchBar).toBeVisible();
  });

  test('should navigate to builder on mobile', async ({ page }) => {
    await page.goto('/builder');
    await page.waitForLoadState('networkidle');

    // Builder UI should adapt to mobile
    await expect(page.getByText(/define.*goal|choose.*template/i)).toBeVisible();
    
    // Buttons should be touch-friendly
    const nextButton = page.getByRole('button', { name: /next/i });
    const box = await nextButton.boundingBox();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44); // iOS touch target minimum
    }
  });

  test('should display navigation menu on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Hamburger menu should be visible
    const menuButton = page.getByRole('button', { name: /menu/i });
    if (await menuButton.isVisible()) {
      await menuButton.click();
      
      // Navigation items should appear
      await expect(page.getByRole('link', { name: /dashboard|analytics|builder/i })).toBeVisible();
    }
  });

  test('should handle touch interactions in workflow editor', async ({ page }) => {
    await page.goto('/builder?step=5');
    await page.waitForLoadState('networkidle');

    // Node palette should be accessible
    const analyzeButton = page.getByRole('button', { name: /analyze/i }).first();
    if (await analyzeButton.isVisible()) {
      await analyzeButton.tap();
      await page.waitForTimeout(500);
      
      // Node should be added
      await expect(page.getByText(/node added|1 node/i)).toBeVisible();
    }
  });

  test('should display analytics charts on mobile', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Charts should be visible and responsive
    await expect(page.locator('canvas, svg[class*="recharts"]')).toBeVisible();
    
    // Tabs should be scrollable if needed
    await expect(page.getByRole('tab', { name: /roi/i })).toBeVisible();
  });

  test('should show mobile-optimized forms', async ({ page }) => {
    await page.goto('/teams');
    await page.waitForLoadState('networkidle');

    const inviteButton = page.getByRole('button', { name: /invite/i });
    if (await inviteButton.isVisible()) {
      await inviteButton.click();
      
      // Form inputs should be large enough for mobile
      const emailInput = page.getByPlaceholder(/email/i);
      const box = await emailInput.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  });
});
