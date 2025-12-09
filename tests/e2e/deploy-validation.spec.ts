import { test, expect } from '@playwright/test';

test.describe('Deploy - Validation', () => {
  test('should show validation errors when configuration incomplete', async ({ page }) => {
    // Navigate to deploy with incomplete system
    await page.goto('/deploy?id=incomplete_system');
    await page.waitForLoadState('networkidle');

    // Should show validation alert
    await expect(page.getByText(/please fix the following issues/i)).toBeVisible();
  });

  test('should provide fix links for validation issues', async ({ page }) => {
    await page.goto('/deploy?id=incomplete_system');
    await page.waitForLoadState('networkidle');

    // Check for Fix buttons
    const fixButtons = page.getByRole('button', { name: 'Fix' });
    const count = await fixButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should disable deploy button when validation fails', async ({ page }) => {
    await page.goto('/deploy?id=incomplete_system');
    await page.waitForLoadState('networkidle');

    const deployButton = page.getByRole('button', { name: /deploy system/i });
    await expect(deployButton).toBeDisabled();
  });

  test('should navigate to fix step when clicking fix link', async ({ page }) => {
    await page.goto('/deploy?id=incomplete_system');
    await page.waitForLoadState('networkidle');

    // Click first Fix button
    const fixButton = page.getByRole('button', { name: 'Fix' }).first();
    await fixButton.click();

    // Should navigate to builder
    await expect(page).toHaveURL(/\/builder/);
  });

  test('should enable deploy when all validation passes', async ({ page }) => {
    await page.goto('/deploy?id=valid_system');
    await page.waitForLoadState('networkidle');

    // Should not show validation alert
    await expect(page.getByText(/please fix the following issues/i)).not.toBeVisible();

    // Deploy button should be enabled (unless RBAC blocks it)
    const deployButton = page.getByRole('button', { name: /deploy system/i });
    const isDisabled = await deployButton.isDisabled();
    
    // If disabled, should be due to RBAC not validation
    if (isDisabled) {
      await expect(page.getByText(/only managers and executives/i)).toBeVisible();
    }
  });

  test('should show specific validation messages', async ({ page }) => {
    await page.goto('/deploy?id=incomplete_system');
    await page.waitForLoadState('networkidle');

    // Should show specific issue types
    const possibleIssues = [
      'No workflow configured',
      'No AI model selected',
      'No workflow nodes configured',
      'No integrations connected',
    ];

    const alertText = await page.getByRole('alert').textContent();
    const hasValidationMessage = possibleIssues.some(issue => 
      alertText?.includes(issue)
    );

    expect(hasValidationMessage).toBeTruthy();
  });
});
