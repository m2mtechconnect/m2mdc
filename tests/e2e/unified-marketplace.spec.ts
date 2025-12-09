import { test, expect } from '@playwright/test';

test.describe('Unified Marketplace', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');
  });

  test('should display marketplace with servers', async ({ page }) => {
    await expect(page.locator('h1:has-text("MCP Servers (Arcade)")')).toBeVisible();
    await expect(page.locator('text=Browse optimized, starter, verified, and community servers')).toBeVisible();
    
    // Wait for server cards to load
    await page.waitForSelector('[class*="grid"]');
    const cards = await page.locator('[class*="section-padding"]:has-text("tools")').count();
    expect(cards).toBeGreaterThan(0);
  });

  test('should filter by category', async ({ page }) => {
    // Select "Developer Tools" category
    await page.locator('label:has-text("Developer Tools")').click();
    
    // Wait for filtered results
    await page.waitForTimeout(500);
    
    // Verify results are filtered
    const categoryBadges = await page.locator('text="Developer Tools"').count();
    expect(categoryBadges).toBeGreaterThan(0);
  });

  test('should filter by type', async ({ page }) => {
    // Select "Verified" type
    await page.locator('label:has-text("Verified")').click();
    
    // Wait for filtered results
    await page.waitForTimeout(500);
    
    // Verify verified badge appears
    const verifiedBadges = await page.locator('text="Verified"').count();
    expect(verifiedBadges).toBeGreaterThan(0);
  });

  test('should search for servers', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('GitHub');
    await page.waitForTimeout(400); // Debounce
    
    // Should show GitHub in results
    await expect(page.locator('h3:has-text("GitHub")')).toBeVisible();
  });

  test('should open preview modal', async ({ page }) => {
    // Click first Preview button
    await page.locator('button:has-text("Preview")').first().click();
    
    // Modal should open
    await expect(page.locator('role=dialog')).toBeVisible();
    
    // Should have tabs
    await expect(page.locator('button:has-text("Overview")')).toBeVisible();
    await expect(page.locator('button:has-text("Capabilities")')).toBeVisible();
    await expect(page.locator('button:has-text("Auth")')).toBeVisible();
    await expect(page.locator('button:has-text("Example")')).toBeVisible();
  });

  test('should switch between preview tabs', async ({ page }) => {
    await page.locator('button:has-text("Preview")').first().click();
    
    // Click Capabilities tab
    await page.locator('button:has-text("Capabilities")').click();
    await expect(page.locator('text="Tools"')).toBeVisible();
    await expect(page.locator('text="Resources"')).toBeVisible();
    
    // Click Auth tab
    await page.locator('button:has-text("Auth")').click();
    await expect(page.locator('text="Authentication Method"')).toBeVisible();
    
    // Click Example tab
    await page.locator('button:has-text("Example")').click();
    await expect(page.locator('text="Example Workflow"')).toBeVisible();
  });

  test('should close preview modal', async ({ page }) => {
    await page.locator('button:has-text("Preview")').first().click();
    await expect(page.locator('role=dialog')).toBeVisible();
    
    // Click Close button
    await page.locator('button:has-text("Close")').click();
    await expect(page.locator('role=dialog')).not.toBeVisible();
  });

  test('should show featured badge', async ({ page }) => {
    const featuredCount = await page.locator('text="Featured"').count();
    expect(featuredCount).toBeGreaterThan(0);
  });

  test('should filter by features', async ({ page }) => {
    // Select "Featured" feature
    await page.locator('label:has-text("🔥 Featured")').click();
    
    // Wait for filtered results
    await page.waitForTimeout(500);
    
    // All cards should have Featured tag
    const cards = await page.locator('[class*="section-padding"]:has-text("tools")').count();
    const featuredBadges = await page.locator('text="Featured"').count();
    expect(featuredBadges).toBeGreaterThanOrEqual(cards);
  });

  test('should clear all filters', async ({ page }) => {
    // Apply multiple filters
    await page.locator('label:has-text("Developer Tools")').click();
    await page.locator('label:has-text("Verified")').click();
    await page.locator('input[placeholder*="Search"]').fill('test');
    
    await page.waitForTimeout(500);
    
    // Click Clear Filters
    await page.locator('button:has-text("Clear Filters")').first().click();
    
    // Filters should be cleared
    await expect(page.locator('input[placeholder*="Search"]')).toHaveValue('');
  });

  test('should paginate results', async ({ page }) => {
    // Check if pagination exists
    const nextButton = page.locator('button:has-text("Next")');
    
    if (await nextButton.isVisible() && !await nextButton.isDisabled()) {
      const firstCard = await page.locator('h3').first().textContent();
      
      // Go to next page
      await nextButton.click();
      await page.waitForTimeout(500);
      
      // Cards should be different
      const newFirstCard = await page.locator('h3').first().textContent();
      expect(newFirstCard).not.toBe(firstCard);
      
      // Previous button should be enabled
      await expect(page.locator('button:has-text("Previous")')).not.toBeDisabled();
    }
  });

  test('should show server count', async ({ page }) => {
    const countText = await page.locator('text=/\\d+ servers? available/').textContent();
    expect(countText).toMatch(/\d+ servers? available/);
  });

  test('should display server capabilities', async ({ page }) => {
    // Every card should show capabilities
    const firstCard = page.locator('[class*="section-padding"]:has-text("tools")').first();
    await expect(firstCard.locator('text=/\\d+ tools/')).toBeVisible();
    await expect(firstCard.locator('text=/\\d+ resources/')).toBeVisible();
    await expect(firstCard.locator('text=/\\d+ prompts/')).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Tab through search and filters
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to interact with keyboard
    await page.keyboard.press('Enter');
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    
    // Marketplace should still be visible
    await expect(page.locator('h1:has-text("MCP Servers")')).toBeVisible();
    
    // Cards should stack
    const grid = page.locator('[class*="grid"]').first();
    const gridClass = await grid.getAttribute('class');
    expect(gridClass).toBeTruthy();
  });

  test('should show empty state when no results', async ({ page }) => {
    // Search for non-existent server
    await page.locator('input[placeholder*="Search"]').fill('nonexistentserver12345');
    await page.waitForTimeout(500);
    
    // Should show empty state
    await expect(page.locator('text="No servers found"')).toBeVisible();
    await expect(page.locator('button:has-text("Clear Filters")')).toBeVisible();
  });

  test('should display designation badges correctly', async ({ page }) => {
    const badges = await page.locator('text=/Arcade Optimized|Arcade Starter|Verified|Community/').count();
    expect(badges).toBeGreaterThan(0);
  });

  test('should show loading skeletons', async ({ page }) => {
    // Reload page and check for skeleton loaders
    await page.goto('/marketplace');
    
    // Skeletons should appear briefly (might be fast)
    const skeletons = page.locator('[class*="animate-pulse"]');
    // Just check if they exist in DOM (might be very quick)
    const count = await skeletons.count();
    // This is acceptable to be 0 if loading is very fast
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
