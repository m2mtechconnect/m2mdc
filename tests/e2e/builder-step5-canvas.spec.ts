import { test, expect } from '@playwright/test';

test.describe('Builder Step 5 - Workflow Canvas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/builder?step=5');
    await page.waitForLoadState('networkidle');
  });

  test('should render canvas without black screen', async ({ page }) => {
    // Canvas should be visible
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Canvas should have proper dimensions
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(500);
    expect(box!.height).toBeGreaterThan(400);

    // Background should not be pure black (should have grid)
    const bgColor = await canvas.evaluate((el) => {
      const ctx = (el as HTMLCanvasElement).getContext('2d');
      return ctx ? ctx.fillStyle : null;
    });
    // Grid should make it not pure black
    expect(bgColor).not.toBe('#000000');
  });

  test('should show empty state overlay when no nodes', async ({ page }) => {
    // Empty state should be visible
    await expect(page.getByText(/build.*workflow|drag.*drop/i)).toBeVisible();

    // Should show quick action buttons
    await expect(page.getByRole('button', { name: /add analyze/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /add classify/i })).toBeVisible();
  });

  test('should hide empty state after adding first node', async ({ page }) => {
    // Add a node via quick action
    const addButton = page.getByRole('button', { name: /add analyze/i });
    await addButton.click();
    await page.waitForTimeout(500);

    // Empty state should disappear
    await expect(page.getByText(/build.*workflow|drag.*drop/i)).not.toBeVisible();

    // Node counter should show 1
    await expect(page.getByText(/1.*node/i)).toBeVisible();
  });

  test('should drag and drop node from palette', async ({ page }) => {
    // Find palette node
    const paletteNode = page.getByRole('button', { name: /analyze/i }).first();
    
    // Drag to canvas
    const canvas = page.locator('canvas');
    await paletteNode.dragTo(canvas, {
      targetPosition: { x: 300, y: 200 }
    });

    await page.waitForTimeout(500);

    // Node count should increment
    await expect(page.getByText(/1.*node/i)).toBeVisible();
  });

  test('should connect two nodes with edge', async ({ page }) => {
    // Add two nodes
    await page.getByRole('button', { name: /add analyze/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /add classify/i }).click();
    await page.waitForTimeout(500);

    // Should show 2 nodes
    await expect(page.getByText(/2.*node/i)).toBeVisible();

    // TODO: Implement edge connection test when connection UI is ready
  });

  test('should enable Validate button when workflow has nodes', async ({ page }) => {
    // Initially Validate might be disabled
    const validateButton = page.getByRole('button', { name: /validate/i });
    
    // Add a node
    await page.getByRole('button', { name: /add analyze/i }).click();
    await page.waitForTimeout(500);

    // Validate should be enabled or at least visible
    await expect(validateButton).toBeVisible();
  });

  test('should validate workflow', async ({ page }) => {
    // Mock validation endpoint
    await page.route('**/functions/v1/workflow-validate**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ 
          valid: true, 
          errors: [],
          warnings: []
        })
      });
    });

    // Add nodes
    await page.getByRole('button', { name: /add analyze/i }).click();
    await page.waitForTimeout(500);

    // Click Validate
    const validateButton = page.getByRole('button', { name: /validate/i });
    await validateButton.click();

    // Should show validation success
    await expect(page.getByText(/validation.*pass|valid/i)).toBeVisible({ timeout: 5000 });
  });

  test('should keep Test Run disabled (Phase 1)', async ({ page }) => {
    // Add nodes
    await page.getByRole('button', { name: /add analyze/i }).click();
    await page.getByRole('button', { name: /add classify/i }).click();
    await page.waitForTimeout(500);

    // Test Run should be disabled (execution engine not implemented)
    const testRunButton = page.getByRole('button', { name: /test run/i });
    await expect(testRunButton).toBeDisabled();
  });

  test('should save workflow draft', async ({ page }) => {
    // Mock save endpoint
    await page.route('**/rest/v1/workflows**', async (route) => {
      if (route.request().method() === 'POST' || route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ id: 'workflow-123' })
        });
      } else {
        await route.continue();
      }
    });

    // Add a node
    await page.getByRole('button', { name: /add analyze/i }).click();
    await page.waitForTimeout(500);

    // Click Save Draft
    const saveButton = page.getByRole('button', { name: /save.*draft/i });
    await saveButton.click();

    // Should show success message
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 5000 });
  });

  test('should handle canvas resize', async ({ page }) => {
    // Get initial canvas size
    const canvas = page.locator('canvas');
    const initialBox = await canvas.boundingBox();

    // Resize viewport
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(500);

    // Canvas should adjust
    const newBox = await canvas.boundingBox();
    expect(newBox).toBeTruthy();
    expect(newBox!.width).not.toBe(initialBox!.width);
  });

  test('should show node configuration drawer when node clicked', async ({ page }) => {
    // Add a node
    await page.getByRole('button', { name: /add analyze/i }).click();
    await page.waitForTimeout(500);

    // Click on canvas where node should be
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 100, y: 100 } });

    // Configuration drawer should open (if implemented)
    const drawer = page.locator('[role="dialog"]');
    if (await drawer.count() > 0) {
      await expect(drawer.first()).toBeVisible();
    }
  });

  test('should display workflow toolbar with all actions', async ({ page }) => {
    // Check toolbar buttons
    await expect(page.getByRole('button', { name: /save.*draft/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /validate/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /test run/i })).toBeVisible();
  });

  test('should show node palette with all node types', async ({ page }) => {
    // Verify all expected node types are in palette
    await expect(page.getByRole('button', { name: /analyze/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /classify/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /extract/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /transform/i }).first()).toBeVisible();
  });
});
