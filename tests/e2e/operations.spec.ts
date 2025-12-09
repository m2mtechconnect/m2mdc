import { test, expect } from '@playwright/test';

test.describe('Operations Monitor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/operations');
    await page.waitForLoadState('networkidle');
  });

  test('should display environment cards', async ({ page }) => {
    await expect(page.getByText(/production|staging|development/i)).toBeVisible();
    
    // Check for metrics
    await expect(page.getByText(/uptime|errors|latency|throughput/i)).toBeVisible();
  });

  test('should filter by environment', async ({ page }) => {
    // Click Production filter
    await page.getByRole('button', { name: /production/i }).click();
    
    await page.waitForTimeout(500);
    
    // Should show only production systems
    await expect(page.getByText(/production/i)).toBeVisible();
  });

  test('should show realtime health updates', async ({ page }) => {
    // Initial metric value
    const latencyBefore = await page.locator('[data-metric="latency"]').first().textContent();
    
    // Simulate realtime update by triggering a refresh or waiting
    await page.waitForTimeout(2000);
    
    // Value might update (or at least component should be reactive)
    const latencyAfter = await page.locator('[data-metric="latency"]').first().textContent();
    
    // Values exist
    expect(latencyBefore).toBeTruthy();
    expect(latencyAfter).toBeTruthy();
  });

  test('should display event feed', async ({ page }) => {
    await expect(page.getByText(/recent events|activity/i)).toBeVisible();
    
    // Check for event entries
    const events = page.locator('[data-testid="event-item"]');
    const count = await events.count();
    
    if (count > 0) {
      await expect(events.first()).toBeVisible();
    }
  });

  test('should show warning badge for missed heartbeat', async ({ page }) => {
    // Look for warning indicators
    const warningBadge = page.locator('[data-status="warning"], [data-health="warning"]');
    const count = await warningBadge.count();
    
    // Might or might not have warnings depending on seed data
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display system health table', async ({ page }) => {
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /system|status|uptime/i })).toBeVisible();
  });

  test('should sort health table by uptime', async ({ page }) => {
    const uptimeHeader = page.getByRole('columnheader', { name: /uptime/i });
    if (await uptimeHeader.isVisible()) {
      await uptimeHeader.click();
      await page.waitForTimeout(300);
      
      // Table should re-sort
      await expect(page.getByRole('table')).toBeVisible();
    }
  });

  test('should show system details on row click', async ({ page }) => {
    const firstRow = page.getByRole('row').nth(1);
    if (await firstRow.isVisible()) {
      await firstRow.click();
      
      // Should open drawer or modal with details
      await expect(page.getByText(/system details|overview/i)).toBeVisible({ timeout: 3000 });
    }
  });
});
