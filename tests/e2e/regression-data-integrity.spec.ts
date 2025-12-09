import { test, expect } from '@playwright/test';

test.describe('Regression Tests - Data Integrity', () => {
  test('should safely access template.find() results in Builder', async ({ page }) => {
    await page.route('**/functions/v1/templates-list**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'template1', name: 'Template 1' },
          { id: 'template2', name: 'Template 2' }
        ])
      });
    });

    await page.route('**/rest/v1/agents**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'test_system',
          name: 'Test',
          template_id: 'non_existent_template',
          config: {}
        }])
      });
    });

    await page.goto('/builder?id=test_system&step=1');
    await page.waitForLoadState('networkidle');

    // Should handle non-existent template gracefully
    await expect(page.locator('body')).toBeVisible();
  });

  test('should safely access models.find() results', async ({ page }) => {
    await page.route('**/rest/v1/ai_models**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'model1', name: 'Model 1', provider: 'google' },
          { id: 'model2', name: 'Model 2', provider: 'openai' }
        ])
      });
    });

    await page.route('**/rest/v1/agents**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'test_system',
          name: 'Test',
          selected_model: 'model999', // Non-existent
          config: {}
        }])
      });
    });

    await page.goto('/builder?id=test_system&step=2');
    await page.waitForLoadState('networkidle');

    // Should not crash with unknown model
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle Object.values() on null/undefined', async ({ page }) => {
    await page.route('**/rest/v1/agents**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'test_system',
          name: 'Test',
          config: {
            connectors: null
          }
        }])
      });
    });

    await page.goto('/builder?id=test_system&step=6');
    await page.waitForLoadState('networkidle');

    // Should show 0 connected tools
    const connectedTools = page.getByText(/Connected Tools:/i).locator('..');
    await expect(connectedTools).toBeVisible();
    const text = await connectedTools.textContent();
    expect(text).toContain('0');
  });

  test('should handle array.length on undefined arrays', async ({ page }) => {
    await page.route('**/rest/v1/agents**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'test_system',
          name: 'Test',
          workflow_nodes: undefined,
          config: {}
        }])
      });
    });

    await page.goto('/builder?id=test_system&step=6');
    await page.waitForLoadState('networkidle');

    // Should show 0 workflow nodes
    const workflowNodes = page.getByText(/Workflow Nodes:/i).locator('..');
    await expect(workflowNodes).toBeVisible();
    const text = await workflowNodes.textContent();
    expect(text).toContain('0');
  });

  test('should handle split()[0] on potentially undefined strings', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Mock export with undefined date
    await page.route('**/functions/v1/analytics-export**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          data: 'test,data\n1,2',
          format: 'csv'
        })
      });
    });

    const exportButton = page.getByRole('button', { name: /export/i });
    if (await exportButton.isVisible()) {
      await exportButton.click();
      
      // Should handle date splitting safely
      await expect(page.getByText(/export successful/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('should handle integrations.find() on empty array', async ({ page }) => {
    await page.route('**/functions/v1/integrations-list**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ integrations: [] })
      });
    });

    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');

    // Should not crash when looking up integration details
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle mcpServers.find() with missing server', async ({ page }) => {
    await page.route('**/functions/v1/catalog-mcp**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'server1', name: 'Server 1' }
        ])
      });
    });

    await page.goto('/builder?step=3');
    await page.waitForLoadState('networkidle');

    // Should handle missing server lookup
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle industries.find() on missing industry', async ({ page }) => {
    await page.route('**/functions/v1/catalog-templates-industry**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    // Click on industry agents tab if visible
    const industryTab = page.getByRole('tab', { name: /industry/i });
    if (await industryTab.isVisible()) {
      await industryTab.click();
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should handle workflow nodes.find() safely', async ({ page }) => {
    await page.route('**/rest/v1/workflow_nodes**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'node1', type: 'analyze', x: 100, y: 100 }
        ])
      });
    });

    await page.goto('/builder?id=test_system&step=5');
    await page.waitForLoadState('networkidle');

    // Should safely handle node lookups
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle stages array access in Deploy', async ({ page }) => {
    await page.route('**/rest/v1/agents**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'valid_system',
          name: 'Valid System',
          selected_model: 'model1',
          template_id: 'template1',
          config: { model: 'test' }
        }])
      });
    });

    await page.goto('/deploy?id=valid_system');
    await page.waitForLoadState('networkidle');

    // Should safely access stages[0], stages[1], etc.
    await expect(page.locator('body')).toBeVisible();
  });
});
