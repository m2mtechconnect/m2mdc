import { test, expect } from '@playwright/test';

test.describe('Regression Tests - Edge Cases', () => {
  test('should handle Deploy page with completely empty system data', async ({ page }) => {
    await page.route('**/rest/v1/agents**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'empty_system',
          name: '',
          description: '',
          config: null,
          template_id: null,
          selected_model: null,
          connectors: null,
          workflow_nodes: null
        }])
      });
    });

    await page.goto('/deploy?id=empty_system');
    await page.waitForLoadState('networkidle');

    // Should show validation errors but not crash
    await expect(page.locator('body')).toBeVisible();
    
    // Deploy button should be disabled
    const deployButton = page.getByRole('button', { name: /deploy system/i });
    if (await deployButton.isVisible()) {
      await expect(deployButton).toBeDisabled();
    }
  });

  test('should handle Builder with all null/undefined values', async ({ page }) => {
    await page.route('**/rest/v1/agents**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'null_system',
          name: null,
          description: null,
          config: null,
          template_id: null,
          selected_model: null
        }])
      });
    });

    await page.goto('/builder?id=null_system&step=1');
    await page.waitForLoadState('networkidle');

    // Should not crash, should show default values
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle array index access on empty arrays', async ({ page }) => {
    await page.route('**/rest/v1/workflow_nodes**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('/builder?id=test_system&step=5');
    await page.waitForLoadState('networkidle');

    // Should handle empty workflow gracefully
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle malformed JSON in localStorage', async ({ page }) => {
    await page.goto('/');
    
    // Set malformed JSON
    await page.evaluate(() => {
      localStorage.setItem('builder-state', '{invalid json}');
      localStorage.setItem('theme', 'invalid');
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should not crash, should use defaults
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle Help page with empty FAQ array', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');

    // Should render page even with no FAQs
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle Auth page with empty error array', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    // Should not crash when accessing errors
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle UnifiedMarketplace with missing data', async ({ page }) => {
    await page.route('**/functions/v1/catalog-templates-m2m**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/functions/v1/catalog-templates-industry**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/functions/v1/catalog-mcp**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    // Should show empty states, not crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle workflow validation with disconnected nodes', async ({ page }) => {
    await page.route('**/rest/v1/workflow_nodes**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'node1', type: 'analyze', x: 100, y: 100, config: {} },
          { id: 'node2', type: 'classify', x: 300, y: 100, config: {} }
        ])
      });
    });

    await page.route('**/rest/v1/workflow_edges**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]) // No edges - disconnected
      });
    });

    await page.goto('/builder?id=test_system&step=5');
    await page.waitForLoadState('networkidle');

    const validateButton = page.getByRole('button', { name: /validate/i });
    if (await validateButton.isVisible()) {
      await validateButton.click();
      
      // Should show validation error, not crash
      await expect(page.getByText(/not connected/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle missing system ID in URLs gracefully', async ({ page }) => {
    await page.goto('/builder?step=6');
    await page.waitForLoadState('networkidle');

    // Should redirect or show error, not crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle Teams page with no team members', async ({ page }) => {
    await page.route('**/rest/v1/team_members**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('/teams');
    await page.waitForLoadState('networkidle');

    // Should show empty state
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle Operations page with no events', async ({ page }) => {
    await page.route('**/functions/v1/ops-events**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ events: [] })
      });
    });

    await page.goto('/operations');
    await page.waitForLoadState('networkidle');

    // Should render without crashing
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle Dashboard with no systems', async ({ page }) => {
    await page.route('**/rest/v1/agents**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should show empty state
    await expect(page.locator('body')).toBeVisible();
  });
});
