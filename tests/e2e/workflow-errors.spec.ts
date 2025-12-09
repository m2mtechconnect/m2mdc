import { test, expect } from '@playwright/test';

test.describe('Workflow Editor - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/builder?id=system_test_01&step=5');
    await page.waitForLoadState('networkidle');
  });

  test('should show error if save fails', async ({ page }) => {
    // Mock network failure
    await page.route('**/rest/v1/workflows**', (route) => {
      route.abort('failed');
    });

    await page.getByRole('button', { name: 'Analyze' }).click();
    await page.getByRole('button', { name: /save draft/i }).click();
    
    // Should show error toast
    await expect(page.getByText(/save failed/i)).toBeVisible();
  });

  test('should show error if load fails', async ({ page }) => {
    // Mock network failure for loading
    await page.route('**/rest/v1/workflow_nodes**', (route) => {
      route.abort('failed');
    });

    await page.reload();
    
    // Should show error toast
    await expect(page.getByText(/failed to load workflow/i)).toBeVisible();
  });

  test('should show validation errors clearly', async ({ page }) => {
    // Add disconnected nodes
    await page.getByRole('button', { name: 'Analyze' }).click();
    await page.getByRole('button', { name: 'Classify' }).click();
    
    await page.getByRole('button', { name: /validate/i }).click();
    
    // Error should be visible and descriptive
    await expect(page.getByText(/nodes are not connected/i)).toBeVisible();
  });

  test('should show error for missing system ID', async ({ page }) => {
    // Navigate without system ID
    await page.goto('/builder?step=5');
    
    // Should show cannot save error
    await page.getByRole('button', { name: 'Analyze' }).click();
    await page.getByRole('button', { name: /save draft/i }).click();
    
    await expect(page.getByText(/no workflow or system id/i)).toBeVisible();
  });

  test('should handle authentication errors gracefully', async ({ page }) => {
    // Mock 401 response
    await page.route('**/rest/v1/workflows**', (route) => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      });
    });

    await page.getByRole('button', { name: 'Analyze' }).click();
    await page.getByRole('button', { name: /save draft/i }).click();
    
    // Should show auth error
    await expect(page.getByText(/save failed/i)).toBeVisible();
  });
});
