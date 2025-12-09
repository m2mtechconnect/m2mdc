import { test, expect } from '@playwright/test';

test.describe('CoPilot - UI Safe Area & Toast', () => {
  const viewports = [
    { width: 375, height: 667, name: 'iPhone 8' },
    { width: 390, height: 844, name: 'iPhone 12' },
    { width: 768, height: 1024, name: 'iPad' },
    { width: 1440, height: 900, name: 'Desktop' },
  ];

  for (const viewport of viewports) {
    test(`should display CoPilot drawer correctly on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Open Co-Pilot
      await page.click('button:has-text("Co-Pilot")');
      await page.waitForTimeout(500);

      // Check drawer is visible
      const drawer = page.locator('[class*="glass-panel"]');
      await expect(drawer).toBeVisible();

      // Check drawer doesn't overflow viewport
      const drawerBox = await drawer.boundingBox();
      if (drawerBox) {
        expect(drawerBox.x).toBeGreaterThanOrEqual(0);
        expect(drawerBox.y).toBeGreaterThanOrEqual(0);
        expect(drawerBox.x + drawerBox.width).toBeLessThanOrEqual(viewport.width + 10);
        expect(drawerBox.y + drawerBox.height).toBeLessThanOrEqual(viewport.height + 10);
      }
    });
  }

  test('should not overlap toast notifications with drawer buttons', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open Co-Pilot
    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(500);

    // Trigger a toast by switching agents (if available)
    const selector = page.locator('button[role="combobox"]');
    if (await selector.count() > 0) {
      await selector.click();
      await page.waitForTimeout(300);

      const agentItems = page.locator('[role="option"]');
      const count = await agentItems.count();

      if (count > 1) {
        await agentItems.nth(1).click();
        await page.waitForTimeout(300);

        // Check for toast
        const toast = page.locator('[role="status"]').first();
        if (await toast.count() > 0) {
          const toastBox = await toast.boundingBox();

          // Check send button
          const sendButton = page.locator('button:has-text("Send")');
          if (await sendButton.count() > 0) {
            const sendButtonBox = await sendButton.boundingBox();

            if (toastBox && sendButtonBox) {
              // Verify no overlap
              const overlaps = !(
                toastBox.x + toastBox.width < sendButtonBox.x ||
                toastBox.x > sendButtonBox.x + sendButtonBox.width ||
                toastBox.y + toastBox.height < sendButtonBox.y ||
                toastBox.y > sendButtonBox.y + sendButtonBox.height
              );

              expect(overlaps).toBe(false);
            }
          }
        }
      }
    }
  });

  test('should handle mobile keyboard without UI overlap', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(500);

    // Focus input
    const input = page.locator('input[placeholder*="Ask"]');
    await input.click();

    // Type something
    await input.fill('test query');

    // Verify input is still visible
    await expect(input).toBeVisible();

    // Verify send button is still visible
    const sendButton = page.locator('button:has-text("Send")');
    await expect(sendButton).toBeVisible();
  });

  test('should display agent selector on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(500);

    // Check if agent selector exists and is usable
    const selector = page.locator('button[role="combobox"]');
    if (await selector.count() > 0) {
      await expect(selector).toBeVisible();

      // Should be tappable on mobile
      await selector.click();
      await page.waitForTimeout(300);

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible();
    }
  });
});
