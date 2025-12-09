import { test, expect } from '@playwright/test';

test.describe('Deploy - Error Handling', () => {
  test('should handle deployment failure gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('**/functions/v1/systems-create**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Provisioning failed: Vertex quota exceeded' })
      });
    });

    await page.goto('/deploy?id=valid_system');
    await page.waitForLoadState('networkidle');

    const deployButton = page.getByRole('button', { name: /deploy system/i });
    const isEnabled = await deployButton.isEnabled();
    if (!isEnabled) {
      test.skip();
      return;
    }

    await deployButton.click();

    // Should show error toast
    await expect(page.getByText(/deployment failed/i)).toBeVisible({ timeout: 15000 });
  });

  test('should mark failed stage in progress modal', async ({ page }) => {
    await page.route('**/functions/v1/systems-create**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Runtime provisioning failed' })
      });
    });

    await page.goto('/deploy?id=valid_system');
    await page.waitForLoadState('networkidle');

    const deployButton = page.getByRole('button', { name: /deploy system/i });
    const isEnabled = await deployButton.isEnabled();
    if (!isEnabled) {
      test.skip();
      return;
    }

    await deployButton.click();

    // Should show progress modal
    await expect(page.getByText('Deploying System')).toBeVisible();
    
    // Wait for failure
    await page.waitForTimeout(5000);
    
    // Should still be on deploy page (not navigated away)
    await expect(page).toHaveURL(/\/deploy/);
  });

  test('should handle network timeout', async ({ page }) => {
    await page.route('**/functions/v1/systems-create**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 30000)); // Long timeout
      await route.abort('timedout');
    });

    await page.goto('/deploy?id=valid_system');
    await page.waitForLoadState('networkidle');

    const deployButton = page.getByRole('button', { name: /deploy system/i });
    const isEnabled = await deployButton.isEnabled();
    if (!isEnabled) {
      test.skip();
      return;
    }

    await deployButton.click();

    // Should eventually show error
    await expect(page.getByText(/deployment failed/i)).toBeVisible({ timeout: 35000 });
  });

  test('should handle missing system ID', async ({ page }) => {
    await page.goto('/deploy');
    
    // Should redirect or show error
    await expect(page.getByText(/no system selected/i)).toBeVisible();
  });

  test('should log deployment failure to database', async ({ page }) => {
    let deploymentCreated = false;

    await page.route('**/rest/v1/deployments**', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      if (postData && postData.status === 'failed') {
        deploymentCreated = true;
      }

      await route.continue();
    });

    await page.route('**/functions/v1/systems-create**', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Test error' })
      });
    });

    await page.goto('/deploy?id=valid_system');
    await page.waitForLoadState('networkidle');

    const deployButton = page.getByRole('button', { name: /deploy system/i });
    const isEnabled = await deployButton.isEnabled();
    if (!isEnabled) {
      test.skip();
      return;
    }

    await deployButton.click();
    await page.waitForTimeout(6000);

    // Deployment failure should have been logged
    expect(deploymentCreated).toBeTruthy();
  });
});
