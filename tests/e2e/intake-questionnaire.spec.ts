/**
 * E2E Test: Questionnaire → Blueprint → Builder
 * Tests the complete flow from answering questionnaire to builder opening
 */

import { test, expect } from '@playwright/test';

test.describe('Questionnaire Intake Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should complete questionnaire and open builder with blueprint', async ({ page }) => {
    // Step 1: Click "Answer a questionnaire"
    await page.click('text=Answer a questionnaire');
    
    // Verify wizard opens
    await expect(page.locator('text=Configure Your AI Agent')).toBeVisible();
    await expect(page.locator('text=Step 1 of 4')).toBeVisible();

    // Step 2: Fill out business context (Step 1)
    await expect(page.locator('text=Business Context')).toBeVisible();
    
    await page.selectOption('select#industry', 'Technology');
    await page.selectOption('select#department', 'Customer Support');
    await page.selectOption('select#teamSize', '11-50');
    
    // Select some tools
    await page.click('button:has-text("Slack")');
    await page.click('button:has-text("Salesforce")');
    
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=Step 2 of 4')).toBeVisible();

    // Step 3: Fill out primary goal (Step 2)
    await expect(page.locator('text=Primary Goal')).toBeVisible();
    
    await page.fill('input#primaryGoal', 'Automate customer support responses');
    await page.fill('textarea#specificChallenge', 'High volume of repetitive support tickets');
    await page.fill('input#successMetric', 'Reduce response time by 50%');
    
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=Step 3 of 4')).toBeVisible();

    // Step 4: Select agent type (Step 3)
    await expect(page.locator('text=Agent Type')).toBeVisible();
    
    await page.click('label:has-text("AI Agent")');
    await page.fill('input#agentRole', 'Customer Success Assistant');
    
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=Step 4 of 4')).toBeVisible();

    // Step 5: Configure risk & safety (Step 4)
    await expect(page.locator('text=Risk & Safety')).toBeVisible();
    
    await page.click('label:has-text("Medium - Internal business data")');
    await page.selectOption('select', 'internal');
    
    // Select compliance requirements
    await page.click('button:has-text("GDPR")');
    await page.click('button:has-text("SOC 2")');
    
    await page.click('button:has-text("Complete")');

    // Step 6: Verify builder opens with pre-filled data
    await page.waitForURL(/\/builder\?/, { timeout: 10000 });
    
    // Verify Step 1 data
    await expect(page.locator('input[value*="Customer Success Assistant"]')).toBeVisible();
    await expect(page.locator('textarea[value*="Automate customer support responses"]')).toBeVisible();
    
    // Check industry and department badges
    await expect(page.locator('text=Technology')).toBeVisible();
    await expect(page.locator('text=Customer Support')).toBeVisible();

    // Verify Step 2 has model configuration
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=google/gemini-2.5-flash')).toBeVisible();
    
    // System prompt should be populated
    const systemPrompt = page.locator('textarea[placeholder*="system prompt"]');
    await expect(systemPrompt).not.toBeEmpty();

    // Verify Step 3 has selected integrations
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=Slack')).toBeVisible();
    await expect(page.locator('text=Salesforce')).toBeVisible();

    // Verify Step 4 has workflow
    await page.click('button:has-text("Next")');
    const workflowNodes = page.locator('[data-testid="workflow-node"]');
    await expect(workflowNodes).toHaveCount({ min: 1 });
  });

  test('should validate required fields', async ({ page }) => {
    await page.click('text=Answer a questionnaire');
    
    // Try to proceed without filling required fields
    const nextButton = page.locator('button:has-text("Next")');
    await expect(nextButton).toBeDisabled();

    // Fill industry only
    await page.selectOption('select#industry', 'Finance');
    await expect(nextButton).toBeDisabled();

    // Fill department
    await page.selectOption('select#department', 'IT');
    await expect(nextButton).toBeDisabled();

    // Fill team size - now should be enabled
    await page.selectOption('select#teamSize', '1-10');
    await expect(nextButton).toBeEnabled();
  });

  test('should allow navigation back and forth', async ({ page }) => {
    await page.click('text=Answer a questionnaire');
    
    // Fill Step 1
    await page.selectOption('select#industry', 'Healthcare');
    await page.selectOption('select#department', 'Operations');
    await page.selectOption('select#teamSize', '51-200');
    await page.click('button:has-text("Next")');

    // Go to Step 2, then back
    await expect(page.locator('text=Step 2 of 4')).toBeVisible();
    await page.click('button:has-text("Back")');
    
    // Verify Step 1 data is preserved
    await expect(page.locator('text=Step 1 of 4')).toBeVisible();
    await expect(page.locator('select#industry')).toHaveValue('Healthcare');
    await expect(page.locator('select#department')).toHaveValue('Operations');
    
    // Go forward again
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=Step 2 of 4')).toBeVisible();
  });

  test('should track step progression analytics', async ({ page }) => {
    const analyticsEvents: any[] = [];
    await page.on('console', msg => {
      if (msg.text().includes('[Telemetry]') && msg.text().includes('agent_intake.step_progress')) {
        analyticsEvents.push(msg.text());
      }
    });

    await page.click('text=Answer a questionnaire');
    
    // Complete all steps
    await page.selectOption('select#industry', 'Finance');
    await page.selectOption('select#department', 'IT');
    await page.selectOption('select#teamSize', '1-10');
    await page.click('button:has-text("Next")');

    await page.fill('input#primaryGoal', 'Streamline IT requests');
    await page.fill('input#successMetric', 'Reduce ticket resolution time');
    await page.click('button:has-text("Next")');

    await page.click('label:has-text("AI Agent")');
    await page.click('button:has-text("Next")');

    await page.click('label:has-text("Low - General information")');
    await page.selectOption('select', 'public');
    await page.click('button:has-text("Complete")');

    // Wait for builder to open
    await page.waitForURL(/\/builder\?/, { timeout: 10000 });

    // Verify step progression events fired
    expect(analyticsEvents.length).toBeGreaterThanOrEqual(3);
    expect(analyticsEvents.some(e => e.includes('step_1'))).toBeTruthy();
    expect(analyticsEvents.some(e => e.includes('step_2'))).toBeTruthy();
    expect(analyticsEvents.some(e => e.includes('step_3'))).toBeTruthy();
  });

  test('should handle different agent types correctly', async ({ page }) => {
    await page.click('text=Answer a questionnaire');
    
    // Fill minimal required fields
    await page.selectOption('select#industry', 'Retail');
    await page.selectOption('select#department', 'Operations');
    await page.selectOption('select#teamSize', '51-200');
    await page.click('button:has-text("Next")');

    await page.fill('input#primaryGoal', 'Optimize inventory');
    await page.fill('input#successMetric', 'Improve accuracy by 75%');
    await page.click('button:has-text("Next")');

    // Select Process Twin
    await page.click('label:has-text("Process Twin")');
    await page.fill('input#agentRole', 'Inventory Optimization Twin');
    await page.click('button:has-text("Next")');

    await page.click('label:has-text("High - Confidential")');
    await page.selectOption('select', 'confidential');
    await page.click('button:has-text("Complete")');

    await page.waitForURL(/\/builder\?/, { timeout: 10000 });

    // Verify process twin specific configuration
    await expect(page.locator('text=Inventory Optimization Twin')).toBeVisible();
    
    // Check that temperature is lower for process twin (Step 2)
    await page.click('button:has-text("Next")');
    // Process twins should have temperature around 0.3, agents around 0.7
    const temperatureInput = page.locator('input[type="range"]');
    const tempValue = await temperatureInput.getAttribute('value');
    expect(parseFloat(tempValue || '0')).toBeLessThan(0.5);
  });
});
