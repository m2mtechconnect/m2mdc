/**
 * E2E Test: Unified Template → Builder Flow
 * Tests that all template entry points use the same canonical pathway
 */

import { test, expect } from '@playwright/test';

test.describe('Unified Template → Builder Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should use unified path from marketplace page', async ({ page }) => {
    // Navigate to marketplace
    await page.click('text=Start with a template');
    
    await expect(page.locator('text=Template Marketplace')).toBeVisible();
    
    // Select a template
    const templateCard = page.locator('[data-testid="template-card"]').first();
    await templateCard.locator('button:has-text("Use Template")').click();
    
    // Should navigate to builder with step=1
    await page.waitForURL(/\/builder\?step=1/, { timeout: 10000 });
    
    // Verify blueprint is loaded in builder
    await expect(page.locator('input[placeholder*="name"]')).not.toBeEmpty();
    
    // Verify source indicator shows template origin
    await expect(page.locator('text=Started from template')).toBeVisible();
  });

  test('should use unified path from builder step 2', async ({ page }) => {
    // Start builder from scratch
    await page.goto('/builder?step=2');
    
    // Open template marketplace in builder
    await page.click('button:has-text("Browse Templates")');
    
    await expect(page.locator('text=Template Marketplace')).toBeVisible();
    
    // Select a template
    const templateCard = page.locator('[data-testid="template-card"]').first();
    await templateCard.locator('button:has-text("Use Template")').click();
    
    // Should navigate back to builder step 1 with template loaded
    await page.waitForURL(/\/builder\?step=1/, { timeout: 10000 });
    
    // Verify template data is populated
    await expect(page.locator('input[placeholder*="name"]')).not.toBeEmpty();
  });

  test('should track correct sourceEntry for marketplace', async ({ page }) => {
    const analyticsEvents: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('template.use_template')) {
        analyticsEvents.push(msg.text());
      }
    });

    await page.click('text=Start with a template');
    
    const templateCard = page.locator('[data-testid="template-card"]').first();
    await templateCard.locator('button:has-text("Use Template")').click();
    
    await page.waitForURL(/\/builder\?step=1/, { timeout: 10000 });

    // Verify sourceEntry is tracked as 'marketplace'
    const event = analyticsEvents.find(e => e.includes('sourceEntry'));
    expect(event).toContain('marketplace');
  });

  test('should track correct sourceEntry for builder', async ({ page }) => {
    const analyticsEvents: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('template.use_template')) {
        analyticsEvents.push(msg.text());
      }
    });

    await page.goto('/builder?step=2');
    await page.click('button:has-text("Browse Templates")');
    
    const templateCard = page.locator('[data-testid="template-card"]').first();
    await templateCard.locator('button:has-text("Use Template")').click();
    
    await page.waitForURL(/\/builder\?step=1/, { timeout: 10000 });

    // Verify sourceEntry is tracked as 'builder'
    const event = analyticsEvents.find(e => e.includes('sourceEntry'));
    expect(event).toContain('builder');
  });

  test('should show consistent UI across all entry points', async ({ page }) => {
    // Test from marketplace
    await page.click('text=Start with a template');
    
    const marketplaceCard = page.locator('[data-testid="template-card"]').first();
    
    // Verify consistent card structure
    await expect(marketplaceCard.locator('text=Certified')).toBeVisible();
    await expect(marketplaceCard.locator('[data-testid="template-rating"]')).toBeVisible();
    await expect(marketplaceCard.locator('button:has-text("Use Template")')).toBeVisible();
    
    // Verify button styling is consistent
    const useButton = marketplaceCard.locator('button:has-text("Use Template")');
    const buttonClass = await useButton.getAttribute('class');
    expect(buttonClass).toContain('w-full'); // Should be full width
  });

  test('should prevent direct deploy from marketplace', async ({ page }) => {
    await page.click('text=Start with a template');
    
    const templateCard = page.locator('[data-testid="template-card"]').first();
    
    // Should NOT have a "Deploy" button
    await expect(templateCard.locator('button:has-text("Deploy")')).not.toBeVisible();
    
    // Should only have "Use Template" button
    await expect(templateCard.locator('button:has-text("Use Template")')).toBeVisible();
  });

  test('should handle template load errors gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('**/rest/v1/industry_templates*', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Failed to load template' }),
      });
    });

    await page.click('text=Start with a template');
    
    // Should show error message
    await expect(page.locator('text=No templates available')).toBeVisible();
    
    // Should not navigate to builder
    await expect(page).not.toHaveURL(/\/builder/);
  });

  test('should handle missing template ID gracefully', async ({ page }) => {
    // Try to load builder with invalid template ID
    await page.goto('/builder?step=1&templateId=invalid-template-id');
    
    // Should show error message
    await expect(page.locator('text=Template not found')).toBeVisible({ timeout: 10000 });
  });

  test('should reload latest template when selecting multiple times', async ({ page }) => {
    await page.click('text=Start with a template');
    
    // Select first template
    const firstTemplate = page.locator('[data-testid="template-card"]').first();
    const firstTemplateName = await firstTemplate.locator('[data-testid="template-name"]').textContent();
    await firstTemplate.locator('button:has-text("Use Template")').click();
    
    await page.waitForURL(/\/builder\?step=1/, { timeout: 10000 });
    
    // Verify first template is loaded
    const nameInput1 = page.locator('input[placeholder*="name"]');
    const value1 = await nameInput1.inputValue();
    expect(value1).toContain(firstTemplateName || '');
    
    // Go back and select a different template
    await page.goBack();
    await page.click('text=Start with a template');
    
    const secondTemplate = page.locator('[data-testid="template-card"]').nth(1);
    const secondTemplateName = await secondTemplate.locator('[data-testid="template-name"]').textContent();
    await secondTemplate.locator('button:has-text("Use Template")').click();
    
    await page.waitForURL(/\/builder\?step=1/, { timeout: 10000 });
    
    // Verify second template is loaded (not stale data from first)
    const nameInput2 = page.locator('input[placeholder*="name"]');
    const value2 = await nameInput2.inputValue();
    expect(value2).toContain(secondTemplateName || '');
    expect(value2).not.toBe(value1); // Should be different
  });

  test('should show template source indicator in builder', async ({ page }) => {
    await page.click('text=Start with a template');
    
    const templateCard = page.locator('[data-testid="template-card"]').first();
    const templateName = await templateCard.locator('[data-testid="template-name"]').textContent();
    await templateCard.locator('button:has-text("Use Template")').click();
    
    await page.waitForURL(/\/builder\?step=1/, { timeout: 10000 });
    
    // Should show "Started from template" badge
    await expect(page.locator('text=Started from template')).toBeVisible();
    
    // Badge should show template name
    await expect(page.locator(`text=${templateName}`)).toBeVisible();
  });

  test('should preserve template metadata through builder steps', async ({ page }) => {
    await page.click('text=Start with a template');
    
    const templateCard = page.locator('[data-testid="template-card"]').first();
    await templateCard.locator('button:has-text("Use Template")').click();
    
    await page.waitForURL(/\/builder\?step=1/, { timeout: 10000 });
    
    // Navigate through all steps
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    
    // On step 5, template indicator should still be visible
    await expect(page.locator('text=Template')).toBeVisible();
  });

  test('should load template from URL parameter', async ({ page }) => {
    // Navigate directly to builder with templateId parameter
    await page.goto('/builder?templateId=retail_inventory_optimization&step=1');
    
    await page.waitForLoadState('networkidle');
    
    // Should load the template (not a blank draft)
    // Check for template-specific content
    const nameInput = page.locator('input[placeholder*="name"]');
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    
    // The name field should be populated with template data, not "Untitled Agent"
    const nameValue = await nameInput.inputValue();
    expect(nameValue).not.toBe('');
    expect(nameValue).not.toContain('Untitled');
    
    // Should show "Started from template" indicator
    await expect(page.locator('text=Started from template')).toBeVisible({ timeout: 5000 });
  });
});
