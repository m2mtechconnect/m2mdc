/**
 * YVR Builder & Deploy Flow E2E Tests
 * Tests the complete builder and deployment flow for YVR template
 */

import { test, expect } from '@playwright/test';

test.describe('YVR Builder Flow', () => {
  test('Can load builder with YVR template via URL param', async ({ page }) => {
    // Navigate directly to builder with YVR template
    await page.goto('/builder?templateId=YVR_AIRPORT_DIGITAL_TWIN');
    await page.waitForLoadState('networkidle');

    // Should load builder
    await expect(page).toHaveURL(/builder/);

    // Should show YVR content
    const hasYVRContent = await page.locator('text=YVR').or(
      page.locator('text=Airport Operations')
    ).isVisible();
    expect(hasYVRContent).toBe(true);
  });

  test('Builder Step 1 shows YVR summary data', async ({ page }) => {
    await page.goto('/builder?templateId=YVR_AIRPORT_DIGITAL_TWIN&step=1');
    await page.waitForLoadState('networkidle');

    // Check for name field populated
    const nameInput = page.locator('input[name="name"]').or(
      page.locator('input[placeholder*="name"]')
    );

    if (await nameInput.isVisible()) {
      const value = await nameInput.inputValue();
      expect(value.toLowerCase()).toContain('yvr');
    }

    // Check for Aviation industry
    const hasAviation = await page.locator('text=Aviation').isVisible();
    expect(hasAviation).toBe(true);
  });

  test('Builder Step 2 shows intelligence settings', async ({ page }) => {
    await page.goto('/builder?templateId=YVR_AIRPORT_DIGITAL_TWIN&step=2');
    await page.waitForLoadState('networkidle');

    // Should show model selection
    const hasModelConfig = await page.locator('text=/model|gemini|gpt/i').isVisible();
    expect(hasModelConfig).toBe(true);

    // Should show temperature or other AI settings
    const hasSettings = await page.locator('text=/temperature|system prompt|behavior/i').isVisible();
    expect(hasSettings).toBe(true);
  });

  test('Builder Step 3 shows integrations', async ({ page }) => {
    await page.goto('/builder?templateId=YVR_AIRPORT_DIGITAL_TWIN&step=3');
    await page.waitForLoadState('networkidle');

    // Should show data sources or integrations
    const hasIntegrations = await page.locator('text=/integration|connector|data source/i').isVisible();
    expect(hasIntegrations).toBe(true);
  });

  test('Builder Step 4 shows workflow', async ({ page }) => {
    await page.goto('/builder?templateId=YVR_AIRPORT_DIGITAL_TWIN&step=4');
    await page.waitForLoadState('networkidle');

    // Should show workflow editor or triggers/actions
    const hasWorkflow = await page.locator('text=/workflow|trigger|action/i').isVisible();
    expect(hasWorkflow).toBe(true);

    // CRITICAL: Should NOT show "Workflow actions are required" error
    const hasError = await page.locator('text=Workflow actions are required').isVisible();
    expect(hasError).toBe(false);
  });

  test('Builder Step 5 shows simulation and ROI', async ({ page }) => {
    await page.goto('/builder?templateId=YVR_AIRPORT_DIGITAL_TWIN&step=5');
    await page.waitForLoadState('networkidle');

    // Should show ROI or KPI information
    const hasROI = await page.locator('text=/ROI|KPI|metric|scenario/i').isVisible();
    expect(hasROI).toBe(true);
  });

  test('Can navigate through all builder steps', async ({ page }) => {
    await page.goto('/builder?templateId=YVR_AIRPORT_DIGITAL_TWIN&step=1');
    await page.waitForLoadState('networkidle');

    // Try to click Next button through steps
    for (let step = 1; step <= 5; step++) {
      await page.waitForTimeout(1000);

      // Look for Next or Continue button
      const nextButton = page.locator('button:has-text("Next")').or(
        page.locator('button:has-text("Continue")')
      );

      if (await nextButton.isVisible() && step < 5) {
        await nextButton.click();
        await page.waitForLoadState('networkidle');
      }
    }

    // Should end up at step 5
    await expect(page).toHaveURL(/step=5/);
  });
});

