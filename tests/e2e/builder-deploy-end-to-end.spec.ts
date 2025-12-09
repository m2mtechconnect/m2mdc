import { test, expect } from '@playwright/test';

test.describe('Builder - Deploy End-to-End', () => {
  test('should complete full builder wizard to deployment', async ({ page }) => {
    await page.goto('/builder');
    await page.waitForLoadState('networkidle');
    
    // Step 1: Define Goal
    await page.fill('[id="systemName"]', 'E2E Test System');
    await page.selectOption('[id="department"]', 'Operations');
    await page.fill('[id="outcome"]', 'Test complete deployment flow from builder to live system');
    await page.fill('[id="successMetric"]', 'System successfully deploys and runs');
    
    await expect(page.getByText(/saved •/i)).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Next Step")');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Choose Industry Solution
    // Skip for now or select first industry agent if available
    const firstIndustryAgent = page.locator('[data-testid="industry-card"]').first();
    if (await firstIndustryAgent.isVisible()) {
      await firstIndustryAgent.click();
      await page.waitForTimeout(500);
    }
    await page.click('button:has-text("Next Step")');
    await page.waitForLoadState('networkidle');
    
    // Step 3: Configure Intelligence
    // Verify model is prefilled
    await expect(page.locator('[data-selected-model]')).toBeVisible();
    
    // Adjust temperature if needed
    await page.fill('[id="temperature"]', '0.7');
    await page.waitForTimeout(500);
    
    await page.click('button:has-text("Next Step")');
    await page.waitForLoadState('networkidle');
    
    // Step 5: Automate Workflow
    // Add at least 2 nodes
    await page.click('button:has-text("Analyze")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Classify")');
    await page.waitForTimeout(500);
    
    // Save workflow
    await page.click('button:has-text("Save Draft")');
    await expect(page.getByText(/workflow saved/i)).toBeVisible({ timeout: 5000 });
    
    // Validate workflow
    await page.click('button:has-text("Validate")');
    await expect(page.getByText(/validation passed/i)).toBeVisible({ timeout: 5000 });
    
    await page.click('button:has-text("Next Step")');
    await page.waitForLoadState('networkidle');
    
    // Step 6: Measure & Deploy
    // Verify summary information
    await expect(page.getByText('E2E Test System')).toBeVisible();
    await expect(page.getByText('Operations')).toBeVisible();
    
    // Mock deployment API
    await page.route('**/functions/v1/agents-deploy**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, agentId: 'test-agent-123' })
      });
    });
    
    // Click deploy button
    const deployButton = page.locator('button:has-text("Deploy System")');
    await expect(deployButton).toBeVisible();
    await deployButton.click();
    
    // Should navigate to Deploy page
    await page.waitForURL(/\/deploy\?id=/, { timeout: 10000 });
    
    // Verify deployment page loaded
    await expect(page.getByText(/deploy system/i)).toBeVisible();
  });

  test('should validate all steps before allowing deployment', async ({ page }) => {
    await page.goto('/builder');
    await page.waitForLoadState('networkidle');
    
    // Try to navigate to Step 6 without completing previous steps
    // Should be prevented by validation
    
    // Fill minimal Step 1
    await page.fill('[id="systemName"]', 'Val');
    
    // Try to proceed - should fail validation
    const nextButton = page.locator('button:has-text("Next Step")');
    await expect(nextButton).toBeDisabled();
  });

  test('should show ROI calculator in deploy page', async ({ page }) => {
    // Navigate directly to deploy with mock system
    await page.goto('/deploy?id=test-system-123');
    await page.waitForLoadState('networkidle');
    
    // Mock system data
    await page.route('**/rest/v1/workflows**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          data: [{ id: 'wf-123', name: 'Test Workflow', system_id: 'test-system-123' }]
        })
      });
    });
    
    // Check for ROI Calculator
    await expect(page.getByText(/roi projection/i)).toBeVisible();
    await expect(page.getByText(/expected roi/i)).toBeVisible();
  });

  test('should handle deployment failure', async ({ page }) => {
    await page.goto('/deploy?id=test-system-123');
    await page.waitForLoadState('networkidle');
    
    // Mock deployment failure
    await page.route('**/functions/v1/systems-create**', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Deployment failed: insufficient resources' })
      });
    });
    
    await page.click('button:has-text("Deploy System")');
    
    // Should show error message
    await expect(page.getByText(/deployment failed/i)).toBeVisible({ timeout: 10000 });
  });

  test('should create deployment record on success', async ({ page }) => {
    let deploymentCreated = false;
    
    await page.route('**/rest/v1/deployments**', async (route) => {
      if (route.request().method() === 'POST') {
        deploymentCreated = true;
        await route.fulfill({
          status: 201,
          body: JSON.stringify({
            data: [{ id: 'dep-123', status: 'active', version: 'v1' }]
          })
        });
      } else {
        await route.continue();
      }
    });
    
    await page.goto('/deploy?id=test-system-123');
    await page.waitForLoadState('networkidle');
    
    await page.click('button:has-text("Deploy System")');
    await page.waitForTimeout(8000);
    
    expect(deploymentCreated).toBe(true);
  });

  test('should show deployment progress stages', async ({ page }) => {
    await page.goto('/deploy?id=test-system-123');
    await page.waitForLoadState('networkidle');
    
    await page.click('button:has-text("Deploy System")');
    
    // Should show progress modal
    await expect(page.getByText(/deploying system/i)).toBeVisible({ timeout: 3000 });
    
    // Check for deployment stages
    await expect(page.getByText(/validate configuration/i)).toBeVisible();
    await expect(page.getByText(/package workflow/i)).toBeVisible();
    await expect(page.getByText(/provision runtime/i)).toBeVisible();
  });

  test('should create ROI snapshot on deployment', async ({ page }) => {
    let roiSnapshotCreated = false;
    
    await page.route('**/rest/v1/roi_snapshots**', async (route) => {
      if (route.request().method() === 'POST') {
        roiSnapshotCreated = true;
        await route.fulfill({
          status: 201,
          body: JSON.stringify({
            data: [{ id: 'roi-123', roi_pct: 420, annual_savings: 125000 }]
          })
        });
      } else {
        await route.continue();
      }
    });
    
    await page.goto('/deploy?id=test-system-123');
    await page.waitForLoadState('networkidle');
    
    // Fill ROI calculator
    await page.fill('[id="timePerRun"]', '45');
    await page.fill('[id="runsPerWeek"]', '50');
    await page.waitForTimeout(1000);
    
    await page.click('button:has-text("Deploy System")');
    await page.waitForTimeout(8000);
    
    expect(roiSnapshotCreated).toBe(true);
  });

  test('should navigate to dashboard after successful deployment', async ({ page }) => {
    await page.goto('/deploy?id=test-system-123');
    await page.waitForLoadState('networkidle');
    
    // Mock successful deployment
    await page.route('**/functions/v1/systems-create**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true })
      });
    });
    
    await page.click('button:has-text("Deploy System")');
    
    // Should redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 12000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
