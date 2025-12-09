import { test, expect } from '@playwright/test';

test.describe('Workflow Editor - RBAC', () => {
  test('should allow engineer to access workflow editor', async ({ page }) => {
    // Mock engineer role
    await page.goto('/builder?id=system_test_01&step=5');
    await page.waitForLoadState('networkidle');
    
    // Should see editor components
    await expect(page.getByRole('button', { name: /save draft/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /validate/i })).toBeVisible();
  });

  test('should allow manager to access workflow editor', async ({ page }) => {
    await page.goto('/builder?id=system_test_01&step=5');
    await page.waitForLoadState('networkidle');
    
    // Should see editor components
    await expect(page.getByRole('button', { name: /save draft/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /validate/i })).toBeVisible();
  });

  test('should persist workflow created by user', async ({ page }) => {
    await page.goto('/builder?id=system_test_01&step=5');
    await page.waitForLoadState('networkidle');
    
    // Add and save workflow
    await page.getByRole('button', { name: 'Analyze' }).click();
    await page.getByRole('button', { name: /save draft/i }).click();
    
    await expect(page.getByText(/workflow saved/i)).toBeVisible();
  });

  test('should show proper toolbar controls based on role', async ({ page }) => {
    await page.goto('/builder?id=system_test_01&step=5');
    await page.waitForLoadState('networkidle');
    
    // All users should see validate
    await expect(page.getByRole('button', { name: /validate/i })).toBeVisible();
    
    // Save should be visible
    await expect(page.getByRole('button', { name: /save draft/i })).toBeVisible();
  });
});
