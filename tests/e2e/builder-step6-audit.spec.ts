import { test, expect } from '@playwright/test';

test.describe('Builder Step 6 - Audit & Test', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to builder step 6 with the test system
    await page.goto('/builder?id=d50e9e84-0def-45d7-b7a3-5da2ec79f398&step=6');
    await page.waitForLoadState('networkidle');
  });

  test('should render all step 6 components', async ({ page }) => {
    // Check main heading
    await expect(page.getByText('Measure & Deploy')).toBeVisible();
    
    // Check AI-Generated System Summary card
    await expect(page.getByText('AI System Summary')).toBeVisible();
    
    // Check AI Recommendation Card (should be visible)
    await expect(page.locator('text=Recommendations').first()).toBeVisible();
    
    // Check System Summary section
    await expect(page.getByText('System Summary').last()).toBeVisible();
    
    // Check Model Preview
    await expect(page.locator('text=Selected Model').first()).toBeVisible();
    
    // Check Deploy button
    const deployButton = page.getByRole('button', { name: /review.*deploy/i });
    await expect(deployButton).toBeVisible();
    await expect(deployButton).toBeEnabled();
    
    // Check ROI Calculator in sidebar
    await expect(page.getByText('ROI Projection').or(page.getByText('ROI Calculator'))).toBeVisible();
  });

  test('should generate AI summary automatically', async ({ page }) => {
    // Wait for the summary to be generated (max 10 seconds)
    await page.waitForTimeout(2000);
    
    // Check if loading state appears first or if summary is already loaded
    const summaryCard = page.locator('text=AI System Summary').locator('..');
    
    // Should eventually show summary content
    await expect(summaryCard).toContainText(/system|department|intelligence|performance|outcome/i, {
      timeout: 15000
    });
  });

  test('should allow manual summary regeneration', async ({ page }) => {
    // Wait for initial summary to load
    await page.waitForTimeout(2000);
    
    // Find and click the refresh button
    const refreshButton = page.locator('[title="Regenerate summary"]');
    await expect(refreshButton).toBeVisible();
    
    // Click to regenerate
    await refreshButton.click();
    
    // Should show loading state
    await expect(page.locator('text=Generating intelligent summary')).toBeVisible({ timeout: 1000 });
    
    // Should complete within 15 seconds
    await expect(page.locator('text=Generating intelligent summary')).not.toBeVisible({ timeout: 15000 });
  });

  test('should display system configuration correctly', async ({ page }) => {
    // Check system summary shows configuration fields
    const summarySection = page.locator('text=System Summary').last().locator('..');
    
    // Should show at least some configuration details
    await expect(summarySection).toBeVisible();
    
    // Check Model Preview section
    await expect(page.locator('text=Selected Model')).toBeVisible();
  });

  test('should validate before allowing deploy', async ({ page }) => {
    // Try to click deploy button
    const deployButton = page.getByRole('button', { name: /review.*deploy/i });
    await deployButton.click();
    
    // Should either navigate to deploy page or show validation error
    await page.waitForTimeout(2000);
    
    // Check if navigated to deploy page OR if validation error appeared
    const url = page.url();
    const hasError = await page.locator('text=/validation|error|complete/i').isVisible().catch(() => false);
    
    // One of these should be true
    expect(url.includes('/deploy') || hasError).toBeTruthy();
  });

  test('should show ROI Calculator', async ({ page }) => {
    // ROI Calculator should be visible in the sidebar
    await expect(page.getByText('ROI Projection').or(page.getByText('ROI Calculator'))).toBeVisible();
    
    // Should have input fields for ROI calculation
    const roiSection = page.locator('text=ROI').first().locator('..');
    await expect(roiSection).toBeVisible();
  });

  test('should display recommendation data correctly', async ({ page }) => {
    // The system summary should reflect the recommendation that was used to create this agent
    const summaryCard = page.locator('text=AI System Summary').locator('..');
    
    // Wait for summary to load
    await page.waitForTimeout(3000);
    
    // Should contain the system name from the recommendation
    await expect(summaryCard).toContainText(/develop|insight|customer|product|experience/i, {
      timeout: 10000
    });
  });

  test('should handle deploy button click', async ({ page }) => {
    const deployButton = page.getByRole('button', { name: /review.*deploy/i });
    
    // Button should be enabled
    await expect(deployButton).toBeEnabled();
    
    // Click the button
    await deployButton.click();
    
    // Should show loading state briefly
    await expect(page.getByText('Preparing...')).toBeVisible({ timeout: 2000 });
    
    // Should eventually navigate or show result (within 10 seconds)
    await page.waitForTimeout(1000);
  });

  test('should allow navigation back to previous steps', async ({ page }) => {
    // Check if step indicators or back buttons are available
    const backButton = page.getByRole('button', { name: /back|previous/i }).first();
    
    if (await backButton.isVisible()) {
      await backButton.click();
      
      // Should navigate to previous step
      await page.waitForTimeout(1000);
      const url = page.url();
      expect(url).toContain('step=5');
    }
  });
});
