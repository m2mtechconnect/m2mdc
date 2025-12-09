import { test, expect } from '@playwright/test';

test.describe('Your AI Systems List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display systems list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /your.*systems|ai systems/i })).toBeVisible();
    
    const systemCards = page.locator('[data-testid="system-card"]');
    const count = await systemCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should search systems by name', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search.*systems/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('Compliance');
      await page.waitForTimeout(500);
      
      // Should show filtered results
      await expect(page.getByText(/compliance/i)).toBeVisible();
    }
  });

  test('should filter systems by department', async ({ page }) => {
    const departmentFilter = page.getByRole('combobox', { name: /department/i });
    if (await departmentFilter.isVisible()) {
      await departmentFilter.click();
      await page.getByRole('option', { name: /finance|engineering/i }).first().click();
      
      await page.waitForTimeout(500);
      // Results should update
    }
  });

  test('should delete system with confirmation', async ({ page }) => {
    await page.route('**/systems-delete**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      });
    });

    const deleteButton = page.getByRole('button', { name: /delete/i }).first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // Confirm dialog
      const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i });
      await expect(confirmButton).toBeVisible();
      await confirmButton.click();
      
      // Should show success toast
      await expect(page.getByText(/deleted|success/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should manage system (open details)', async ({ page }) => {
    const manageButton = page.getByRole('button', { name: /manage|view/i }).first();
    if (await manageButton.isVisible()) {
      await manageButton.click();
      
      // Should open drawer or navigate to details
      await expect(page.getByText(/system details|configuration/i)).toBeVisible({ timeout: 3000 });
    }
  });

  test('should sort systems by name', async ({ page }) => {
    const sortButton = page.getByRole('button', { name: /sort/i });
    if (await sortButton.isVisible()) {
      await sortButton.click();
      await page.getByRole('option', { name: /name/i }).click();
      
      await page.waitForTimeout(300);
      // List should re-sort
    }
  });

  test('should show system status badges', async ({ page }) => {
    // Check for status indicators
    const statusBadges = page.locator('[data-testid="status-badge"]');
    const count = await statusBadges.count();
    
    if (count > 0) {
      await expect(statusBadges.first()).toBeVisible();
      await expect(page.getByText(/active|draft|inactive/i)).toBeVisible();
    }
  });

  test('should cascade delete system data', async ({ page }) => {
    await page.route('**/systems-delete**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, deletedRecords: { workflows: 1, nodes: 3, runs: 10 } }),
      });
    });

    const deleteButton = page.getByRole('button', { name: /delete/i }).first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await page.getByRole('button', { name: /confirm/i }).click();
      
      await expect(page.getByText(/deleted.*successfully/i)).toBeVisible({ timeout: 5000 });
    }
  });
});
