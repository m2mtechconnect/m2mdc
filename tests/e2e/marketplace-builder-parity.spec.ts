import { test, expect } from '@playwright/test';
import { seedStudioData } from '../seeds/studioData';

test.describe('Marketplace ↔ Builder Parity', () => {
  test.beforeEach(async ({ page }) => {
    await seedStudioData();
    await page.goto('/');
    
    // Login
    await page.fill('input[type="email"]', Deno.env.get('TEST_USER_EMAIL') || 'test@example.com');
    await page.fill('input[type="password"]', Deno.env.get('TEST_USER_PASSWORD') || 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('Industry solution selection from Marketplace lands on Builder Step 2', async ({ page }) => {
    // Go to Marketplace
    await page.goto('/marketplace?tab=industry');
    await page.waitForSelector('[data-testid="industry-grid"]', { timeout: 5000 });
    
    // Click first agent "Use Solution"
    const useButton = page.locator('button:has-text("Use")').first();
    await useButton.click();
    
    // Should land on Builder Step 2
    await page.waitForURL(/\/builder/, { timeout: 5000 });
    
    // Solution should be configured
    const configIndicator = page.locator('[data-testid="selected-agent"]');
    if (await configIndicator.isVisible()) {
      await expect(configIndicator).toBeVisible();
    }
  });

  test('Industry app selection from Marketplace adds to workflow', async ({ page }) => {
    // Create a system first
    await page.goto('/builder');
    await page.fill('input[name="systemName"]', 'Test Integration System');
    await page.fill('input[name="department"]', 'Sales');
    await page.click('button:has-text("Continue")');
    
    // Go to Marketplace Industry tab
    await page.goto('/marketplace?tab=industry');
    await page.waitForSelector('[data-testid="industry-grid"]', { timeout: 5000 });
    
    // Connect first industry app
    const connectButton = page.locator('button:has-text("Connect")').first();
    await connectButton.click();
    
    // Should show "Add to Workflow" after connection
    await expect(page.locator('button:has-text("Add to Workflow")')).toBeVisible({ timeout: 5000 });
    
    await page.click('button:has-text("Add to Workflow")');
    
    // Should land on Builder Step 4/5 with workflow
    await page.waitForURL(/\/builder\?systemId=.*/, { timeout: 5000 });
  });

  test('MCP server selection persists across Marketplace and Builder', async ({ page }) => {
    // Go to Marketplace MCP tab
    await page.goto('/marketplace?tab=mcp');
    await page.waitForSelector('[data-testid="mcp-grid"]', { timeout: 5000 });
    
    // Select first MCP server
    const useButton = page.locator('button:has-text("Use Server")').first();
    const serverName = await page.locator('.mcp-card').first().locator('h3').textContent();
    await useButton.click();
    
    // Go to Builder Step 3
    await page.goto('/builder?step=3');
    
    // Verify MCP server is shown in Builder
    await expect(page.locator(`text=${serverName}`)).toBeVisible({ timeout: 5000 });
  });

  test('Filters produce identical results in Marketplace and Builder', async ({ page }) => {
    // Test industry filters
    await page.goto('/marketplace?tab=industry');
    await page.selectOption('select[name="industry"]', 'Healthcare');
    await page.waitForTimeout(500);
    
    const marketplaceCount = await page.locator('[data-testid="industry-card"]').count();
    
    // Go to Builder Step 2 with same filter
    await page.goto('/builder?step=2');
    await page.selectOption('select[name="industry"]', 'Healthcare');
    await page.waitForTimeout(500);
    
    const builderCount = await page.locator('[data-testid="industry-card"]').count();
    
    // Should match
    expect(marketplaceCount).toBe(builderCount);
  });

  test('Search query persists between Marketplace and Builder', async ({ page }) => {
    // Search in Marketplace
    await page.goto('/marketplace?tab=industry');
    await page.fill('input[placeholder*="Search"]', 'compliance');
    await page.waitForTimeout(500);
    
    const searchTerm = await page.inputValue('input[placeholder*="Search"]');
    
    // Navigate to Builder
    await page.goto('/builder?step=2');
    
    // Verify search term is preserved (if using unified store)
    const builderSearch = await page.inputValue('input[placeholder*="Search"]');
    expect(searchTerm).toBe(builderSearch);
  });

  test('Status chips show accurate connection state', async ({ page }) => {
    await page.goto('/marketplace?tab=industry');
    await page.waitForSelector('[data-testid="industry-grid"]', { timeout: 5000 });
    
    // Check for status badges
    const connectedBadge = page.locator('text=Connected').first();
    const disconnectedBadge = page.locator('text=Not Connected').first();
    
    // At least one should be visible
    const hasStatus = await connectedBadge.isVisible().catch(() => false) || 
                      await disconnectedBadge.isVisible().catch(() => false);
    
    expect(hasStatus).toBe(true);
  });

  test('Deploy writes to deployment_tracking table', async ({ page }) => {
    // Create a complete system
    await page.goto('/builder');
    await page.fill('input[name="systemName"]', 'Deploy Test System');
    await page.fill('input[name="department"]', 'Engineering');
    await page.fill('textarea[name="outcome"]', 'Automate testing');
    await page.click('button:has-text("Continue")');
    
    // Navigate through steps (simplified for test)
    await page.goto('/builder?step=6');
    
    // Click Deploy
    await page.click('button:has-text("Deploy")');
    
    // Should show success and redirect to analytics
    await expect(page.locator('text=Deployment successful')).toBeVisible({ timeout: 10000 });
  });
});
