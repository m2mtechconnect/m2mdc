import { test, expect } from '@playwright/test';

test.describe('Builder 5-Step Wizard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to builder with test data
    await page.goto('/app/builder?step=1');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Step 1 - Summary', () => {
    test('should render summary step components', async ({ page }) => {
      // Check for main heading
      await expect(page.getByRole('heading', { name: /summary|agent|twin/i })).toBeVisible({ timeout: 10000 });
      
      // Check for edit button or summary card
      const editButton = page.getByRole('button', { name: /edit/i });
      const summaryCard = page.locator('[data-testid="summary-card"], .summary-card');
      
      const hasEditButton = await editButton.isVisible().catch(() => false);
      const hasSummaryCard = await summaryCard.isVisible().catch(() => false);
      
      expect(hasEditButton || hasSummaryCard).toBeTruthy();
    });

    test('should allow navigation to next step', async ({ page }) => {
      const nextButton = page.getByRole('button', { name: /next|continue/i });
      
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForLoadState('networkidle');
        
        // Should be on step 2
        await expect(page.getByText(/intelligence|model|llm/i)).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Step 2 - Intelligence', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/app/builder?step=2');
      await page.waitForLoadState('networkidle');
    });

    test('should render intelligence configuration', async ({ page }) => {
      // Check for model selection or intelligence heading
      await expect(page.getByText(/intelligence|model|configuration/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('should have supervisor agent toggle', async ({ page }) => {
      const supervisorToggle = page.getByText(/supervisor/i);
      await expect(supervisorToggle).toBeVisible({ timeout: 5000 });
    });

    test('should have deep research toggle', async ({ page }) => {
      const deepResearchToggle = page.getByText(/deep research|research/i);
      await expect(deepResearchToggle).toBeVisible({ timeout: 5000 });
    });

    test('should have knowledge sources section', async ({ page }) => {
      const knowledgeSection = page.getByText(/knowledge|sources|rag/i);
      await expect(knowledgeSection).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Step 3 - Tools', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/app/builder?step=3');
      await page.waitForLoadState('networkidle');
    });

    test('should render tools step', async ({ page }) => {
      await expect(page.getByText(/tools|integrations|mcp/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('should have integrations tab', async ({ page }) => {
      const integrationsTab = page.getByRole('tab', { name: /integrations/i });
      await expect(integrationsTab).toBeVisible({ timeout: 5000 });
    });

    test('should have MCP servers tab', async ({ page }) => {
      const mcpTab = page.getByRole('tab', { name: /mcp/i });
      await expect(mcpTab).toBeVisible({ timeout: 5000 });
    });

    test('should have API connectors tab', async ({ page }) => {
      const apiTab = page.getByRole('tab', { name: /api/i });
      await expect(apiTab).toBeVisible({ timeout: 5000 });
    });

    test('should show integration connection buttons', async ({ page }) => {
      // Click integrations tab if not active
      const integrationsTab = page.getByRole('tab', { name: /integrations/i });
      await integrationsTab.click();
      
      // Should see connect/disconnect buttons
      const connectButtons = page.getByRole('button', { name: /connect|disconnect/i });
      await expect(connectButtons.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Step 4 - Workflow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/app/builder?step=4');
      await page.waitForLoadState('networkidle');
    });

    test('should render workflow step', async ({ page }) => {
      await expect(page.getByText(/workflow|builder/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('should show workflow statistics', async ({ page }) => {
      // Should show triggers, actions, integrations counts
      await expect(page.getByText(/triggers/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/actions/i)).toBeVisible({ timeout: 5000 });
    });

    test('should have visual editor button', async ({ page }) => {
      const editorButton = page.getByRole('button', { name: /visual|editor|open/i });
      await expect(editorButton).toBeVisible({ timeout: 5000 });
    });

    test('should show available node types', async ({ page }) => {
      // Should list available node types
      const nodeTypes = page.getByText(/analyze|classify|extract|summarize/i);
      await expect(nodeTypes.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Step 5 - Deploy', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/app/builder?step=5');
      await page.waitForLoadState('networkidle');
    });

    test('should render deploy step', async ({ page }) => {
      await expect(page.getByText(/deploy|deployment|readiness/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('should show readiness checklist', async ({ page }) => {
      const checklist = page.getByText(/readiness|checklist/i);
      await expect(checklist).toBeVisible({ timeout: 5000 });
    });

    test('should have overview tab', async ({ page }) => {
      const overviewTab = page.getByRole('tab', { name: /overview/i });
      await expect(overviewTab).toBeVisible({ timeout: 5000 });
    });

    test('should have simulation tab', async ({ page }) => {
      const simulationTab = page.getByRole('tab', { name: /simulation/i });
      await expect(simulationTab).toBeVisible({ timeout: 5000 });
    });

    test('should have version tab', async ({ page }) => {
      const versionTab = page.getByRole('tab', { name: /version/i });
      await expect(versionTab).toBeVisible({ timeout: 5000 });
    });

    test('should have governance tab', async ({ page }) => {
      const governanceTab = page.getByRole('tab', { name: /governance/i });
      await expect(governanceTab).toBeVisible({ timeout: 5000 });
    });

    test('should show deployment environment options', async ({ page }) => {
      // Should show dev, staging, production options
      await expect(page.getByText(/dev|development/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/staging/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/prod|production/i)).toBeVisible({ timeout: 5000 });
    });

    test('should have co-pilot integration', async ({ page }) => {
      // Should show co-pilot quick actions
      const copilotSection = page.getByText(/co-pilot|ask/i);
      await expect(copilotSection).toBeVisible({ timeout: 5000 });
    });

    test('should calculate readiness score', async ({ page }) => {
      // Readiness score or percentage should be visible
      const readinessIndicator = page.locator('[data-testid="readiness-score"], .readiness-score, text=/\\d+%/');
      const hasReadinessIndicator = await readinessIndicator.isVisible().catch(() => false);
      
      // May show as checklist items or score
      const checklistItems = page.locator('[data-testid="checklist-item"], .checklist-item');
      const hasChecklistItems = await checklistItems.count() > 0;
      
      expect(hasReadinessIndicator || hasChecklistItems).toBeTruthy();
    });
  });

  test.describe('Step Navigation', () => {
    test('should navigate through all steps', async ({ page }) => {
      await page.goto('/app/builder?step=1');
      await page.waitForLoadState('networkidle');
      
      // Navigate forward through steps
      for (let step = 1; step <= 4; step++) {
        const nextButton = page.getByRole('button', { name: /next|continue/i });
        
        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(500); // Allow transition
        }
      }
      
      // Should be on step 5
      await expect(page.getByText(/deploy|deployment/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('should allow backward navigation', async ({ page }) => {
      await page.goto('/app/builder?step=3');
      await page.waitForLoadState('networkidle');
      
      const backButton = page.getByRole('button', { name: /back|previous/i });
      
      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForLoadState('networkidle');
        
        // Should be on step 2
        await expect(page.getByText(/intelligence|model/i).first()).toBeVisible({ timeout: 5000 });
      }
    });
  });
});
