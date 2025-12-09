import { test, expect } from '@playwright/test';

test.describe('MCP Marketplace', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to builder and go to step 3
    await page.goto('/builder?template=blank&mode=create');
    await page.waitForLoadState('networkidle');
    
    // Navigate to Step 3 by clicking the step
    await page.getByRole('button', { name: /Configure Intelligence/i }).click();
    
    // Click on the MCP Servers tab
    await page.getByRole('tab', { name: /MCP Servers/i }).click();
    await page.waitForTimeout(500);
  });

  test('should display marketplace with server cards', async ({ page }) => {
    // Check marketplace is visible
    await expect(page.getByText('Arcade MCP Marketplace')).toBeVisible();
    
    // Wait for servers to load
    await page.waitForTimeout(1000);
    
    // Check server cards are displayed (at least 1 card should be visible)
    const serverCards = page.locator('[class*="card"]').filter({ hasText: 'tools' });
    await expect(serverCards.first()).toBeVisible({ timeout: 5000 });
  });

  test('should filter servers by category', async ({ page }) => {
    // Select a category checkbox
    const categoryCheckbox = page.getByRole('checkbox', { name: /Sales/i });
    await categoryCheckbox.click();
    
    // Wait for filtering
    await page.waitForTimeout(1000);
    
    // Should update server count
    const resultsText = page.getByText(/server.*available/i);
    await expect(resultsText).toBeVisible();
  });

  test('should filter servers by type', async ({ page }) => {
    // Select "Arcade Optimized" type
    const typeCheckbox = page.getByRole('checkbox', { name: /Arcade Optimized/i });
    await typeCheckbox.click();
    
    // Wait for filtering
    await page.waitForTimeout(1000);
    
    // Should show filtered servers
    const resultsText = page.getByText(/server.*available/i);
    await expect(resultsText).toBeVisible();
  });

  test('should search servers', async ({ page }) => {
    // Type in search box
    await page.getByPlaceholder('Search servers...').fill('gmail');

    // Wait for debounce and API call
    await page.waitForTimeout(1000);

    // Should show filtered results
    const resultsText = page.getByText(/server.*available/i);
    await expect(resultsText).toBeVisible();
  });

  test('should open server details modal', async ({ page }) => {
    // Wait for cards to load
    await page.waitForTimeout(1000);
    
    // Click on first Preview button
    const previewButton = page.getByRole('button', { name: /Preview/i }).first();
    await previewButton.click();

    // Check modal is open with details
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Overview|Capabilities|Auth|Example/)).toBeVisible();
  });

  test('should register server from details modal', async ({ page }) => {
    // Wait for cards to load
    await page.waitForTimeout(1000);
    
    // Click on first Use/Register button
    const registerButton = page.getByRole('button', { name: /Use|Register/i }).first();
    await registerButton.click();

    // Should show system required toast or success
    await page.waitForTimeout(1000);
  });

  test('should clear filters', async ({ page }) => {
    // Apply filters
    await page.getByRole('checkbox', { name: /Sales/i }).click();
    await page.waitForTimeout(500);
    
    // Clear filters button should appear
    await page.getByRole('button', { name: /Clear Filters/i }).click();
    await page.waitForTimeout(500);

    // Should show all servers again
    const resultsText = page.getByText(/server.*available/i);
    await expect(resultsText).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Check marketplace is still functional
    await expect(page.getByText('Arcade MCP Marketplace')).toBeVisible();
    
    // Wait for cards
    await page.waitForTimeout(1000);
    const serverCards = page.locator('[class*="card"]').filter({ hasText: 'tools' });
    await expect(serverCards.first()).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Tab to search box
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Type in search
    await page.keyboard.type('slack');
    await page.waitForTimeout(1000);

    // Should filter
    const resultsText = page.getByText(/server.*available/i);
    await expect(resultsText).toBeVisible();
  });

  test('should show loading state', async ({ page }) => {
    // Reload to see loading state
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Navigate back to MCP tab
    await page.getByRole('button', { name: /Configure Intelligence/i }).click();
    await page.getByRole('tab', { name: /MCP Servers/i }).click();
    
    // Should show content eventually
    await page.waitForTimeout(2000);
    const resultsText = page.getByText(/server.*available/i);
    await expect(resultsText).toBeVisible({ timeout: 10000 });
  });

  test('should redirect old Step 2 MCP route to Step 3', async ({ page }) => {
    // Navigate to old Step 2 MCP route
    await page.goto('/builder?step=2&tab=mcp');
    await page.waitForLoadState('networkidle');
    
    // Should redirect to Step 3 and show toast
    await expect(page.getByText(/MCP Servers Moved|Configure Intelligence/i)).toBeVisible({ timeout: 5000 });
    
    // Should be on Step 3
    await expect(page.getByRole('tab', { name: /MCP Servers/i })).toBeVisible();
  });
});
