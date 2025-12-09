import { test, expect } from '@playwright/test';

test.describe('Workflow Editor - Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/builder?id=system_test_01&step=5');
    await page.waitForLoadState('networkidle');
  });

  test('should validate empty workflow successfully', async ({ page }) => {
    await page.getByRole('button', { name: /validate/i }).click();
    await expect(page.getByText(/validation passed/i)).toBeVisible();
  });

  test('should validate workflow with single node', async ({ page }) => {
    await page.getByRole('button', { name: 'Analyze' }).click();
    await page.getByRole('button', { name: /validate/i }).click();
    await expect(page.getByText(/validation passed/i)).toBeVisible();
  });

  test('should detect disconnected nodes error', async ({ page }) => {
    // Add multiple nodes without connecting them
    await page.getByRole('button', { name: 'Analyze' }).click();
    await page.getByRole('button', { name: 'Classify' }).click();
    
    // Validate
    await page.getByRole('button', { name: /validate/i }).click();
    
    // Should show error about disconnected nodes
    await expect(page.getByText(/nodes are not connected/i)).toBeVisible();
  });

  test('should detect missing configuration', async ({ page }) => {
    // Add Analyze node (which requires model config)
    await page.getByRole('button', { name: 'Analyze' }).click();
    
    // Save without configuring
    await page.getByRole('button', { name: /save draft/i }).click();
    
    // Validate should detect missing config
    await page.getByRole('button', { name: /validate/i }).click();
    await expect(page.getByText(/missing model configuration/i)).toBeVisible();
  });

  test('should show validation success for properly configured workflow', async ({ page }) => {
    await page.getByRole('button', { name: 'Analyze' }).click();
    await page.getByRole('button', { name: /validate/i }).click();
    await expect(page.getByText(/validation passed/i)).toBeVisible();
  });

  test('should have accessible validation button', async ({ page }) => {
    const validateButton = page.getByRole('button', { name: /validate/i });
    await expect(validateButton).toBeVisible();
    await expect(validateButton).toBeEnabled();
  });
});
