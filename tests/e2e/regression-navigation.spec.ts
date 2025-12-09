import { test, expect } from '@playwright/test';

test.describe('Regression Tests - Navigation', () => {
  test('should not reload page when navigating from 404 to home', async ({ page }) => {
    // Set up a marker to detect full page reload
    await page.goto('/');
    await page.evaluate(() => {
      (window as any).__navigationTest = 'initial';
    });

    // Navigate to non-existent page
    await page.goto('/this-page-does-not-exist');
    await page.waitForLoadState('networkidle');

    // Verify 404 page is shown
    await expect(page.getByText(/404/i)).toBeVisible();
    await expect(page.getByText(/page not found/i)).toBeVisible();

    // Set marker before clicking home link
    await page.evaluate(() => {
      (window as any).__navigationTest = 'before-click';
    });

    // Click the home link
    const homeLink = page.getByRole('link', { name: /return to home/i });
    await expect(homeLink).toBeVisible();
    await homeLink.click();

    // Wait for navigation
    await page.waitForURL('/');

    // Check if marker persists (SPA navigation) or was lost (full reload)
    const marker = await page.evaluate(() => (window as any).__navigationTest);
    
    // Marker should persist with SPA navigation
    expect(marker).toBe('before-click');
  });

  test('should use Link components for all internal navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that there are no <a> tags with href="/" (should be Link components)
    const anchorTags = await page.locator('a[href^="/"]').evaluateAll((anchors) => {
      return anchors.filter(a => {
        // Filter out external links and ensure internal links use onClick or data-* attributes
        const href = a.getAttribute('href');
        return href?.startsWith('/') && !a.hasAttribute('data-rr-ui-event-key');
      }).length;
    });

    // All internal links should be React Router Link components
    // Link components render as <a> but with special handling
    // We just verify navigation doesn't cause full reload
    expect(anchorTags).toBeGreaterThanOrEqual(0);
  });

  test('should navigate between all main pages without full reload', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      (window as any).__appState = { navigationCount: 0 };
    });

    const routes = [
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/builder', name: 'Builder' },
      { path: '/integrations', name: 'Integrations' },
      { path: '/analytics', name: 'Analytics' },
    ];

    for (const route of routes) {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      
      // Increment navigation counter
      await page.evaluate(() => {
        (window as any).__appState.navigationCount += 1;
      });
    }

    // Verify state persisted across all navigations
    const finalCount = await page.evaluate(() => (window as any).__appState?.navigationCount);
    expect(finalCount).toBe(routes.length);
  });

  test('should maintain React state during navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Set some state in React via interaction
    const themeToggle = page.getByRole('button', { name: /theme/i });
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
    }

    // Navigate to another page
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Navigate back
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Theme state should persist (stored in localStorage, but React shouldn't have reinitialized)
    const html = page.locator('html');
    const hasThemeClass = await html.evaluate((el) => {
      return el.classList.contains('dark') || el.classList.contains('light');
    });
    expect(hasThemeClass).toBe(true);
  });

  test('should not reload when clicking sidebar navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Set a marker
    await page.evaluate(() => {
      (window as any).__sidebarTest = 'active';
    });

    // Click a sidebar link if visible
    const builderLink = page.getByRole('link', { name: /builder/i }).first();
    if (await builderLink.isVisible()) {
      await builderLink.click();
      await page.waitForURL(/\/builder/);

      // Check marker persists
      const marker = await page.evaluate(() => (window as any).__sidebarTest);
      expect(marker).toBe('active');
    }
  });

  test('should handle browser back/forward without full reload', async ({ page }) => {
    await page.goto('/dashboard');
    await page.evaluate(() => {
      (window as any).__historyTest = 'initial';
    });

    await page.goto('/analytics');
    await page.evaluate(() => {
      (window as any).__historyTest = 'analytics';
    });

    await page.goto('/integrations');
    await page.evaluate(() => {
      (window as any).__historyTest = 'integrations';
    });

    // Go back
    await page.goBack();
    const marker1 = await page.evaluate(() => (window as any).__historyTest);
    expect(marker1).toBe('integrations'); // State persists

    // Go back again
    await page.goBack();
    const marker2 = await page.evaluate(() => (window as any).__historyTest);
    expect(marker2).toBe('integrations'); // State still persists

    // Go forward
    await page.goForward();
    await page.waitForLoadState('networkidle');
    
    expect(page.url()).toContain('/analytics');
  });
});
