import { test, expect } from '@playwright/test';

test.describe('Marketplace - Complete Tab Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');
  });

  test('should show Industry Marketplace as default tab', async ({ page }) => {
    // URL should have tab=industry or be on industry by default
    const url = page.url();
    expect(url).toMatch(/marketplace/);

    // Industry tab should be active
    const industryTab = page.locator('[data-value="industry"]');
    await expect(industryTab).toHaveAttribute('data-state', 'active');

    // Should show industry agent cards
    await expect(page.locator('[data-testid="industry-agent-card"]').first()).toBeVisible();
  });

  test('should display all three tabs: Industry, MCP, Integrations', async ({ page }) => {
    // Check for all tabs
    await expect(page.locator('[data-value="industry"]')).toBeVisible();
    await expect(page.locator('[data-value="mcp"]')).toBeVisible();
    await expect(page.locator('[data-value="integrations"]')).toBeVisible();

    // Should NOT show Templates tab
    const templatesTab = page.locator('[data-value="templates"]');
    expect(await templatesTab.count()).toBe(0);
  });

  test('should redirect /marketplace/templates to /marketplace?tab=industry', async ({ page }) => {
    await page.goto('/marketplace/templates');
    await page.waitForLoadState('networkidle');

    // Should redirect to industry tab
    await expect(page).toHaveURL(/\/marketplace.*tab=industry/, { timeout: 5000 });
  });

  test('should switch between tabs and update URL', async ({ page }) => {
    // Switch to MCP tab
    await page.click('[data-value="mcp"]');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/tab=mcp/);
    await expect(page.locator('[data-testid="mcp-server-card"]').first()).toBeVisible();

    // Switch to Integrations tab
    await page.click('[data-value="integrations"]');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/tab=integrations/);
    await expect(page.locator('[data-testid="integration-card"]').first()).toBeVisible();

    // Switch back to Industry
    await page.click('[data-value="industry"]');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/tab=industry/);
  });

  test('should preserve filters per tab', async ({ page }) => {
    // Apply filter on Industry tab
    await page.click('[data-value="industry"]');
    await page.getByPlaceholder(/search/i).fill('Healthcare');
    await page.waitForTimeout(500);

    // Switch to MCP tab
    await page.click('[data-value="mcp"]');
    await page.waitForTimeout(500);

    // Search should be empty on MCP tab
    const mcpSearch = page.getByPlaceholder(/search/i);
    expect(await mcpSearch.inputValue()).toBe('');

    // Switch back to Industry
    await page.click('[data-value="industry"]');
    await page.waitForTimeout(500);

    // Search should still have 'Healthcare'
    const industrySearch = page.getByPlaceholder(/search/i);
    expect(await industrySearch.inputValue()).toBe('Healthcare');
  });

  test('Industry tab: should show preview with Agent Summary', async ({ page }) => {
    await page.click('[data-value="industry"]');
    await page.waitForLoadState('networkidle');

    const previewButton = page.getByRole('button', { name: /preview/i }).first();
    await previewButton.click();

    // Preview modal should appear
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Should show agent summary with LLM and MCP info
    await expect(modal.getByText(/gemini|gpt|claude/i)).toBeVisible();
    
    // Close
    await page.getByRole('button', { name: /close/i }).click();
  });

  test('Industry tab: Add to Workflow should create system and navigate to builder', async ({ page }) => {
    await page.click('[data-value="industry"]');
    await page.waitForLoadState('networkidle');

    // Mock system creation
    await page.route('**/rest/v1/agents**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          body: JSON.stringify([{ id: 'new-system-789' }])
        });
      } else {
        await route.continue();
      }
    });

    const addButton = page.getByRole('button', { name: /add to workflow/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Should navigate to builder with new system
      await expect(page).toHaveURL(/\/builder\?id=new-system-789/, { timeout: 5000 });
    }
  });

  test('MCP tab: should show MCP server cards', async ({ page }) => {
    await page.click('[data-value="mcp"]');
    await page.waitForLoadState('networkidle');

    // Should show MCP servers
    const mcpCards = page.locator('[data-testid="mcp-server-card"]');
    expect(await mcpCards.count()).toBeGreaterThan(0);

    // Should have install/connect buttons
    await expect(page.getByRole('button', { name: /install|connect/i }).first()).toBeVisible();
  });

  test('Integrations tab: should show Zapier integrations', async ({ page }) => {
    await page.click('[data-value="integrations"]');
    await page.waitForLoadState('networkidle');

    // Should show integration cards
    const integrationCards = page.locator('[data-testid="integration-card"]');
    expect(await integrationCards.count()).toBeGreaterThan(0);

    // Should have connect buttons
    await expect(page.getByRole('button', { name: /connect/i }).first()).toBeVisible();
  });

  test('should display tab counts accurately', async ({ page }) => {
    // Get counts from tabs
    const industryTab = page.locator('[data-value="industry"]');
    const mcpTab = page.locator('[data-value="mcp"]');
    const integrationsTab = page.locator('[data-value="integrations"]');

    const industryText = await industryTab.textContent();
    const mcpText = await mcpTab.textContent();
    const integrationsText = await integrationsTab.textContent();

    // Should have numbers
    expect(industryText).toMatch(/\d+/);
    expect(mcpText).toMatch(/\d+/);
    expect(integrationsText).toMatch(/\d+/);
  });
});
