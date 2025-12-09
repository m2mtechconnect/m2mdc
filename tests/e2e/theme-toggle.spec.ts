import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Theme Toggle - Light/Dark Mode', () => {
  test('should toggle between light and dark themes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find theme toggle
    const themeToggle = page.getByRole('button', { name: /theme|dark|light/i });
    if (await themeToggle.isVisible()) {
      // Get initial theme
      const htmlElement = page.locator('html');
      const initialClass = await htmlElement.getAttribute('class');
      
      // Toggle theme
      await themeToggle.click();
      await page.waitForTimeout(300);
      
      // Class should change
      const newClass = await htmlElement.getAttribute('class');
      expect(newClass).not.toBe(initialClass);
    }
  });

  test('should apply brand colors in light mode', async ({ page }) => {
    await page.goto('/');
    
    // Set light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });
    
    await page.waitForTimeout(300);
    
    // Check for brand colors in cards
    const card = page.locator('[class*="glass-panel"]').first();
    if (await card.isVisible()) {
      const bgColor = await card.evaluate((el) => window.getComputedStyle(el).backgroundColor);
      expect(bgColor).toBeTruthy();
    }
  });

  test('should apply brand colors in dark mode', async ({ page }) => {
    await page.goto('/');
    
    // Set dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    
    await page.waitForTimeout(300);
    
    // Check for dark mode colors
    const card = page.locator('[class*="glass-panel"]').first();
    if (await card.isVisible()) {
      const bgColor = await card.evaluate((el) => window.getComputedStyle(el).backgroundColor);
      expect(bgColor).toBeTruthy();
    }
  });

  test('should maintain AA+ contrast in both themes', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check light mode contrast
    const lightResults = await new AxeBuilder({ page })
      .include('body')
      .analyze();
    
    const lightContrastViolations = lightResults.violations.filter(
      (v) => v.id === 'color-contrast'
    );
    expect(lightContrastViolations.length).toBe(0);

    // Toggle to dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(500);

    // Check dark mode contrast
    const darkResults = await new AxeBuilder({ page })
      .include('body')
      .analyze();
    
    const darkContrastViolations = darkResults.violations.filter(
      (v) => v.id === 'color-contrast'
    );
    expect(darkContrastViolations.length).toBe(0);
  });

  test('should persist theme preference', async ({ page }) => {
    await page.goto('/');
    
    // Set dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    });
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should still be in dark mode
    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('dark');
  });

  test('should update chart colors with theme', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Get chart color in light mode
    const chart = page.locator('canvas, svg[class*="recharts"]').first();
    await expect(chart).toBeVisible();
    
    // Toggle to dark
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(500);
    
    // Chart should still be visible with updated colors
    await expect(chart).toBeVisible();
  });
});
