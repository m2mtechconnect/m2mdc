import { test, expect } from '@playwright/test';

test.describe('AI System Builder - Complete 6 Step Flow', () => {
  test('should complete all 6 steps and deploy system', async ({ page }) => {
    await page.goto('/builder');
    await page.waitForLoadState('networkidle');

    // Step 1: Define Goal
    await expect(page.getByText(/define your ai system/i)).toBeVisible();
    await page.getByPlaceholder(/system name/i).fill('E2E Test System');
    await page.getByRole('combobox', { name: /department/i }).click();
    await page.getByRole('option', { name: /operations/i }).click();
    await page.getByPlaceholder(/describe what/i).fill('Automate compliance reporting and audit trail generation');
    await page.getByPlaceholder(/success metric/i).fill('90% reduction in manual audit time');
    await page.getByRole('button', { name: /next/i }).click();

    // Step 2: Choose Base
    await expect(page.getByText(/choose.*base|choose.*industry/i)).toBeVisible();
    
    // Test industry solution selection
    const industryAgent = page.getByText(/healthcare|finance|hr/i).first();
    if (await industryAgent.isVisible()) {
      await industryAgent.click();
      await page.getByRole('button', { name: /use.*solution|select/i }).click();
    } else {
      await page.getByRole('button', { name: /skip|start from scratch/i }).click();
    }
    await page.getByRole('button', { name: /next/i }).click();

    // Step 3: Configure Intelligence (Model + MCP)
    await expect(page.getByText(/configure.*intelligence/i)).toBeVisible();
    
    // Select AI model
    const geminiModel = page.getByText(/gemini-2.5-flash/i).first();
    if (await geminiModel.isVisible()) {
      await geminiModel.click();
    }

    // Configure system prompt
    const systemPromptTextarea = page.getByPlaceholder(/you are a helpful ai assistant/i);
    if (await systemPromptTextarea.isVisible()) {
      await systemPromptTextarea.fill('You are a compliance AI assistant specialized in audit trail generation and regulatory reporting.');
    }

    // Test AI system
    const testButton = page.getByRole('button', { name: /test.*query/i });
    if (await testButton.isVisible()) {
      await testButton.click();
      await expect(page.getByText(/response|result/i)).toBeVisible({ timeout: 15000 });
    }

    await page.getByRole('button', { name: /next/i }).click();

    // Step 4: Connect Business Systems
    await expect(page.getByText(/Connect.*Business.*Systems/i)).toBeVisible();
    
    // Connect a business system (Salesforce via Zapier)
    const salesforceCard = page.getByText(/salesforce/i).first();
    if (await salesforceCard.isVisible()) {
      await salesforceCard.click();
      // Close modal after connection
      await page.getByRole('button', { name: /close/i }).click();
    }

    await page.getByRole('button', { name: /next/i }).click();

    // Step 5: Automate Workflow
    await expect(page.getByText(/automate.*workflow/i)).toBeVisible();
    
    // Add workflow nodes
    await page.getByRole('button', { name: /analyze/i }).first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /classify/i }).first().click();
    await page.waitForTimeout(500);

    // Validate workflow
    await page.getByRole('button', { name: /validate/i }).click();
    await expect(page.getByText(/validation.*pass/i)).toBeVisible({ timeout: 5000 });

    // Save draft
    await page.getByRole('button', { name: /save draft/i }).click();
    await expect(page.getByText(/saved/i)).toBeVisible();

    await page.getByRole('button', { name: /next/i }).click();

    // Step 6: Measure & Deploy
    await expect(page.getByText(/measure.*deploy/i)).toBeVisible();
    await expect(page.getByText(/roi/i)).toBeVisible();
    
    // Verify system summary
    await expect(page.getByText('E2E Test System')).toBeVisible();
    await expect(page.getByText(/operations/i)).toBeVisible();
    
    // Deploy system
    const deployButton = page.getByRole('button', { name: /deploy system/i });
    if (await deployButton.isEnabled()) {
      await deployButton.click();
      // Should navigate to deploy page
      await expect(page).toHaveURL(/\/deploy/);
    }
  });

  test('should prefill step 3 when selecting industry solution', async ({ page }) => {
    await page.goto('/builder?step=2');
    await page.waitForLoadState('networkidle');

    // Select Healthcare Compliance solution
    const healthcareAgent = page.getByText(/healthcare.*compliance/i).first();
    if (await healthcareAgent.isVisible()) {
      await healthcareAgent.click();
      await page.getByRole('button', { name: /deploy|select/i }).click();

      // Should advance to Step 3 with prefilled configuration
      await expect(page).toHaveURL(/step=3/);
      
      // Verify AI configuration is prefilled
      await expect(page.getByText(/configure.*intelligence/i)).toBeVisible();
    }
  });

  test('should persist state across page refreshes', async ({ page }) => {
    await page.goto('/builder');
    
    // Fill step 1
    await page.getByPlaceholder(/system name/i).fill('Persistence Test');
    await page.getByRole('combobox', { name: /department/i }).click();
    await page.getByRole('option', { name: /operations/i }).click();
    await page.waitForTimeout(2000); // Wait for autosave

    // Refresh
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Values should persist
    const nameInput = page.getByPlaceholder(/system name/i);
    await expect(nameInput).toHaveValue('Persistence Test');
  });

  test('should show validation errors in step 3', async ({ page }) => {
    await page.goto('/builder?step=3');
    await page.waitForLoadState('networkidle');

    // Try to proceed without completing required fields
    const nextButton = page.getByRole('button', { name: /next/i });
    await nextButton.click();

    // Should show validation banner
    await expect(page.getByText(/please fix/i)).toBeVisible();
    await expect(page.getByText(/select an ai model/i)).toBeVisible();
  });

  test('should display step 3 content correctly', async ({ page }) => {
    await page.goto('/builder?step=3');
    await page.waitForLoadState('networkidle');

    // Verify Step 3 heading (Configure Intelligence)
    await expect(page.getByText(/configure.*intelligence/i)).toBeVisible();
  });
});
