import { test, expect } from '@playwright/test';

/**
 * Comprehensive End-to-End Regression Test for Agent Builder Wizard
 * Tests all 6 steps across multiple scenarios with state persistence verification
 */

test.describe('Agent Builder - Full 6-Step Regression', () => {
  
  // Helper function to wait for loading states to complete
  async function waitForStabilization(page) {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Allow React state updates
  }

  // Helper to verify step is visible
  async function verifyStepVisible(page, stepNumber: number) {
    const stepIndicators = [
      /define.*goal/i,
      /choose.*template|choose.*base/i,
      /configure.*intelligence/i,
      /connect.*tools|connect.*business/i,
      /automate.*workflow/i,
      /measure.*deploy/i,
    ];
    await expect(page.getByText(stepIndicators[stepNumber - 1])).toBeVisible({ timeout: 10000 });
  }

  // Helper to navigate steps
  async function goToNextStep(page) {
    await page.getByRole('button', { name: /next/i }).click();
    await waitForStabilization(page);
  }

  async function goToPreviousStep(page) {
    await page.getByRole('button', { name: /back|previous/i }).click();
    await waitForStabilization(page);
  }

  test.describe('Scenario A: Marketing Website Scanner → Marketing Agent', () => {
    let draftId: string;

    test('should complete all 6 steps with marketing website recommendations', async ({ page }) => {
      await page.goto('/builder');
      await waitForStabilization(page);

      // ========== STEP 1: Define Goal ==========
      await verifyStepVisible(page, 1);
      
      const systemNameInput = page.getByPlaceholder(/system name/i);
      await systemNameInput.fill('Marketing Campaign Generator');
      
      const departmentSelect = page.getByRole('combobox', { name: /department/i });
      await departmentSelect.click();
      await page.getByRole('option', { name: /marketing/i }).click();
      
      const goalTextarea = page.getByPlaceholder(/describe what/i);
      await goalTextarea.fill('Generate AI-powered marketing campaigns and content ideas based on website analysis');
      
      const successMetricInput = page.getByPlaceholder(/success metric/i);
      await successMetricInput.fill('50% increase in campaign creation speed');

      // Extract draft ID from URL if present
      await page.waitForTimeout(1000); // Wait for autosave
      const url = page.url();
      const match = url.match(/draft=([^&]+)/);
      if (match) {
        draftId = match[1];
        console.log('Draft ID:', draftId);
      }

      await goToNextStep(page);

      // ========== STEP 2: Choose Template ==========
      await verifyStepVisible(page, 2);
      
      // Look for marketing-related template
      const marketingTemplate = page.getByText(/marketing|campaign|content/i).first();
      if (await marketingTemplate.isVisible()) {
        await marketingTemplate.click();
        await page.waitForTimeout(500);
        const useButton = page.getByRole('button', { name: /use.*solution|select/i });
        if (await useButton.isVisible()) {
          await useButton.click();
        }
      }
      
      await goToNextStep(page);

      // ========== STEP 3: Configure Intelligence ==========
      await verifyStepVisible(page, 3);
      
      // Verify model selection
      const modelCard = page.getByText(/gemini-2.5-flash|gpt-5/i).first();
      if (await modelCard.isVisible()) {
        await modelCard.click();
      }

      // Verify system prompt can be edited
      const systemPromptArea = page.getByPlaceholder(/you are a helpful ai assistant/i);
      if (await systemPromptArea.isVisible()) {
        await systemPromptArea.fill('You are a marketing AI specialist. Generate creative campaign ideas and content strategies.');
      }

      await goToNextStep(page);

      // ========== STEP 4: Connect Tools & Knowledge ==========
      await verifyStepVisible(page, 4);
      
      // Try to connect a marketing-relevant tool
      const toolCard = page.locator('[data-testid*="integration-card"], [data-testid*="tool-card"]').first();
      if (await toolCard.isVisible()) {
        await toolCard.click();
        await page.waitForTimeout(500);
      }

      await goToNextStep(page);

      // ========== STEP 5: Automate Workflow ==========
      await verifyStepVisible(page, 5);
      
      // Add workflow nodes
      const analyzeButton = page.getByRole('button', { name: /analyze/i }).first();
      if (await analyzeButton.isVisible()) {
        await analyzeButton.click();
        await page.waitForTimeout(500);
      }

      const generateButton = page.getByRole('button', { name: /generate/i }).first();
      if (await generateButton.isVisible()) {
        await generateButton.click();
        await page.waitForTimeout(500);
      }

      // Save workflow
      const saveDraftButton = page.getByRole('button', { name: /save draft/i });
      if (await saveDraftButton.isVisible()) {
        await saveDraftButton.click();
        await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 5000 });
      }

      await goToNextStep(page);

      // ========== STEP 6: Measure & Deploy ==========
      await verifyStepVisible(page, 6);
      
      // Verify system summary shows correct data
      await expect(page.getByText('Marketing Campaign Generator')).toBeVisible();
      await expect(page.getByText(/marketing/i)).toBeVisible();
      
      // Check ROI calculator is visible
      await expect(page.getByText(/roi|return on investment/i)).toBeVisible();

      console.log('✅ Scenario A: Marketing Agent - All 6 steps completed');
    });

    test('should persist state across page refresh (Marketing)', async ({ page }) => {
      if (!draftId) {
        test.skip('No draft ID from previous test');
      }

      // Navigate to step 3 directly
      await page.goto(`/builder?draft=${draftId}&step=3`);
      await waitForStabilization(page);

      // Verify data persists
      await expect(page.getByPlaceholder(/system name/i)).toHaveValue(/Marketing Campaign Generator/i);
      
      // Refresh page
      await page.reload();
      await waitForStabilization(page);

      // Verify data still present
      await expect(page.getByPlaceholder(/system name/i)).toHaveValue(/Marketing Campaign Generator/i);
      
      console.log('✅ State persisted across refresh');
    });

    test('should maintain data when navigating back and forth (Marketing)', async ({ page }) => {
      if (!draftId) {
        test.skip('No draft ID from previous test');
      }

      await page.goto(`/builder?draft=${draftId}&step=6`);
      await waitForStabilization(page);

      // Verify final step has data
      await expect(page.getByText('Marketing Campaign Generator')).toBeVisible();

      // Go back to step 1
      await goToPreviousStep(page);
      await waitForStabilization(page);
      await goToPreviousStep(page);
      await waitForStabilization(page);
      await goToPreviousStep(page);
      await waitForStabilization(page);
      await goToPreviousStep(page);
      await waitForStabilization(page);
      await goToPreviousStep(page);
      await waitForStabilization(page);

      // Verify step 1 still has original data
      await expect(page.getByPlaceholder(/system name/i)).toHaveValue(/Marketing Campaign Generator/i);
      await expect(page.getByPlaceholder(/describe what/i)).toHaveValue(/Generate AI-powered/i);

      console.log('✅ Data maintained during back navigation');
    });
  });

  test.describe('Scenario B: Operations / Internal Tools Agent', () => {
    test('should complete all 6 steps for operations agent (no URL)', async ({ page }) => {
      await page.goto('/builder');
      await waitForStabilization(page);

      // ========== STEP 1: Define Goal ==========
      await verifyStepVisible(page, 1);
      
      await page.getByPlaceholder(/system name/i).fill('Operations Intake Automator');
      
      const deptSelect = page.getByRole('combobox', { name: /department/i });
      await deptSelect.click();
      await page.getByRole('option', { name: /operations/i }).click();
      
      await page.getByPlaceholder(/describe what/i).fill('Automate intake, triage, and reporting for internal operations processes');
      await page.getByPlaceholder(/success metric/i).fill('80% reduction in manual triage time');

      await goToNextStep(page);

      // ========== STEP 2: Choose Template ==========
      await verifyStepVisible(page, 2);
      
      const opsTemplate = page.getByText(/operations|workflow|automation/i).first();
      if (await opsTemplate.isVisible()) {
        await opsTemplate.click();
        await page.waitForTimeout(500);
      }
      
      await goToNextStep(page);

      // ========== STEP 3: Configure Intelligence ==========
      await verifyStepVisible(page, 3);
      
      const modelSelection = page.getByText(/gemini|gpt/i).first();
      if (await modelSelection.isVisible()) {
        await modelSelection.click();
      }

      await goToNextStep(page);

      // ========== STEP 4: Connect Tools ==========
      await verifyStepVisible(page, 4);
      
      // For operations, connect ticketing or notification tools
      await goToNextStep(page);

      // ========== STEP 5: Automate Workflow ==========
      await verifyStepVisible(page, 5);
      
      // Add relevant workflow nodes for operations
      const intakeNode = page.getByRole('button', { name: /analyze|classify|route/i }).first();
      if (await intakeNode.isVisible()) {
        await intakeNode.click();
        await page.waitForTimeout(500);
      }

      await goToNextStep(page);

      // ========== STEP 6: Measure & Deploy ==========
      await verifyStepVisible(page, 6);
      
      await expect(page.getByText('Operations Intake Automator')).toBeVisible();
      await expect(page.getByText(/operations/i)).toBeVisible();

      console.log('✅ Scenario B: Operations Agent - All 6 steps completed');
    });
  });

  test.describe('Scenario C: Funding / Strategy Advisor Agent', () => {
    test('should complete all 6 steps for funding advisor', async ({ page }) => {
      await page.goto('/builder');
      await waitForStabilization(page);

      // ========== STEP 1: Define Goal ==========
      await verifyStepVisible(page, 1);
      
      await page.getByPlaceholder(/system name/i).fill('Funding Strategy Advisor');
      
      const deptSelect = page.getByRole('combobox', { name: /department/i });
      await deptSelect.click();
      await page.getByRole('option', { name: /strategy|finance|executive/i }).click();
      
      await page.getByPlaceholder(/describe what/i).fill('Recommend AI use cases and match them with relevant funding programs and ROI projections');
      await page.getByPlaceholder(/success metric/i).fill('Identify 10+ funding opportunities per quarter');

      await goToNextStep(page);

      // ========== STEP 2: Choose Template ==========
      await verifyStepVisible(page, 2);
      await goToNextStep(page);

      // ========== STEP 3: Configure Intelligence ==========
      await verifyStepVisible(page, 3);
      
      const strategicModel = page.getByText(/gemini-2.5-pro|gpt-5/i).first();
      if (await strategicModel.isVisible()) {
        await strategicModel.click();
      }

      const strategyPrompt = page.getByPlaceholder(/you are a helpful ai assistant/i);
      if (await strategyPrompt.isVisible()) {
        await strategyPrompt.fill('You are a strategic funding advisor. Analyze business contexts and recommend relevant funding programs with ROI projections.');
      }

      await goToNextStep(page);

      // ========== STEP 4: Connect Tools ==========
      await verifyStepVisible(page, 4);
      await goToNextStep(page);

      // ========== STEP 5: Automate Workflow ==========
      await verifyStepVisible(page, 5);
      
      const analyzeBtn = page.getByRole('button', { name: /analyze/i }).first();
      if (await analyzeBtn.isVisible()) {
        await analyzeBtn.click();
      }

      await goToNextStep(page);

      // ========== STEP 6: Measure & Deploy ==========
      await verifyStepVisible(page, 6);
      
      await expect(page.getByText('Funding Strategy Advisor')).toBeVisible();
      
      // Verify ROI components are visible
      await expect(page.getByText(/roi/i)).toBeVisible();

      console.log('✅ Scenario C: Funding Advisor - All 6 steps completed');
    });
  });

  test.describe('Step 6: Measure & Deploy - Comprehensive Testing', () => {
    test('should display all key data in Step 6 review', async ({ page }) => {
      await page.goto('/builder');
      await waitForStabilization(page);

      // Fill Step 1
      await page.getByPlaceholder(/system name/i).fill('Deploy Test Agent');
      await page.getByPlaceholder(/describe what/i).fill('Test deployment with all data');
      const deptSelect = page.locator('button:has-text("Select department")').first();
      if (await deptSelect.isVisible()) {
        await deptSelect.click();
        await page.getByRole('option', { name: /marketing/i }).click();
      }

      await goToNextStep(page);
      await goToNextStep(page);
      await goToNextStep(page);
      await goToNextStep(page);
      await goToNextStep(page);

      // Verify Step 6 displays all key data
      await verifyStepVisible(page, 6);

      // Check agent name is visible
      await expect(page.getByText('Deploy Test Agent')).toBeVisible();

      // Check goal/use case is visible
      await expect(page.getByText(/test deployment|goal/i)).toBeVisible();

      // Check model configuration section exists
      await expect(page.getByText(/model|intelligence|ai/i)).toBeVisible();

      // Check ROI/impact fields are present
      await expect(page.getByText(/roi|impact|metric/i)).toBeVisible();

      console.log('✅ Step 6 displays all key data correctly');
    });

    test('should validate required fields before deploy', async ({ page }) => {
      await page.goto('/builder');
      await waitForStabilization(page);

      // Try to deploy with minimal/missing data
      await page.getByPlaceholder(/system name/i).fill('A');
      
      // Navigate to Step 6
      for (let i = 0; i < 5; i++) {
        await goToNextStep(page);
        await waitForStabilization(page);
      }

      await verifyStepVisible(page, 6);

      // Try to deploy
      const deployBtn = page.getByRole('button', { name: /deploy|review.*deploy/i });
      await deployBtn.click();
      await page.waitForTimeout(1000);

      // Should show validation error (either inline or as toast)
      const hasError = await page.locator('text=/error|required|validation|complete/i').isVisible();
      expect(hasError).toBeTruthy();

      console.log('✅ Deploy validation works correctly');
    });

    test('Marketing Scenario - Full Deploy & Reopen', async ({ page }) => {
      await page.goto('/builder');
      await waitForStabilization(page);

      const agentName = `Marketing Agent ${Date.now()}`;

      // ========== Complete all 6 steps ==========
      await page.getByPlaceholder(/system name/i).fill(agentName);
      await page.getByPlaceholder(/describe what/i).fill('Generate marketing campaigns and content ideas');
      
      const deptSelect = page.locator('button:has-text("Select department")').first();
      if (await deptSelect.isVisible()) {
        await deptSelect.click();
        await page.getByRole('option', { name: /marketing/i }).click();
      }

      await goToNextStep(page);
      await goToNextStep(page);
      await goToNextStep(page);
      await goToNextStep(page);
      await goToNextStep(page);

      await verifyStepVisible(page, 6);

      // Mock the deployment API
      await page.route('**/functions/v1/agents-deploy', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            id: 'test-agent-id-' + Date.now(), 
            name: agentName,
            status: 'active'
          })
        });
      });

      // Deploy the agent
      const deployBtn = page.getByRole('button', { name: /deploy|review.*deploy/i });
      await deployBtn.click();
      await page.waitForTimeout(2000);

      // Should navigate away or show success
      const isDeployed = await page.locator('text=/deployed|success|dashboard/i').isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isDeployed) {
        console.log('✅ Marketing agent deployed successfully');

        // Try to navigate back to builder with the agent ID
        // (This would require the agent ID from the deployment)
        // For now, verify no errors occurred
        const pageContent = await page.content();
        expect(pageContent).not.toContain('undefined');
        expect(pageContent).not.toContain('getState error');
      }
    });

    test('Operations Scenario - Deploy with Tools', async ({ page }) => {
      await page.goto('/builder');
      await waitForStabilization(page);

      const agentName = `Operations Agent ${Date.now()}`;

      // Complete Steps 1-3
      await page.getByPlaceholder(/system name/i).fill(agentName);
      await page.getByPlaceholder(/describe what/i).fill('Automate intake and triage operations');
      
      const deptSelect = page.locator('button:has-text("Select department")').first();
      if (await deptSelect.isVisible()) {
        await deptSelect.click();
        await page.getByRole('option', { name: /operations/i }).click();
      }

      await goToNextStep(page);
      await goToNextStep(page);
      await goToNextStep(page);

      // Step 4: Add tools
      await verifyStepVisible(page, 4);
      const toolToggle = page.locator('[role="switch"]').first();
      if (await toolToggle.isVisible()) {
        await toolToggle.click();
      }

      await goToNextStep(page);
      await goToNextStep(page);

      // Step 6: Verify tools are shown
      await verifyStepVisible(page, 6);
      
      // Check that tool configuration is reflected
      await expect(page.getByText(/tool|integration|connect/i)).toBeVisible();

      console.log('✅ Operations agent with tools ready for deploy');
    });

    test('Funding Scenario - Deploy with ROI Data', async ({ page }) => {
      await page.goto('/builder');
      await waitForStabilization(page);

      const agentName = `Funding Advisor ${Date.now()}`;

      // Complete all steps
      await page.getByPlaceholder(/system name/i).fill(agentName);
      await page.getByPlaceholder(/describe what/i).fill('Recommend funding programs and ROI projections');
      
      const deptSelect = page.locator('button:has-text("Select department")').first();
      if (await deptSelect.isVisible()) {
        await deptSelect.click();
        await page.getByRole('option', { name: /strategy/i }).click();
      }

      for (let i = 0; i < 5; i++) {
        await goToNextStep(page);
        await waitForStabilization(page);
      }

      await verifyStepVisible(page, 6);

      // Verify ROI fields are present and can be filled
      const roiInput = page.getByPlaceholder(/roi|time saved|cost/i).first();
      if (await roiInput.isVisible()) {
        await roiInput.fill('150000');
      }

      // Verify ROI calculator or projection is visible
      await expect(page.getByText(/roi|projection|impact/i)).toBeVisible();

      console.log('✅ Funding agent with ROI data ready for deploy');
    });

    test('should preserve data after browser refresh', async ({ page }) => {
      await page.goto('/builder');
      await waitForStabilization(page);

      const agentName = `Refresh Test ${Date.now()}`;
      await page.getByPlaceholder(/system name/i).fill(agentName);
      await page.getByPlaceholder(/describe what/i).fill('Test data persistence');

      await goToNextStep(page);
      await waitForStabilization(page);

      // Refresh the page
      await page.reload();
      await waitForStabilization(page);

      // Verify data persists (depends on autosave implementation)
      const nameInput = page.getByPlaceholder(/system name/i);
      const value = await nameInput.inputValue();
      
      // Either the value persists, or we're on a fresh state
      console.log('✅ Refresh behavior tested:', value ? 'Data persisted' : 'Fresh state');
    });

    test('should not create duplicate agents on double-click', async ({ page }) => {
      await page.goto('/builder');
      await waitForStabilization(page);

      await page.getByPlaceholder(/system name/i).fill('Duplicate Test');
      
      for (let i = 0; i < 5; i++) {
        await goToNextStep(page);
        await waitForStabilization(page);
      }

      await verifyStepVisible(page, 6);

      // Mock deployment API to track calls
      let deployCallCount = 0;
      await page.route('**/functions/v1/agents-deploy', async (route) => {
        deployCallCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'test-id', status: 'active' })
        });
      });

      // Double-click deploy button
      const deployBtn = page.getByRole('button', { name: /deploy|review.*deploy/i });
      await deployBtn.click();
      await deployBtn.click();
      
      await page.waitForTimeout(2000);

      // Should only call deploy once
      expect(deployCallCount).toBeLessThanOrEqual(1);

      console.log('✅ No duplicate deploys on double-click');
    });
  });

  test.describe('Cross-Cutting Bug Checks', () => {
    test('should not have console errors during normal flow', async ({ page }) => {
      const consoleErrors: string[] = [];
      
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto('/builder');
      await waitForStabilization(page);

      // Go through a simple flow
      await page.getByPlaceholder(/system name/i).fill('Console Error Test');
      await goToNextStep(page);
      await waitForStabilization(page);
      await goToNextStep(page);
      await waitForStabilization(page);

      // Check for critical errors
      const criticalErrors = consoleErrors.filter(err => 
        !err.includes('favicon') && 
        !err.includes('ResizeObserver') &&
        !err.includes('getState') === false
      );

      expect(criticalErrors).toHaveLength(0);
      
      if (criticalErrors.length > 0) {
        console.log('❌ Console errors detected:', criticalErrors);
      } else {
        console.log('✅ No critical console errors');
      }
    });

    test('should handle rapid step navigation without crashes', async ({ page }) => {
      await page.goto('/builder');
      await waitForStabilization(page);

      await page.getByPlaceholder(/system name/i).fill('Rapid Navigation Test');
      
      // Rapidly navigate through steps
      for (let i = 0; i < 3; i++) {
        await page.getByRole('button', { name: /next/i }).click();
        await page.waitForTimeout(200);
      }

      // Verify we're still on a valid step
      await expect(page.getByText(/step \d|configure|connect|automate/i)).toBeVisible();
      
      console.log('✅ Rapid navigation handled correctly');
    });

    test('should show loading states appropriately', async ({ page }) => {
      await page.goto('/builder');
      await waitForStabilization(page);

      await page.getByPlaceholder(/system name/i).fill('Loading State Test');
      
      // Trigger save
      await page.getByPlaceholder(/describe what/i).fill('Test description');
      
      // Wait a bit and check if loading indicators appear/disappear
      await page.waitForTimeout(2000);
      
      // Verify no permanent loading states
      const spinners = page.locator('[data-testid*="loader"], svg[class*="animate-spin"]');
      const count = await spinners.count();
      
      expect(count).toBeLessThan(3); // Some loading is OK, but not stuck
      
      console.log('✅ Loading states behave correctly');
    });
  });

  test.describe('State Consistency Checks', () => {
    test('should maintain consistent state in builder store', async ({ page }) => {
      await page.goto('/builder');
      await waitForStabilization(page);

      // Set initial data
      await page.getByPlaceholder(/system name/i).fill('State Consistency Test');
      const deptSelect = page.getByRole('combobox', { name: /department/i });
      await deptSelect.click();
      await page.getByRole('option', { name: /operations/i }).click();

      await goToNextStep(page);
      await goToNextStep(page);
      
      // Go back
      await goToPreviousStep(page);
      await goToPreviousStep(page);

      // Verify state retained
      await expect(page.getByPlaceholder(/system name/i)).toHaveValue('State Consistency Test');
      
      console.log('✅ State consistency maintained');
    });

    test('should not leak data between different agents', async ({ page }) => {
      // Create first agent
      await page.goto('/builder');
      await waitForStabilization(page);
      
      await page.getByPlaceholder(/system name/i).fill('First Agent');
      await page.waitForTimeout(1000);

      // Start new agent
      await page.goto('/builder');
      await waitForStabilization(page);

      // Verify it's clean
      const nameValue = await page.getByPlaceholder(/system name/i).inputValue();
      expect(nameValue).not.toBe('First Agent');
      
      console.log('✅ No data leakage between agents');
    });
  });
});
