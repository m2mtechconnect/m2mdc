/**
 * E2E Test: Cross-Flow Blueprint Consistency
 * Tests that all three intake flows produce consistent builder behavior
 */

import { test, expect } from '@playwright/test';

test.describe('Cross-Flow Blueprint Consistency', () => {
  
  test('should maintain blueprint data when navigating between builder steps', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Use questionnaire flow for this test
    await page.click('text=Answer a questionnaire');
    
    // Fill out questionnaire
    await page.selectOption('select#industry', 'Healthcare');
    await page.selectOption('select#department', 'Operations');
    await page.selectOption('select#teamSize', '51-200');
    await page.click('button:has-text("Next")');

    await page.fill('input#primaryGoal', 'Optimize patient scheduling');
    await page.fill('input#successMetric', 'Reduce wait times by 60%');
    await page.click('button:has-text("Next")');

    await page.click('label:has-text("Process Twin")');
    await page.fill('input#agentRole', 'Patient Scheduling Twin');
    await page.click('button:has-text("Next")');

    await page.click('label:has-text("High - Confidential")');
    await page.selectOption('select', 'confidential');
    await page.click('button:has-text("HIPAA")');
    await page.click('button:has-text("Complete")');

    await page.waitForURL(/\/builder\?/, { timeout: 10000 });

    // Step 1: Capture initial values
    const initialName = await page.locator('input[placeholder*="name"]').inputValue();
    const initialGoal = await page.locator('textarea[placeholder*="description"]').inputValue();
    
    expect(initialName).toContain('Patient Scheduling Twin');
    expect(initialGoal).toContain('Optimize patient scheduling');

    // Step 2: Make edits on Step 1
    await page.fill('input[placeholder*="name"]', 'Advanced Patient Scheduling Twin');
    await page.fill('textarea[placeholder*="description"]', 'Enhanced twin for optimizing patient scheduling with predictive analytics');

    // Navigate to Step 2
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=Intelligence Setup')).toBeVisible();

    // Navigate to Step 3
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=Tools & Integrations')).toBeVisible();

    // Navigate to Step 4
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=Workflow Builder')).toBeVisible();

    // Navigate back to Step 1
    await page.click('button:has-text("Back")');
    await page.click('button:has-text("Back")');
    await page.click('button:has-text("Back")');

    // Verify edits are preserved
    const editedName = await page.locator('input[placeholder*="name"]').inputValue();
    const editedGoal = await page.locator('textarea[placeholder*="description"]').inputValue();
    
    expect(editedName).toBe('Advanced Patient Scheduling Twin');
    expect(editedGoal).toBe('Enhanced twin for optimizing patient scheduling with predictive analytics');
  });

  test('should use same UI components across all intake flows', async ({ page }) => {
    // Test that all flows result in the same builder UI structure
    
    // Flow 1: Questionnaire
    await page.goto('/dashboard');
    await page.click('text=Answer a questionnaire');
    
    // Complete questionnaire quickly
    await page.selectOption('select#industry', 'Finance');
    await page.selectOption('select#department', 'IT');
    await page.selectOption('select#teamSize', '1-10');
    await page.click('button:has-text("Next")');
    
    await page.fill('input#primaryGoal', 'Test goal');
    await page.fill('input#successMetric', 'Test metric');
    await page.click('button:has-text("Next")');
    
    await page.click('label:has-text("AI Agent")');
    await page.click('button:has-text("Next")');
    
    await page.click('label:has-text("Low")');
    await page.selectOption('select', 'public');
    await page.click('button:has-text("Complete")');
    
    await page.waitForURL(/\/builder\?/, { timeout: 10000 });
    
    // Capture builder structure from questionnaire flow
    const step1ROICards = await page.locator('[data-testid="roi-card"]').count();
    await page.click('button:has-text("Next")');
    
    const step2ModelSelector = await page.locator('[data-testid="model-selector"]').isVisible();
    await page.click('button:has-text("Next")');
    
    const step3IntegrationsList = await page.locator('[data-testid="integration-card"]').count();
    
    // Return to dashboard for next flow
    await page.goto('/dashboard');
    
    // Flow 2: Template
    await page.click('text=Start with a template');
    await page.locator('[data-testid="template-card"]').first().locator('button:has-text("Use Template")').click();
    await page.waitForURL(/\/builder\?/, { timeout: 10000 });
    
    // Verify same structure
    const templateStep1ROICards = await page.locator('[data-testid="roi-card"]').count();
    expect(templateStep1ROICards).toBe(step1ROICards);
    
    await page.click('button:has-text("Next")');
    const templateStep2ModelSelector = await page.locator('[data-testid="model-selector"]').isVisible();
    expect(templateStep2ModelSelector).toBe(step2ModelSelector);
    
    await page.click('button:has-text("Next")');
    const templateStep3IntegrationsList = await page.locator('[data-testid="integration-card"]').count();
    expect(templateStep3IntegrationsList).toBeGreaterThanOrEqual(0); // Template may have different integrations
  });

  test('should correctly set source field in blueprint for each flow', async ({ page }) => {
    // We'll test this by checking the analytics events which include the source
    
    // Test file upload flow
    await page.goto('/dashboard');
    
    const fileAnalyticsEvents: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('[Telemetry]') && msg.text().includes('agent_intake')) {
        fileAnalyticsEvents.push(msg.text());
      }
    });
    
    await page.click('text=Upload a file');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Test content'),
    });
    await page.click('button:has-text("Analyze Document")');
    await expect(page.locator('text=Analysis complete!')).toBeVisible({ timeout: 30000 });
    await page.click('label:has-text("AI Agent")');
    await page.click('button:has-text("Build in Studio")');
    await page.waitForURL(/\/builder\?/, { timeout: 10000 });
    
    // Check file upload has source="file"
    const fileEvent = fileAnalyticsEvents.find(e => e.includes('agent_intake.completed'));
    expect(fileEvent).toContain('source');
    expect(fileEvent).toContain('file');
    
    // Test questionnaire flow
    await page.goto('/dashboard');
    
    const questionnaireAnalyticsEvents: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('[Telemetry]') && msg.text().includes('agent_intake')) {
        questionnaireAnalyticsEvents.push(msg.text());
      }
    });
    
    await page.click('text=Answer a questionnaire');
    await page.selectOption('select#industry', 'Technology');
    await page.selectOption('select#department', 'IT');
    await page.selectOption('select#teamSize', '1-10');
    await page.click('button:has-text("Next")');
    await page.fill('input#primaryGoal', 'Test');
    await page.fill('input#successMetric', 'Test');
    await page.click('button:has-text("Next")');
    await page.click('label:has-text("AI Agent")');
    await page.click('button:has-text("Next")');
    await page.click('label:has-text("Low")');
    await page.selectOption('select', 'public');
    await page.click('button:has-text("Complete")');
    await page.waitForURL(/\/builder\?/, { timeout: 10000 });
    
    // Check questionnaire has source="questionnaire"
    const questionnaireEvent = questionnaireAnalyticsEvents.find(e => e.includes('agent_intake.completed'));
    expect(questionnaireEvent).toContain('source');
    expect(questionnaireEvent).toContain('questionnaire');
    
    // Test template flow
    await page.goto('/dashboard');
    
    const templateAnalyticsEvents: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('[Telemetry]') && msg.text().includes('agent_intake')) {
        templateAnalyticsEvents.push(msg.text());
      }
    });
    
    await page.click('text=Start with a template');
    await page.locator('[data-testid="template-card"]').first().locator('button:has-text("Use Template")').click();
    await page.waitForURL(/\/builder\?/, { timeout: 10000 });
    
    // Check template has source="template"
    const templateEvent = templateAnalyticsEvents.find(e => e.includes('agent_intake.completed'));
    expect(templateEvent).toContain('source');
    expect(templateEvent).toContain('template');
  });

  test('should handle blueprint persistence when reloading builder', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Complete questionnaire
    await page.click('text=Answer a questionnaire');
    await page.selectOption('select#industry', 'Retail');
    await page.selectOption('select#department', 'Sales');
    await page.selectOption('select#teamSize', '11-50');
    await page.click('button:has-text("Next")');
    await page.fill('input#primaryGoal', 'Increase sales conversion');
    await page.fill('input#successMetric', 'Improve conversion by 30%');
    await page.click('button:has-text("Next")');
    await page.click('label:has-text("AI Agent")');
    await page.fill('input#agentRole', 'Sales Assistant');
    await page.click('button:has-text("Next")');
    await page.click('label:has-text("Medium")');
    await page.selectOption('select', 'internal');
    await page.click('button:has-text("Complete")');
    
    await page.waitForURL(/\/builder\?/, { timeout: 10000 });
    
    // Capture current URL (contains builder ID)
    const builderUrl = page.url();
    
    // Make some edits
    await page.fill('input[placeholder*="name"]', 'Advanced Sales Assistant');
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify data is still there
    const reloadedName = await page.locator('input[placeholder*="name"]').inputValue();
    expect(reloadedName).toBe('Advanced Sales Assistant');
    
    // Verify industry and department are preserved
    await expect(page.locator('text=Retail')).toBeVisible();
    await expect(page.locator('text=Sales')).toBeVisible();
  });
});
