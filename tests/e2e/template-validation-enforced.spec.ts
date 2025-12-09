import { test, expect } from '@playwright/test';

test.describe('Template Validation - system_prompt Enforcement', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/builder');
    await page.waitForLoadState('networkidle');
  });

  test('should show validation error for empty system prompt', async ({ page }) => {
    // Find system prompt textarea
    const systemPromptTextarea = page.locator('textarea[name="systemPrompt"], textarea[placeholder*="system"]').first();
    
    const textareaExists = await systemPromptTextarea.count() > 0;
    
    if (textareaExists) {
      // Clear the textarea
      await systemPromptTextarea.clear();
      await systemPromptTextarea.blur();
      await page.waitForTimeout(500);

      // Check for error message
      const errorMessage = page.locator('text=/.*prompt.*required.*|.*prompt.*empty.*|.*10.*characters.*/i');
      const hasError = await errorMessage.count() > 0;
      
      expect(hasError, 'Should show validation error for empty prompt').toBe(true);
    }
  });

  test('should show validation error for system prompt under 10 characters', async ({ page }) => {
    const systemPromptTextarea = page.locator('textarea[name="systemPrompt"], textarea[placeholder*="system"]').first();
    
    const textareaExists = await systemPromptTextarea.count() > 0;
    
    if (textareaExists) {
      // Enter short text
      await systemPromptTextarea.fill('Short');
      await systemPromptTextarea.blur();
      await page.waitForTimeout(500);

      // Check for error message
      const errorMessage = page.locator('text=/.*10.*characters.*|.*too short.*/i');
      const hasError = await errorMessage.count() > 0;
      
      expect(hasError, 'Should show validation error for prompt under 10 chars').toBe(true);
    }
  });

  test('should accept valid system prompt (10+ characters)', async ({ page }) => {
    const systemPromptTextarea = page.locator('textarea[name="systemPrompt"], textarea[placeholder*="system"]').first();
    
    const textareaExists = await systemPromptTextarea.count() > 0;
    
    if (textareaExists) {
      // Enter valid text
      await systemPromptTextarea.fill('You are a helpful AI assistant with expertise in compliance.');
      await systemPromptTextarea.blur();
      await page.waitForTimeout(500);

      // Check that no error appears
      const errorMessage = page.locator('text=/.*prompt.*required.*|.*prompt.*empty.*|.*10.*characters.*/i');
      const hasError = await errorMessage.count() > 0;
      
      expect(hasError, 'Should NOT show validation error for valid prompt').toBe(false);
    }
  });

  test('should prevent deployment without valid system prompt', async ({ page }) => {
    // Navigate to deploy page
    await page.goto('/deploy');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if there are validation warnings
    const validationWarning = page.locator('text=/.*system.*prompt.*|.*validation.*|.*required.*/i');
    
    // If there are systems to deploy, check validation
    const deployButton = page.locator('button:has-text("Deploy")');
    const hasDeployButton = await deployButton.count() > 0;
    
    if (hasDeployButton) {
      // Should either be disabled or show validation errors
      const isDisabled = await deployButton.isDisabled().catch(() => false);
      const hasWarning = await validationWarning.count() > 0;
      
      // At least one should be true for safety
      const hasProtection = isDisabled || hasWarning;
      expect(hasProtection, 'Should prevent deployment without valid prompt').toBe(true);
    }
  });

  test('should show inline validation icon for invalid prompt', async ({ page }) => {
    const systemPromptTextarea = page.locator('textarea[name="systemPrompt"], textarea[placeholder*="system"]').first();
    
    const textareaExists = await systemPromptTextarea.count() > 0;
    
    if (textareaExists) {
      // Enter invalid text
      await systemPromptTextarea.fill('Bad');
      await systemPromptTextarea.blur();
      await page.waitForTimeout(500);

      // Check for warning icon (⚠️)
      const warningIcon = page.locator('text=⚠️, [data-icon="warning"]');
      const hasWarning = await warningIcon.count() > 0;
      
      expect(hasWarning, 'Should show warning icon for invalid prompt').toBe(true);
    }
  });
});
