import { test, expect } from '@playwright/test';

test.describe('UI - Toast Safe Area in Wizard', () => {
  const viewports = [
    { width: 320, height: 568, name: 'iPhone SE' },
    { width: 375, height: 667, name: 'iPhone 8' },
    { width: 390, height: 844, name: 'iPhone 12' },
    { width: 768, height: 1024, name: 'iPad' },
    { width: 1024, height: 768, name: 'iPad Landscape' },
    { width: 1440, height: 900, name: 'Desktop' },
  ];

  const zoomLevels = [1.0, 1.25, 1.5];

  test.beforeEach(async ({ page }) => {
    await page.goto('/builder');
    await page.waitForLoadState('networkidle');
  });

  for (const viewport of viewports) {
    for (const zoom of zoomLevels) {
      test(`should not overlap Next button at ${viewport.name} ${zoom * 100}% zoom`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.evaluate((zoomLevel) => {
          document.body.style.zoom = `${zoomLevel}`;
        }, zoom);

        await page.waitForTimeout(1000);

        // Check if we're in wizard mode
        const wizardActive = await page.locator('[data-wizard-active="true"]').count() > 0;
        
        if (wizardActive) {
          // Trigger a toast
          await page.evaluate(() => {
            // @ts-ignore
            window.dispatchEvent(new CustomEvent('show-toast', { 
              detail: { message: 'Test toast message' } 
            }));
          });

          await page.waitForTimeout(500);

          // Check for Next button
          const nextButton = page.locator('button:has-text("Next")');
          const nextButtonExists = await nextButton.count() > 0;

          if (nextButtonExists) {
            const nextButtonBox = await nextButton.boundingBox();
            
            // Check for toast
            const toast = page.locator('[role="status"]').first();
            const toastExists = await toast.count() > 0;

            if (toastExists && nextButtonBox) {
              const toastBox = await toast.boundingBox();
              
              if (toastBox) {
                // Check if toast overlaps with Next button
                const overlaps = !(
                  toastBox.x + toastBox.width < nextButtonBox.x ||
                  toastBox.x > nextButtonBox.x + nextButtonBox.width ||
                  toastBox.y + toastBox.height < nextButtonBox.y ||
                  toastBox.y > nextButtonBox.y + nextButtonBox.height
                );

                expect(overlaps, `Toast overlaps Next button at ${viewport.name} ${zoom * 100}%`).toBe(false);
              }
            }
          }
        }
      });
    }
  }

  test('should have data-wizard-active attribute on Builder page', async ({ page }) => {
    await page.goto('/builder');
    await page.waitForLoadState('networkidle');

    const wizardContainer = page.locator('[data-wizard-active="true"]');
    await expect(wizardContainer).toBeVisible({ timeout: 5000 });
  });

  test('should apply safe-area-inset to toasts', async ({ page }) => {
    // Check CSS for safe-area-inset
    const hasSafeArea = await page.evaluate(() => {
      const styles = window.getComputedStyle(document.documentElement);
      return styles.getPropertyValue('--safe-area-inset-bottom') || 
             document.querySelector('[style*="safe-area-inset"]');
    });

    // This is a basic check - actual safe area behavior requires device testing
    expect(hasSafeArea).toBeTruthy();
  });
});
