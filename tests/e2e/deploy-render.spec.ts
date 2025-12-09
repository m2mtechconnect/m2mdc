import { test, expect } from '@playwright/test';

test.describe('Deploy - Render Summary', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Deploy page with test system
    await page.goto('/deploy?id=system_test_01');
    await page.waitForLoadState('networkidle');
  });

  test('should render system configuration summary', async ({ page }) => {
    // Check for summary card
    await expect(page.getByText('System Configuration')).toBeVisible();
    
    // Check for all summary fields
    await expect(page.getByText('System Name')).toBeVisible();
    await expect(page.getByText('Department')).toBeVisible();
    await expect(page.getByText('Template')).toBeVisible();
    await expect(page.getByText('AI Model')).toBeVisible();
    await expect(page.getByText('Grounding')).toBeVisible();
    await expect(page.getByText('Connected Tools')).toBeVisible();
  });

  test('should show grounding status with icon', async ({ page }) => {
    const groundingSection = page.locator('text=Grounding').locator('..');
    
    // Should show either Enabled or Disabled
    const hasEnabled = await groundingSection.getByText('Enabled').isVisible().catch(() => false);
    const hasDisabled = await groundingSection.getByText('Disabled').isVisible().catch(() => false);
    
    expect(hasEnabled || hasDisabled).toBeTruthy();
  });

  test('should display connected tools count', async ({ page }) => {
    await expect(page.getByText(/\d+ integrations/)).toBeVisible();
  });

  test('should show Deploy System button', async ({ page }) => {
    const deployButton = page.getByRole('button', { name: /deploy system/i });
    await expect(deployButton).toBeVisible();
  });

  test('should show ROI Calculator panel', async ({ page }) => {
    await expect(page.getByText('ROI Projection')).toBeVisible();
  });

  test('should have back to builder button', async ({ page }) => {
    const backButton = page.getByRole('button', { name: /back to builder/i });
    await expect(backButton).toBeVisible();
  });

  test('should display user role badge', async ({ page }) => {
    // Should show a role badge
    const badge = page.locator('[class*="badge"]').first();
    await expect(badge).toBeVisible();
  });
});
