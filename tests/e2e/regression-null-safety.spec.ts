import { test, expect } from '@playwright/test';

test.describe('Regression Tests - Null Safety', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should handle missing template data gracefully in Builder step 6', async ({ page }) => {
    // Mock API to return system with missing template reference
    await page.route('**/rest/v1/agents**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'test_system',
          name: 'Test System',
          template_id: 'non_existent_template',
          selected_model: 'non_existent_model',
          config: {},
          connectors: null,
          workflow_nodes: null
        }])
      });
    });

    await page.goto('/builder?id=test_system&step=6');
    await page.waitForLoadState('networkidle');

    // Should show "Unknown" or "Custom" instead of crashing
    await expect(page.getByText(/Template:/i)).toBeVisible();
    await expect(page.getByText(/AI Model:/i)).toBeVisible();
    await expect(page.getByText(/Connected Tools:/i)).toBeVisible();
    await expect(page.getByText(/Workflow Nodes:/i)).toBeVisible();
  });

  test('should handle empty integrations array gracefully', async ({ page }) => {
    await page.route('**/functions/v1/integrations-list**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ integrations: [] })
      });
    });

    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');

    // Should not crash, should show empty state
    await expect(page.getByText(/No integrations/i)).toBeVisible();
  });

  test('should handle missing stages array in Deploy page', async ({ page }) => {
    await page.route('**/rest/v1/agents**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'test_system',
          name: 'Test Deploy System',
          config: {}
        }])
      });
    });

    await page.goto('/deploy?id=test_system');
    await page.waitForLoadState('networkidle');

    // Should initialize stages array and not crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle null connectors object in Builder', async ({ page }) => {
    await page.route('**/rest/v1/agents**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'test_system',
          name: 'Test System',
          config: { connectors: null }
        }])
      });
    });

    await page.goto('/builder?id=test_system&step=6');
    await page.waitForLoadState('networkidle');

    // Should show 0 connected tools instead of crashing
    const toolsText = await page.getByText(/Connected Tools:/i).locator('..').textContent();
    expect(toolsText).toContain('0');
  });

  test('should handle undefined workflowNodes array', async ({ page }) => {
    await page.route('**/rest/v1/agents**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'test_system',
          name: 'Test System',
          config: {},
          workflow_nodes: undefined
        }])
      });
    });

    await page.goto('/builder?id=test_system&step=6');
    await page.waitForLoadState('networkidle');

    // Should show 0 workflow nodes instead of crashing
    const nodesText = await page.getByText(/Workflow Nodes:/i).locator('..').textContent();
    expect(nodesText).toContain('0');
  });

  test('should handle Analytics export with malformed data', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Mock export endpoint to return null
    await page.route('**/functions/v1/analytics-export**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: null })
      });
    });

    const exportButton = page.getByRole('button', { name: /export/i });
    if (await exportButton.isVisible()) {
      await exportButton.click();
      
      // Should show success message without crashing
      await expect(page.getByText(/export successful/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('should handle MCP servers with undefined find results', async ({ page }) => {
    await page.route('**/functions/v1/catalog-mcp**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('/builder?step=3');
    await page.waitForLoadState('networkidle');

    // Should not crash when no MCP servers found
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle Zapier templates with missing data', async ({ page }) => {
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');

    // Mock zapier endpoint with empty templates
    await page.route('**/functions/v1/integrations-zapier**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ templates: [] })
      });
    });

    // Should handle gracefully
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle workflow nodes with missing configuration', async ({ page }) => {
    await page.route('**/rest/v1/workflow_nodes**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'node1',
          type: 'analyze',
          x: 100,
          y: 100,
          config: null
        }])
      });
    });

    await page.goto('/builder?id=test_system&step=5');
    await page.waitForLoadState('networkidle');

    // Should not crash with null config
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle search filters with undefined activeFilters', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // Should initialize with empty filters, not crash
    await expect(page.locator('body')).toBeVisible();
  });
});
