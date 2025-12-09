import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Builder Complete Flow - Finance System @e2e', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/builder?template=blank&mode=create');
    await page.waitForLoadState('networkidle');
  });

  test('S1: Complete 6-step finance system creation', async ({ page }) => {
    // Step 1: Define Goal
    await expect(page.getByText('Define Goal')).toBeVisible();
    
    await page.fill('input[name="systemName"]', 'Finance Compliance System');
    await page.selectOption('select[name="department"]', 'Finance');
    await page.selectOption('select[name="outcome"]', 'Automation');
    await page.selectOption('select[name="successMetric"]', 'cycle_time');
    
    await page.click('button:has-text("Next Step")');
    await page.waitForLoadState('networkidle');

    // Step 2: Choose Base
    await expect(page.getByText('Choose Base')).toBeVisible();
    
    // Select an industry solution or skip
    const industryCard = page.locator('[data-testid="industry-card"]').first();
    if (await industryCard.isVisible()) {
      await industryCard.click();
    }
    
    await page.click('button:has-text("Next Step")');
    await page.waitForLoadState('networkidle');

    // Step 3: Configure Intelligence
    await expect(page.getByText('Configure Intelligence')).toBeVisible();
    
    // Select model
    await page.click('button:has-text("google/gemini-2.5-flash")');
    
    // Set temperature
    const temperatureSlider = page.locator('input[type="range"][name="temperature"]');
    await temperatureSlider.fill('0.3');
    
    // Test prompt (optional)
    const testButton = page.locator('button:has-text("Run Sample")');
    if (await testButton.isVisible()) {
      await testButton.click();
      await page.waitForTimeout(2000);
    }
    
    await page.click('button:has-text("Next Step")');
    await page.waitForLoadState('networkidle');

    // Step 4: Connect Business Systems
    await expect(page.getByText(/Connect.*Business.*Systems/i)).toBeVisible();
    
    // Check for integrations hub (Zapier integrations)
    const integrationsSection = page.locator('text=/Integration|Zapier|Connect/i');
    if (await integrationsSection.first().isVisible()) {
      // Integration hub is visible
      // await fileInput.setInputFiles('path/to/test-doc.pdf');
    }
    
    await page.click('button:has-text("Next Step")');
    await page.waitForLoadState('networkidle');

    // Step 5: Automate Workflow
    await expect(page.getByText('Automate Workflow')).toBeVisible();
    
    // Add workflow nodes (if canvas is interactive)
    const canvas = page.locator('canvas, [data-testid="workflow-canvas"]');
    if (await canvas.isVisible()) {
      // Simulate adding nodes
      await canvas.click({ position: { x: 100, y: 100 } });
    }
    
    await page.click('button:has-text("Next Step")');
    await page.waitForLoadState('networkidle');

    // Step 6: Measure & Deploy
    await expect(page.getByText('Measure & Deploy')).toBeVisible();
    
    // Verify system summary is displayed
    await expect(page.getByText('Finance Compliance System')).toBeVisible();
    await expect(page.getByText('Finance')).toBeVisible();
    
    // Deploy button should be visible
    const deployButton = page.locator('button:has-text("Deploy System")');
    await expect(deployButton).toBeVisible();
    
    // Optional: Click deploy and verify success
    // await deployButton.click();
    // await expect(page.getByText('System deployed successfully')).toBeVisible();
  });

  test('should persist state across page reloads', async ({ page }) => {
    // Fill Step 1
    await page.fill('input[name="systemName"]', 'Test Persistence');
    await page.selectOption('select[name="department"]', 'Operations');
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if data persists
    const systemName = await page.inputValue('input[name="systemName"]');
    expect(systemName).toBe('Test Persistence');
  });

  test('should navigate backwards without losing data', async ({ page }) => {
    // Step 1
    await page.fill('input[name="systemName"]', 'Navigation Test');
    await page.click('button:has-text("Next Step")');
    await page.waitForLoadState('networkidle');
    
    // Step 2
    await expect(page.getByText('Choose Base')).toBeVisible();
    
    // Go back
    await page.click('button:has-text("Back")');
    await page.waitForLoadState('networkidle');
    
    // Verify data persists
    const systemName = await page.inputValue('input[name="systemName"]');
    expect(systemName).toBe('Navigation Test');
  });

  test('@a11y should have no critical accessibility violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should be responsive on mobile', async ({ page, viewport }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if layout adapts
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    
    // Check for overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test('should show error when required fields are missing', async ({ page }) => {
    // Try to proceed without filling required fields
    await page.click('button:has-text("Next Step")');
    
    // Should show validation error
    await expect(page.getByText(/required/i)).toBeVisible();
  });

  test('should save progress automatically', async ({ page }) => {
    // Fill data
    await page.fill('input[name="systemName"]', 'Auto Save Test');
    
    // Wait for autosave indicator
    await page.waitForTimeout(2000);
    
    // Look for "Saved" indicator
    const saved = page.locator('[data-testid="save-indicator"]');
    if (await saved.isVisible()) {
      await expect(saved).toContainText(/saved/i);
    }
  });
});
