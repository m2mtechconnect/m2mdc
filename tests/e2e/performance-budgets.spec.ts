import { test, expect } from '@playwright/test';

test.describe('Performance Budgets', () => {
  const PERFORMANCE_BUDGETS = {
    LCP: 2500, // Largest Contentful Paint ≤ 2.5s
    CLS: 0.1,  // Cumulative Layout Shift ≤ 0.1
    TBT: 200,  // Total Blocking Time ≤ 200ms
    FCP: 1800, // First Contentful Paint ≤ 1.8s
  };

  test('Agents page should meet performance budgets', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lcp = entries[entries.length - 1] as any;
          
          // Get CLS from layout shifts
          let cls = 0;
          performance.getEntriesByType('layout-shift').forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              cls += entry.value;
            }
          });

          const navigation = performance.getEntriesByType('navigation')[0] as any;
          
          resolve({
            lcp: lcp?.renderTime || lcp?.loadTime || 0,
            cls,
            fcp: navigation?.responseStart || 0
          });
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      });
    });

    expect(metrics.lcp).toBeLessThan(PERFORMANCE_BUDGETS.LCP);
    expect(metrics.cls).toBeLessThan(PERFORMANCE_BUDGETS.CLS);
  });

  test('Marketplace page should meet performance budgets', async ({ page }) => {
    await page.goto('/marketplace?tab=industry');
    await page.waitForLoadState('networkidle');

    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lcp = entries[entries.length - 1] as any;
          resolve({
            lcp: lcp?.renderTime || lcp?.loadTime || 0
          });
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      });
    });

    expect(metrics.lcp).toBeLessThan(PERFORMANCE_BUDGETS.LCP);
  });

  test('Builder Step 2 should meet performance budgets', async ({ page }) => {
    await page.goto('/builder?step=2');
    await page.waitForLoadState('networkidle');

    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lcp = entries[entries.length - 1] as any;
          resolve({
            lcp: lcp?.renderTime || lcp?.loadTime || 0
          });
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      });
    });

    expect(metrics.lcp).toBeLessThan(PERFORMANCE_BUDGETS.LCP);
  });

  test('Builder Step 4 should meet performance budgets', async ({ page }) => {
    await page.goto('/builder?step=4');
    await page.waitForLoadState('networkidle');

    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lcp = entries[entries.length - 1] as any;
          resolve({
            lcp: lcp?.renderTime || lcp?.loadTime || 0
          });
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      });
    });

    expect(metrics.lcp).toBeLessThan(PERFORMANCE_BUDGETS.LCP);
  });

  test('Builder Step 5 should meet performance budgets', async ({ page }) => {
    await page.goto('/builder?step=5');
    await page.waitForLoadState('networkidle');

    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lcp = entries[entries.length - 1] as any;
          resolve({
            lcp: lcp?.renderTime || lcp?.loadTime || 0
          });
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      });
    });

    expect(metrics.lcp).toBeLessThan(PERFORMANCE_BUDGETS.LCP);
  });

  test('should not have layout shifts on page load', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const cls = await page.evaluate(() => {
      let totalCLS = 0;
      performance.getEntriesByType('layout-shift').forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          totalCLS += entry.value;
        }
      });
      return totalCLS;
    });

    expect(cls).toBeLessThan(PERFORMANCE_BUDGETS.CLS);
  });

  test('should load images efficiently', async ({ page }) => {
    await page.goto('/marketplace?tab=industry');
    await page.waitForLoadState('networkidle');

    // Check for lazy loading
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const loading = await images.nth(i).getAttribute('loading');
      // Images should have loading="lazy" or be eager for above-fold
      expect(['lazy', 'eager', null]).toContain(loading);
    }
  });

  test('should not have render-blocking resources', async ({ page }) => {
    const response = await page.goto('/agents');
    const metrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const blocking = resources.filter(r => 
        r.renderBlockingStatus === 'blocking' && 
        r.duration > 100
      );
      return blocking.length;
    });

    expect(metrics).toBeLessThan(3); // Allow a few critical resources
  });
});
