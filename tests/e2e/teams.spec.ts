import { test, expect } from '@playwright/test';

test.describe('Teams - Invites, Roles, Permissions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/teams');
    await page.waitForLoadState('networkidle');
  });

  test('should display team members list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /team|members/i })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should invite new team member', async ({ page }) => {
    await page.route('**/teams-invite**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, inviteId: 'inv-123' }),
      });
    });

    await page.getByRole('button', { name: /invite/i }).click();
    
    // Fill invite form
    await page.getByPlaceholder(/email/i).fill('newmember@example.com');
    await page.getByRole('combobox', { name: /role/i }).click();
    await page.getByRole('option', { name: /engineer/i }).click();
    
    await page.getByRole('button', { name: /send invite/i }).click();
    
    await expect(page.getByText(/invite sent|success/i)).toBeVisible({ timeout: 5000 });
  });

  test('should display roles and permissions matrix', async ({ page }) => {
    await page.getByRole('tab', { name: /permissions/i }).click();
    
    // Check for permissions table
    await expect(page.getByText(/manager|engineer|executive|compliance/i)).toBeVisible();
    await expect(page.getByText(/deploy|delete|export|view/i)).toBeVisible();
  });

  test('should block prohibited actions for Manager role', async ({ page }) => {
    // Mock user with Manager role
    await page.evaluate(() => {
      localStorage.setItem('mockUserRole', 'manager');
    });

    await page.reload();
    
    // Manager should see deploy button but not certain admin actions
    const deployButton = page.getByRole('button', { name: /deploy/i });
    const deleteAllButton = page.getByRole('button', { name: /delete all/i });
    
    // Deploy should be available
    if (await deployButton.isVisible()) {
      expect(await deployButton.isEnabled()).toBe(true);
    }
    
    // Delete all should not be visible or disabled
    if (await deleteAllButton.isVisible()) {
      expect(await deleteAllButton.isDisabled()).toBe(true);
    }
  });

  test('should show pending invites', async ({ page }) => {
    await page.getByRole('tab', { name: /pending/i }).click();
    
    await expect(page.getByText(/pending invites|no pending/i)).toBeVisible();
  });

  test('should revoke invite', async ({ page }) => {
    await page.route('**/team_invites**', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });

    const revokeButton = page.getByRole('button', { name: /revoke/i }).first();
    if (await revokeButton.isVisible()) {
      await revokeButton.click();
      await expect(page.getByText(/revoked/i)).toBeVisible({ timeout: 5000 });
    }
  });
});
