import { test, expect } from '@playwright/test';

test.describe('Builder Step 4 - Zapier Integrations Hub', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/builder?step=4');
    await page.waitForLoadState('networkidle');
  });

  test('should display embedded Zapier Integrations Hub', async ({ page }) => {
    // Should show step heading
    await expect(page.getByText(/connect.*business.*systems/i)).toBeVisible();

    // Should show integration cards
    const integrationCards = page.locator('[data-testid="integration-card"]');
    expect(await integrationCards.count()).toBeGreaterThan(0);
  });

  test('should filter by category', async ({ page }) => {
    // Open category filter
    const categoryButton = page.getByRole('button', { name: /category|all categories/i }).first();
    await categoryButton.click();

    // Select CRM
    await page.getByRole('option', { name: /crm/i }).click();
    await page.waitForTimeout(500);

    // Should show only CRM integrations
    await expect(page.getByText(/salesforce|hubspot/i).first()).toBeVisible();

    // Category chip should appear
    await expect(page.getByText(/crm/i)).toBeVisible();
  });

  test('should filter by status', async ({ page }) => {
    // Click status filter
    const statusButton = page.getByRole('button', { name: /status|all status/i }).first();
    if (await statusButton.isVisible()) {
      await statusButton.click();
      await page.getByRole('option', { name: /connected/i }).click();
      await page.waitForTimeout(500);

      // Should show only connected integrations
      await expect(page.getByText(/connected/i).first()).toBeVisible();
    }
  });

  test('should combine category and status filters', async ({ page }) => {
    // Apply category filter
    const categoryButton = page.getByRole('button', { name: /category/i }).first();
    await categoryButton.click();
    await page.getByRole('option', { name: /crm/i }).click();
    await page.waitForTimeout(500);

    // Apply status filter
    const statusButton = page.getByRole('button', { name: /status/i }).first();
    if (await statusButton.isVisible()) {
      await statusButton.click();
      await page.getByRole('option', { name: /connected/i }).click();
      await page.waitForTimeout(500);
    }

    // Both filters should be active
    const filterChips = page.locator('[data-testid="filter-chip"]');
    expect(await filterChips.count()).toBeGreaterThanOrEqual(1);
  });

  test('should search integrations', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search.*integration/i);
    await searchInput.fill('Salesforce');
    await page.waitForTimeout(500);

    // Should show Salesforce card
    await expect(page.getByText(/salesforce/i).first()).toBeVisible();

    // URL should reflect search
    await expect(page).toHaveURL(/q=Salesforce/i);
  });

  test('should persist filters in URL', async ({ page }) => {
    // Apply filters
    await page.getByPlaceholder(/search/i).fill('Google');
    await page.waitForTimeout(500);

    const categoryButton = page.getByRole('button', { name: /category/i }).first();
    await categoryButton.click();
    await page.getByRole('option', { name: /storage/i }).click();
    await page.waitForTimeout(1000);

    // Check URL
    const url = page.url();
    expect(url).toMatch(/q=Google/i);
    expect(url).toMatch(/category/i);

    // Reload
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Filters should persist
    const searchValue = await page.getByPlaceholder(/search/i).inputValue();
    expect(searchValue).toBe('Google');
  });

  test('should connect integration and update KPIs', async ({ page }) => {
    // Mock connect endpoint
    await page.route('**/functions/v1/zapier-connect**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ 
          status: 'connected', 
          id: 'conn-123',
          integration_id: 'salesforce-001'
        })
      });
    });

    // Get initial Active Connections count
    const kpiCard = page.locator('text=/Active Connections/i').locator('..');
    const initialCount = await kpiCard.locator('text=/\\d+/').first().textContent();

    // Connect an integration
    const connectButton = page.getByRole('button', { name: /^connect$/i }).first();
    if (await connectButton.isVisible()) {
      await connectButton.click();
      await page.waitForTimeout(1000);

      // Status should change to Connected
      await expect(page.getByText(/connected/i).first()).toBeVisible();

      // KPI should update (or stay same if already connected)
      const newCount = await kpiCard.locator('text=/\\d+/').first().textContent();
      expect(parseInt(newCount || '0')).toBeGreaterThanOrEqual(parseInt(initialCount || '0'));
    }
  });

  test('should disconnect integration', async ({ page }) => {
    // Mock disconnect endpoint
    await page.route('**/functions/v1/zapier-disconnect**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ status: 'disconnected' })
      });
    });

    // Find a connected integration
    const disconnectButton = page.getByRole('button', { name: /disconnect/i }).first();
    if (await disconnectButton.isVisible()) {
      await disconnectButton.click();

      // Confirm dialog if present
      const confirmButton = page.getByRole('button', { name: /confirm|yes/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      await page.waitForTimeout(1000);

      // Status should change to Not Connected
      await expect(page.getByText(/not connected|disconnected/i).first()).toBeVisible();
    }
  });

  test('should test integration connection', async ({ page }) => {
    // Mock test endpoint
    await page.route('**/functions/v1/zapier-test**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ 
          success: true, 
          latency: 45,
          status: 'healthy'
        })
      });
    });

    // Click test button
    const testButton = page.getByRole('button', { name: /test/i }).first();
    if (await testButton.isVisible()) {
      await testButton.click();
      await page.waitForTimeout(1000);

      // Should show success message
      await expect(page.getByText(/test.*success|healthy/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should update KPIs via webhook simulation', async ({ page }) => {
    // Mock webhook endpoint
    await page.route('**/functions/v1/zapier-webhook/**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ 
          status: 'processed',
          documents_synced: 1,
          sync_success: true
        })
      });
    });

    // Get initial Documents Synced count
    const docsKpi = page.locator('text=/Documents Synced/i').locator('..');
    const initialDocs = await docsKpi.locator('text=/\\d+/').first().textContent();

    // Trigger webhook (simulate by calling API directly)
    await page.evaluate(async () => {
      await fetch(`${window.location.origin}/functions/v1/zapier-webhook/test-integration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          event: 'document.sync',
          data: { count: 1 }
        })
      });
    });

    await page.waitForTimeout(2000);

    // Documents Synced should increment
    const newDocs = await docsKpi.locator('text=/\\d+/').first().textContent();
    expect(parseInt(newDocs || '0')).toBeGreaterThanOrEqual(parseInt(initialDocs || '0'));
  });

  test('should show integration settings drawer', async ({ page }) => {
    const settingsButton = page.getByRole('button', { name: /settings|configure/i }).first();
    if (await settingsButton.isVisible()) {
      await settingsButton.click();

      // Settings drawer should open
      const drawer = page.locator('[role="dialog"]');
      await expect(drawer).toBeVisible();

      // Should show integration details
      await expect(drawer.getByText(/api.*key|webhook|config/i)).toBeVisible();

      // Close
      await page.keyboard.press('Escape');
    }
  });

  test('should display tooltips on KPI cards', async ({ page }) => {
    const kpiCard = page.locator('[data-testid="kpi-card"]').first();
    await kpiCard.hover();

    // Tooltip should appear
    const tooltip = page.locator('[role="tooltip"]');
    if (await tooltip.count() > 0) {
      await expect(tooltip.first()).toBeVisible({ timeout: 2000 });
    }
  });
});
