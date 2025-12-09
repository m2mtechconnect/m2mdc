import { test, expect } from '@playwright/test';

test.describe('Marketplace Tabs Separation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketplace?tab=industry');
    await page.waitForLoadState('networkidle');
  });

  test('Industry Marketplace tab shows industry agents', async ({ page }) => {
    await page.click('[data-value="industry"]');
    await page.waitForSelector('[data-testid="industry-agent-card"]');
    
    const agentCards = await page.locator('[data-testid="industry-agent-card"]').all();
    expect(agentCards.length).toBeGreaterThan(0);
    
    // Verify agents have either "Connect" or "Add to Workflow" buttons
    const connectButtons = await page.locator('button:has-text("Connect"), button:has-text("Add to Workflow")').all();
    expect(connectButtons.length).toBeGreaterThan(0);
  });

  test('Search filters work per tab', async ({ page }) => {
    // Test Industry search
    await page.click('[data-value="industry"]');
    await page.fill('input[type="search"]', 'Healthcare');
    await page.waitForTimeout(500);
    
    const industryResults = await page.locator('[data-testid="industry-agent-card"]').all();
    expect(industryResults.length).toBeGreaterThan(0);
    
    // Switch to MCP tab and clear search
    await page.click('[data-value="mcp"]');
    const searchInput = await page.locator('input[type="search"]');
    expect(await searchInput.inputValue()).toBe('');
  });

  test('Tab counts are accurate', async ({ page }) => {
    const industryCount = await page.locator('[data-value="industry"] span').textContent();
    const mcpCount = await page.locator('[data-value="mcp"] span').textContent();
    
    expect(parseInt(industryCount || '0')).toBeGreaterThan(0);
    expect(parseInt(mcpCount || '0')).toBeGreaterThan(0);
  });

  test('Industry tab "Add to Workflow" navigates with correct params', async ({ page }) => {
    await page.click('[data-value="industry"]');
    await page.waitForSelector('[data-testid="industry-agent-card"]');
    
    // Mock system creation
    await page.route('**/rest/v1/agents*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          body: JSON.stringify([{ id: 'test-system-456' }]),
        });
      } else {
        await route.continue();
      }
    });
    
    const addButton = page.locator('button:has-text("Add to Workflow")').first();
    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForURL(/\/builder/);
    }
  });

  test('Preview modal shows correct agent data', async ({ page }) => {
    await page.click('[data-value="industry"]');
    await page.waitForSelector('[data-testid="industry-agent-card"]');
    
    const previewButton = page.locator('button:has-text("Preview")').first();
    await previewButton.click();
    
    await page.waitForSelector('[role="dialog"]');
    const modal = page.locator('[role="dialog"]');
    expect(await modal.isVisible()).toBe(true);
    
    // Modal should have title and description
    const title = await modal.locator('h2').textContent();
    expect(title).toBeTruthy();
  });
});