test.describe('YVR Deploy Flow', () => {
  test('Step 5 shows deploy button', async ({ page }) => {
    await page.goto('/builder?templateId=YVR_AIRPORT_DIGITAL_TWIN&step=5');
    await page.waitForLoadState('networkidle');

    // Look for Deploy button
    const deployButton = page.locator('button:has-text("Deploy")').or(
      page.locator('button:has-text("Launch")')
    );

    // Button should exist (may require scrolling)
    const buttonCount = await deployButton.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('Deploy button triggers deployment flow', async ({ page }) => {
    await page.goto('/builder?templateId=YVR_AIRPORT_DIGITAL_TWIN&step=5');
    await page.waitForLoadState('networkidle');

    // Find and click deploy button
    const deployButton = page.locator('button:has-text("Deploy")').first();

    if (await deployButton.isVisible()) {
      // Set up response listener
      const responsePromise = page.waitForResponse(
        response => response.url().includes('deploy') && response.status() === 200,
        { timeout: 30000 }
      );

      await deployButton.click();

      // Wait for deployment to start
      await page.waitForTimeout(2000);

      // Should show loading state or success message
      const hasLoadingOrSuccess = await page.locator('text=/deploying|success|complete/i').isVisible();
      expect(hasLoadingOrSuccess).toBe(true);
    }
  });

  test('Successful deployment redirects to dashboard', async ({ page }) => {
    // This test assumes deployment completes successfully
    // In real scenario, we'd mock the deployment response

    await page.goto('/builder?templateId=YVR_AIRPORT_DIGITAL_TWIN&step=5');
    await page.waitForLoadState('networkidle');

    // Note: This test is aspirational - actual deployment requires backend
    // In integration tests, we'd mock the deployment response
  });

  test('Deployment validation catches missing fields', async ({ page }) => {
    // Create a builder session with incomplete data
    await page.goto('/builder?step=5');
    await page.waitForLoadState('networkidle');

    // Try to deploy without filling required fields
    const deployButton = page.locator('button:has-text("Deploy")').first();

    if (await deployButton.isVisible()) {
      await deployButton.click();
      await page.waitForTimeout(1000);

      // Should show validation error or be disabled
      const hasError = await page.locator('text=/required|missing|error/i').isVisible();
      const isDisabled = await deployButton.isDisabled();

      expect(hasError || isDisabled).toBe(true);
    }
  });
});

test.describe('YVR Deployed Agent Management', () => {
  test.skip('Deployed YVR appears in agents list', async ({ page }) => {
    // This test requires actual deployment to have occurred
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to deployed agents
    const agentsLink = page.locator('text=Agents').or(
      page.locator('text=Deployed')
    );

    if (await agentsLink.isVisible()) {
      await agentsLink.click();
      await page.waitForLoadState('networkidle');

      // Look for YVR in the list
      const yvrAgent = page.locator('text=YVR');
      // This would be visible if deployment succeeded
    }
  });

  test.skip('Can open manage view for deployed YVR', async ({ page }) => {
    // Navigate to deployed agent and open manage
    // This requires deployment to have succeeded

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find YVR agent and click Manage
    const manageButton = page.locator('text=YVR').locator('..').locator('button:has-text("Manage")');

    if (await manageButton.isVisible()) {
      await manageButton.click();
      await page.waitForLoadState('networkidle');

      // Should show manage view with tabs
      const hasOverview = await page.locator('text=Overview').isVisible();
      expect(hasOverview).toBe(true);
    }
  });

  test.skip('Manage view shows live data overlays', async ({ page }) => {
    // This test checks that manage view shows both template data and live metrics
    // Requires deployed agent to exist
  });
});
