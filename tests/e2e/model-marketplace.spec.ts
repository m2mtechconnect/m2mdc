import { test, expect } from '@playwright/test';

test.describe('Model Marketplace', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/builder');
    await page.waitForLoadState('networkidle');
  });

  test('should display model marketplace with all filters', async ({ page }) => {
    await page.click('text=Configure AI');
    
    // Check header
    await expect(page.locator('text=Model Marketplace')).toBeVisible();
    
    // Check filters are present
    await expect(page.locator('input[placeholder="Search models..."]')).toBeVisible();
    await expect(page.locator('button:has-text("All Providers")')).toBeVisible();
    await expect(page.locator('button:has-text("All Pricing")')).toBeVisible();
  });

  test('should display provider logos for each model', async ({ page }) => {
    await page.click('text=Configure AI');
    
    // Check Google logo is present
    const googleLogo = page.locator('img[alt="Google logo"]').first();
    await expect(googleLogo).toBeVisible();
    
    // Check OpenAI logo is present
    const openaiLogo = page.locator('img[alt="OpenAI logo"]').first();
    await expect(openaiLogo).toBeVisible();
  });

  test('should filter models by search query', async ({ page }) => {
    await page.click('text=Configure AI');
    
    const searchInput = page.locator('input[placeholder="Search models..."]');
    await searchInput.fill('Gemini');
    
    // Should only show Gemini models
    await expect(page.locator('text=Gemini 2.5 Flash')).toBeVisible();
    await expect(page.locator('text=GPT-5').first()).not.toBeVisible();
  });

  test('should filter models by provider', async ({ page }) => {
    await page.click('text=Configure AI');
    
    // Click provider dropdown
    await page.click('button:has-text("All Providers")');
    await page.click('text=Google');
    
    // Should only show Google models
    await expect(page.locator('text=Gemini 2.5 Flash')).toBeVisible();
    await expect(page.locator('text=GPT-5').first()).not.toBeVisible();
  });

  test('should filter models by pricing tier', async ({ page }) => {
    await page.click('text=Configure AI');
    
    // Click pricing dropdown
    await page.click('button:has-text("All Pricing")');
    await page.click('text=Low Cost');
    
    // Check that low cost models are shown
    await expect(page.locator('text=low').first()).toBeVisible();
  });

  test('should show region compliance indicator', async ({ page }) => {
    await page.click('text=Configure AI');
    
    // Check region compliance text is present
    await expect(page.locator('text=Region compliant').first()).toBeVisible();
  });

  test('should select a model', async ({ page }) => {
    await page.click('text=Configure AI');
    
    // Click on first model card
    const firstModel = page.locator('[role="button"][aria-label*="Select"]').first();
    await firstModel.click();
    
    // Should show selected state
    await expect(firstModel).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('button:has-text("Selected")').first()).toBeVisible();
  });

  test('should display recommended badge for recommended models', async ({ page }) => {
    await page.click('text=Configure AI');
    
    // Check for recommended badge
    await expect(page.locator('text=Recommended').first()).toBeVisible();
  });

  test('should show pricing details and context window', async ({ page }) => {
    await page.click('text=Configure AI');
    
    // Check pricing details are visible
    await expect(page.locator('text=/\\$.*\\/.*tokens/').first()).toBeVisible();
    
    // Check context window is visible
    await expect(page.locator('text=/Context:.*tokens/').first()).toBeVisible();
  });

  test('should display capabilities as badges', async ({ page }) => {
    await page.click('text=Configure AI');
    
    // Check capability badges
    await expect(page.locator('text=Text').first()).toBeVisible();
    await expect(page.locator('text=Vision').first()).toBeVisible();
  });

  test('should show Test button for models', async ({ page }) => {
    await page.click('text=Configure AI');
    
    // Check Test button is present
    await expect(page.locator('button:has-text("Test")').first()).toBeVisible();
  });

  test('should handle empty search results', async ({ page }) => {
    await page.click('text=Configure AI');
    
    const searchInput = page.locator('input[placeholder="Search models..."]');
    await searchInput.fill('NonexistentModel123');
    
    // Should show empty state
    await expect(page.locator('text=No models match your filters')).toBeVisible();
    await expect(page.locator('button:has-text("Clear filters")')).toBeVisible();
  });

  test('should clear filters', async ({ page }) => {
    await page.click('text=Configure AI');
    
    // Apply filters
    const searchInput = page.locator('input[placeholder="Search models..."]');
    await searchInput.fill('Gemini');
    
    await page.click('button:has-text("All Providers")');
    await page.click('text=Google');
    
    // Clear filters
    await page.click('button:has-text("Clear filters")');
    
    // Check filters are reset
    await expect(searchInput).toHaveValue('');
  });

  test('should be keyboard accessible', async ({ page }) => {
    await page.click('text=Configure AI');
    
    // Tab to first model card
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Select with Enter key
    await page.keyboard.press('Enter');
    
    // Check model is selected
    const selected = page.locator('[aria-pressed="true"]');
    await expect(selected).toBeVisible();
  });

  test('should show speed indicators', async ({ page }) => {
    await page.click('text=Configure AI');
    
    // Check for speed icons (Zap for fast, TrendingUp for medium, Brain for slow)
    const icons = page.locator('svg[class*="lucide"]');
    await expect(icons.first()).toBeVisible();
  });

  test('should enforce RBAC for test action', async ({ page }) => {
    // Mock user without executive/engineer role
    await page.route('**/rest/v1/rpc/has_role', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ data: false })
      });
    });

    await page.click('text=Configure AI');
    await page.click('button:has-text("Test")').first();
    
    // Should show access denied toast
    await expect(page.locator('text=Access Denied')).toBeVisible();
  });

  test('should handle test API errors gracefully', async ({ page }) => {
    // Mock failed test API
    await page.route('**/functions/v1/models-test', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Test failed' })
      });
    });

    await page.click('text=Configure AI');
    await page.click('button:has-text("Test")').first();
    
    // Should show error toast
    await expect(page.locator('text=Test Failed')).toBeVisible();
  });

  test('should show loading state during test', async ({ page }) => {
    // Mock slow test API
    await page.route('**/functions/v1/models-test', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, latency: 150 })
      });
    });

    await page.click('text=Configure AI');
    const testButton = page.locator('button:has-text("Test")').first();
    await testButton.click();
    
    // Should show loading spinner
    await expect(testButton.locator('svg[class*="animate-spin"]')).toBeVisible();
  });

  test('should meet accessibility standards', async ({ page }) => {
    await page.click('text=Configure AI');
    
    // Check all interactive elements have labels
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      
      // Button should have either aria-label or text content
      expect(ariaLabel || text).toBeTruthy();
    }
    
    // Check images have alt text
    const images = page.locator('img');
    const imgCount = await images.count();
    
    for (let i = 0; i < imgCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });

  test('should persist model selection to database', async ({ page }) => {
    let updateCalled = false;
    
    // Mock database update
    await page.route('**/rest/v1/agents?id=eq.*', (route) => {
      updateCalled = true;
      route.fulfill({
        status: 200,
        body: JSON.stringify({ data: {} })
      });
    });

    await page.click('text=Configure AI');
    await page.locator('[role="button"][aria-label*="Select"]').first().click();
    
    // Wait a bit for database call
    await page.waitForTimeout(500);
    
    expect(updateCalled).toBe(true);
  });

  test('should apply RAG settings when model is selected', async ({ page }) => {
    await page.click('text=Configure AI');
    
    // Select Gemini Flash model
    await page.click('text=Gemini 2.5 Flash');
    
    // Should show success toast with model name
    await expect(page.locator('text=/Gemini 2.5 Flash/')).toBeVisible();
  });
});
