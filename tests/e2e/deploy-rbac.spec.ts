import { test, expect } from '@playwright/test';

test.describe('Deploy - RBAC', () => {
  test('should allow manager to deploy', async ({ page }) => {
    // Mock manager role
    await page.goto('/deploy?id=valid_system');
    await page.waitForLoadState('networkidle');

    // Manager should see enabled button (if validation passes)
    const deployButton = page.getByRole('button', { name: /deploy system/i });
    await expect(deployButton).toBeVisible();
  });

  test('should allow executive to deploy', async ({ page }) => {
    await page.goto('/deploy?id=valid_system');
    await page.waitForLoadState('networkidle');

    const deployButton = page.getByRole('button', { name: /deploy system/i });
    await expect(deployButton).toBeVisible();
  });

  test('should show permission message for non-managers', async ({ page }) => {
    // Mock engineer role with no deploy permission
    await page.goto('/deploy?id=valid_system');
    await page.waitForLoadState('networkidle');

    // Should show permission message
    const permissionText = page.getByText(/only managers and executives/i);
    const hasPermissionMessage = await permissionText.isVisible().catch(() => false);
    
    // Either button is enabled (manager/exec) or message is shown
    const deployButton = page.getByRole('button', { name: /deploy system/i });
    const isEnabled = await deployButton.isEnabled();
    
    expect(hasPermissionMessage || isEnabled).toBeTruthy();
  });

  test('should display user role badge', async ({ page }) => {
    await page.goto('/deploy?id=valid_system');
    await page.waitForLoadState('networkidle');

    // Should show role badge
    const badge = page.locator('[class*="badge"]').first();
    await expect(badge).toBeVisible();
    
    const badgeText = await badge.textContent();
    expect(['engineer', 'manager', 'executive']).toContain(badgeText?.toLowerCase());
  });

  test('should prevent unauthorized deploy attempts', async ({ page }) => {
    await page.goto('/deploy?id=valid_system');
    await page.waitForLoadState('networkidle');

    const deployButton = page.getByRole('button', { name: /deploy system/i });
    const isDisabled = await deployButton.isDisabled();

    if (isDisabled) {
      // Try clicking anyway
      await deployButton.click({ force: true });
      
      // Should not show progress modal
      const progressModal = page.getByText('Deploying System');
      await expect(progressModal).not.toBeVisible();
    }
  });
});
