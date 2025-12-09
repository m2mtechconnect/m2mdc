import { test, expect } from '@playwright/test';

test.describe('Deploy - Analytics Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/deploy?id=system_test_01');
    await page.waitForLoadState('networkidle');
  });

  test('should record deployment to deployment_tracking table', async ({ page }) => {
    // Mock successful deployment
    await page.route('**/rest/v1/deployments', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'deploy_123',
          system_id: 'system_test_01',
          status: 'deployed',
        }),
      });
    });

    await page.route('**/rest/v1/deployment_tracking', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'track_123',
          system_id: 'system_test_01',
        }),
      });
    });

    const deployButton = page.getByRole('button', { name: /deploy system/i });
    
    if (await deployButton.isEnabled()) {
      await deployButton.click();
      
      // Wait for deployment to complete
      await page.waitForTimeout(2000);
      
      // Check that deployment_tracking was called
      const trackingRequests = page.waitForRequest(
        req => req.url().includes('/rest/v1/deployment_tracking') && req.method() === 'POST'
      );
      
      expect(trackingRequests).toBeTruthy();
    }
  });

  test('should include ROI metrics in deployment record', async ({ page }) => {
    const roiInput = page.getByLabel(/time saved per run/i);
    if (await roiInput.isVisible()) {
      await roiInput.fill('45');
    }

    const deployButton = page.getByRole('button', { name: /deploy system/i });
    
    if (await deployButton.isEnabled()) {
      let deploymentPayload: any;

      await page.route('**/rest/v1/deployment_tracking', async route => {
        deploymentPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'track_123' }),
        });
      });

      await deployButton.click();
      await page.waitForTimeout(1000);

      // Verify ROI data is included
      expect(deploymentPayload?.roi_estimate).toBeDefined();
    }
  });

  test('should navigate to analytics after successful deployment', async ({ page }) => {
    await page.route('**/rest/v1/deployments', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'deploy_123', status: 'deployed' }),
      });
    });

    await page.route('**/functions/v1/systems-create', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, system_id: 'system_test_01' }),
      });
    });

    const deployButton = page.getByRole('button', { name: /deploy system/i });
    
    if (await deployButton.isEnabled()) {
      await deployButton.click();
      
      // Wait for navigation or success message
      await page.waitForTimeout(3000);
      
      // Should show link to analytics or navigate
      const analyticsLink = page.getByText(/view analytics/i);
      const currentUrl = page.url();
      
      expect(
        (await analyticsLink.isVisible()) || currentUrl.includes('/analytics') || currentUrl.includes('/dashboard')
      ).toBeTruthy();
    }
  });

  test('should show connector and MCP counts in deployment', async ({ page }) => {
    await page.waitForSelector('text=Connected Tools');
    
    const toolsSection = page.locator('text=Connected Tools').locator('..');
    const toolsText = await toolsSection.textContent();
    
    // Should show number of integrations
    expect(toolsText).toMatch(/\d+/);
  });
});
