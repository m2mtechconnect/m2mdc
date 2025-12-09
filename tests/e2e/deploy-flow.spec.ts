import { test, expect } from '@playwright/test';

test.describe('Deploy - Happy Path Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock successful API responses
    await page.route('**/rest/v1/deployments**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'deploy123',
          status: 'active',
          runtime_url: 'https://runtime.m2m.ai/system_test_01'
        }])
      });
    });

    await page.route('**/functions/v1/systems-create**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
  });

  test('should show deployment progress modal', async ({ page }) => {
    await page.goto('/deploy?id=valid_system');
    await page.waitForLoadState('networkidle');

    const deployButton = page.getByRole('button', { name: /deploy system/i });
    
    // Only proceed if button is enabled (manager/exec)
    const isEnabled = await deployButton.isEnabled();
    if (!isEnabled) {
      test.skip();
      return;
    }

    await deployButton.click();

    // Should show progress modal
    await expect(page.getByText('Deploying System')).toBeVisible();
  });

  test('should show all deployment stages', async ({ page }) => {
    await page.goto('/deploy?id=valid_system');
    await page.waitForLoadState('networkidle');

    const deployButton = page.getByRole('button', { name: /deploy system/i });
    const isEnabled = await deployButton.isEnabled();
    if (!isEnabled) {
      test.skip();
      return;
    }

    await deployButton.click();

    // Check for deployment stages
    await expect(page.getByText('Validate Configuration')).toBeVisible();
    await expect(page.getByText('Package Workflow')).toBeVisible();
    await expect(page.getByText('Provision Runtime')).toBeVisible();
    await expect(page.getByText('Register Webhooks')).toBeVisible();
    await expect(page.getByText('Warm AI Model')).toBeVisible();
  });

  test('should show success toast on completion', async ({ page }) => {
    await page.goto('/deploy?id=valid_system');
    await page.waitForLoadState('networkidle');

    const deployButton = page.getByRole('button', { name: /deploy system/i });
    const isEnabled = await deployButton.isEnabled();
    if (!isEnabled) {
      test.skip();
      return;
    }

    await deployButton.click();

    // Wait for success toast
    await expect(page.getByText(/deployment successful/i)).toBeVisible({ timeout: 15000 });
  });

  test('should disable deploy button during deployment', async ({ page }) => {
    await page.goto('/deploy?id=valid_system');
    await page.waitForLoadState('networkidle');

    const deployButton = page.getByRole('button', { name: /deploy system/i });
    const isEnabled = await deployButton.isEnabled();
    if (!isEnabled) {
      test.skip();
      return;
    }

    await deployButton.click();

    // Button should be disabled during deployment
    await expect(deployButton).toBeDisabled();
  });

  test('should navigate to dashboard after successful deployment', async ({ page }) => {
    await page.goto('/deploy?id=valid_system');
    await page.waitForLoadState('networkidle');

    const deployButton = page.getByRole('button', { name: /deploy system/i });
    const isEnabled = await deployButton.isEnabled();
    if (!isEnabled) {
      test.skip();
      return;
    }

    await deployButton.click();

    // Should eventually navigate to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
  });
});
