/**
 * E2E Test: Template Selection → Blueprint → Builder
 * Tests the complete flow from template marketplace to builder opening
 */

import { test, expect } from '@playwright/test';

test.describe('Template Intake Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should select template and open builder with blueprint', async ({ page }) => {
    // Step 1: Click "Start with a template"
    await page.click('text=Start with a template');
    
    // Wait for marketplace to load
    await expect(page.locator('text=Template Marketplace')).toBeVisible();
    await expect(page.locator('text=Choose from pre-built templates')).toBeVisible();

    // Step 2: Verify template cards are displayed
    await expect(page.locator('[data-testid="template-card"]')).toHaveCount({ min: 1 });
    
    // Check for template metadata
    await expect(page.locator('text=Certified')).toBeVisible();
    await expect(page.locator('[data-testid="template-rating"]')).toBeVisible();
    await expect(page.locator('text=downloads')).toBeVisible();

    // Step 3: Select a specific template
    const inventoryTemplate = page.locator('[data-testid="template-card"]:has-text("Inventory")').first();
    await expect(inventoryTemplate).toBeVisible();
    
    // Check template details
    await expect(inventoryTemplate.locator('text=Multi-Location')).toBeVisible();
    await expect(inventoryTemplate.locator('text=ROI')).toBeVisible();
    
    // Click "Use Template"
    await inventoryTemplate.locator('button:has-text("Use Template")').click();

    // Step 4: Verify builder opens with pre-filled template data
    await page.waitForURL(/\/builder\?/, { timeout: 10000 });
    
    // Verify Step 1 has template data
    await expect(page.locator('input[value*="Inventory"]')).toBeVisible();
    await expect(page.locator('text=Retail')).toBeVisible();
    await expect(page.locator('text=Operations')).toBeVisible();
    
    // Check ROI metrics from template
    await expect(page.locator('text=45%')).toBeVisible(); // Template ROI
    await expect(page.locator('text=25 hours/week')).toBeVisible();

    // Verify Step 2 has template model configuration
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=google/gemini-2.5-flash')).toBeVisible();
    
    // Template should have system prompt
    const systemPrompt = page.locator('textarea[placeholder*="system prompt"]');
    await expect(systemPrompt).not.toBeEmpty();
    const promptText = await systemPrompt.inputValue();
    expect(promptText).toContain('inventory');

    // Verify Step 3 has template integrations
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=POS System')).toBeVisible();
    await expect(page.locator('text=Warehouse Management')).toBeVisible();

    // Verify Step 4 has template workflow
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=Stock Level Alert')).toBeVisible();
    await expect(page.locator('text=Analyze Demand')).toBeVisible();
    
    const workflowNodes = page.locator('[data-testid="workflow-node"]');
    await expect(workflowNodes).toHaveCount({ min: 3 });
  });

  test('should filter templates by industry', async ({ page }) => {
    await page.click('text=Start with a template');
    
    await expect(page.locator('text=Template Marketplace')).toBeVisible();
    
    // Check filter options exist
    await expect(page.locator('text=All Industries')).toBeVisible();
    
    // Apply industry filter
    await page.click('button:has-text("All Industries")');
    await page.click('text=Retail');
    
    // Verify filtered results
    const templateCards = page.locator('[data-testid="template-card"]');
    await expect(templateCards).toHaveCount({ min: 1 });
    
    // All visible templates should be for Retail
    const retailBadges = page.locator('text=Retail');
    const badgeCount = await retailBadges.count();
    const cardCount = await templateCards.count();
    expect(badgeCount).toBeGreaterThanOrEqual(cardCount);
  });

  test('should show template preview before using', async ({ page }) => {
    await page.click('text=Start with a template');
    
    await expect(page.locator('text=Template Marketplace')).toBeVisible();
    
    // Click on a template card (not the button)
    const templateCard = page.locator('[data-testid="template-card"]').first();
    await templateCard.click();
    
    // Verify preview modal opens
    await expect(page.locator('text=Template Details')).toBeVisible();
    await expect(page.locator('text=Features')).toBeVisible();
    await expect(page.locator('text=KPIs')).toBeVisible();
    
    // Close preview
    await page.click('button[aria-label="Close"]');
    
    // Verify back at marketplace
    await expect(page.locator('text=Template Marketplace')).toBeVisible();
  });

  test('should handle certified templates differently', async ({ page }) => {
    await page.click('text=Start with a template');
    
    await expect(page.locator('text=Template Marketplace')).toBeVisible();
    
    // Find certified template
    const certifiedTemplate = page.locator('[data-testid="template-card"]:has([data-testid="certified-badge"])').first();
    
    if (await certifiedTemplate.isVisible()) {
      // Verify certified badge styling
      const certifiedBadge = certifiedTemplate.locator('[data-testid="certified-badge"]');
      await expect(certifiedBadge).toBeVisible();
      await expect(certifiedBadge).toHaveText(/Certified/i);
      
      // Use the certified template
      await certifiedTemplate.locator('button:has-text("Use Template")').click();
      
      await page.waitForURL(/\/builder\?/, { timeout: 10000 });
      
      // Verify template metadata is preserved in builder
      // The certified flag should be in the blueprint
      await page.click('button:has-text("Next")');
      await page.click('button:has-text("Next")');
      await page.click('button:has-text("Next")');
      
      // On simulation step, certified templates might show special badge
      await expect(page.locator('text=Certified Template')).toBeVisible();
    }
  });

  test('should track template selection analytics', async ({ page }) => {
    const analyticsEvents: any[] = [];
    await page.on('console', msg => {
      if (msg.text().includes('[Telemetry]')) {
        analyticsEvents.push(msg.text());
      }
    });

    await page.click('text=Start with a template');
    
    await expect(page.locator('text=Template Marketplace')).toBeVisible();
    
    const templateCard = page.locator('[data-testid="template-card"]').first();
    await templateCard.locator('button:has-text("Use Template")').click();
    
    await page.waitForURL(/\/builder\?/, { timeout: 10000 });

    // Verify analytics events
    expect(analyticsEvents.some(e => e.includes('agent_intake.completed'))).toBeTruthy();
    expect(analyticsEvents.some(e => e.includes('agent_intake.builder_opened'))).toBeTruthy();
    expect(analyticsEvents.some(e => e.includes('source') && e.includes('template'))).toBeTruthy();
  });

  test('should preserve template ID and metadata in blueprint', async ({ page }) => {
    await page.click('text=Start with a template');
    
    await expect(page.locator('text=Template Marketplace')).toBeVisible();
    
    const templateCard = page.locator('[data-testid="template-card"]').first();
    
    // Get template name for verification
    const templateName = await templateCard.locator('[data-testid="template-name"]').textContent();
    
    await templateCard.locator('button:has-text("Use Template")').click();
    
    await page.waitForURL(/\/builder\?/, { timeout: 10000 });
    
    // Verify template name is used
    const nameInput = page.locator('input[placeholder*="name"]');
    const inputValue = await nameInput.inputValue();
    expect(inputValue).toContain(templateName || '');
    
    // Navigate through steps to verify all template data is present
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    
    // On Step 5, template metadata should be visible
    await expect(page.locator('text=Template')).toBeVisible();
  });

  test('should handle empty marketplace gracefully', async ({ page }) => {
    // Mock empty template response
    await page.route('**/rest/v1/industry_templates*', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([]),
      });
    });

    await page.click('text=Start with a template');
    
    await expect(page.locator('text=Template Marketplace')).toBeVisible();
    
    // Should show empty state
    await expect(page.locator('text=No templates found')).toBeVisible();
  });
});
