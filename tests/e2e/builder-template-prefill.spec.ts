import { test, expect } from '@playwright/test';

test.describe('Builder - Template Prefill', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/builder');
    await page.waitForLoadState('networkidle');
    
    // Complete Step 1
    await page.fill('[id="systemName"]', 'Prefill Test System');
    await page.selectOption('[id="department"]', 'Operations');
    await page.fill('[id="outcome"]', 'Test template prefill functionality');
    await page.fill('[id="successMetric"]', 'Fields auto-populated correctly');
    
    // Navigate to Step 2
    await page.click('button:has-text("Next Step")');
    await page.waitForLoadState('networkidle');
  });

  test('should show prefill badges after template selection', async ({ page }) => {
    // Select Compliance template
    await page.click('[data-template-id="compliance"]');
    await page.waitForTimeout(1000);
    
    // Navigate to Step 4 (Configure Intelligence)
    await page.click('button:has-text("Next Step")'); // Step 3
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Next Step")'); // Step 4
    await page.waitForLoadState('networkidle');
    
    // Check for prefill badges
    const prefillBadges = page.locator('[data-testid="prefill-badge"]');
    const badgeCount = await prefillBadges.count();
    
    expect(badgeCount).toBeGreaterThan(0);
  });

  test('should prefill AI model configuration', async ({ page }) => {
    await page.click('[data-template-id="compliance"]');
    
    // Navigate to Step 4
    await page.click('button:has-text("Next Step")');
    await page.click('button:has-text("Next Step")');
    await page.waitForLoadState('networkidle');
    
    // Check if model is pre-selected
    const selectedModel = page.locator('[data-selected-model]');
    await expect(selectedModel).toBeVisible();
  });

  test('should prefill system prompt from template', async ({ page }) => {
    await page.click('[data-template-id="predictive"]');
    await page.waitForTimeout(500);
    
    // Navigate to Step 4
    await page.click('button:has-text("Next Step")');
    await page.click('button:has-text("Next Step")');
    await page.waitForLoadState('networkidle');
    
    // Check system prompt is prefilled
    const systemPrompt = await page.inputValue('[id="systemPrompt"]');
    expect(systemPrompt.length).toBeGreaterThan(10);
  });

  test('should prefill RAG parameters', async ({ page }) => {
    await page.click('[data-template-id="finance"]');
    
    // Navigate to Step 4
    await page.click('button:has-text("Next Step")');
    await page.click('button:has-text("Next Step")');
    await page.waitForLoadState('networkidle');
    
    // Check temperature value
    const temperature = await page.inputValue('[id="temperature"]');
    expect(parseFloat(temperature)).toBeGreaterThan(0);
    
    // Check Top-K value
    const topK = await page.inputValue('[id="topK"]');
    expect(parseInt(topK)).toBeGreaterThan(0);
    
    // Check Top-N value
    const topN = await page.inputValue('[id="topN"]');
    expect(parseInt(topN)).toBeGreaterThan(0);
  });

  test('should show toast with prefilled field count', async ({ page }) => {
    await page.click('[data-template-id="marketing"]');
    
    // Should see toast notification
    await expect(page.getByText(/fields prefilled/i)).toBeVisible({ timeout: 3000 });
  });

  test('should remove prefill badge after user edits field', async ({ page }) => {
    await page.click('[data-template-id="hr"]');
    
    // Navigate to Step 4
    await page.click('button:has-text("Next Step")');
    await page.click('button:has-text("Next Step")');
    await page.waitForLoadState('networkidle');
    
    // Find a field with prefill badge
    const temperatureLabel = page.locator('label[for="temperature"]');
    const prefillBadge = temperatureLabel.locator('[data-testid="prefill-badge"]');
    
    if (await prefillBadge.isVisible()) {
      // Edit the field
      const temperatureSlider = page.locator('[id="temperature"]');
      await temperatureSlider.fill('1.2');
      await page.waitForTimeout(500);
      
      // Badge should disappear
      await expect(prefillBadge).not.toBeVisible();
    }
  });

  test('should preserve user edits over template defaults', async ({ page }) => {
    // Make some manual edits first
    await page.click('button:has-text("Next Step")'); // Skip to Step 3
    await page.click('button:has-text("Next Step")'); // Skip to Step 4
    await page.waitForLoadState('networkidle');
    
    // Manually set temperature
    await page.fill('[id="temperature"]', '1.5');
    await page.waitForTimeout(500);
    
    // Go back to Step 2 and select template
    await page.click('button:has-text("Previous")');
    await page.click('button:has-text("Previous")');
    await page.waitForLoadState('networkidle');
    
    await page.click('[data-template-id="compliance"]');
    
    // Go back to Step 4
    await page.click('button:has-text("Next Step")');
    await page.click('button:has-text("Next Step")');
    await page.waitForLoadState('networkidle');
    
    // Verify manual edit preserved
    const temperature = await page.inputValue('[id="temperature"]');
    expect(parseFloat(temperature)).toBe(1.5);
  });

  test('should prefill workflow nodes for template', async ({ page }) => {
    await page.click('[data-template-id="compliance"]');
    
    // Navigate to Step 5 (Automate Workflow)
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Next Step")');
      await page.waitForLoadState('networkidle');
    }
    
    // Check if workflow has prefilled nodes
    const nodeCount = page.locator('[data-testid="workflow-node"]');
    const count = await nodeCount.count();
    
    // Compliance template should have at least 2 nodes
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('should show prefill badge tooltip', async ({ page }) => {
    await page.click('[data-template-id="finance"]');
    
    // Navigate to Step 4
    await page.click('button:has-text("Next Step")');
    await page.click('button:has-text("Next Step")');
    await page.waitForLoadState('networkidle');
    
    // Hover over prefill badge
    const prefillBadge = page.locator('[data-testid="prefill-badge"]').first();
    if (await prefillBadge.isVisible()) {
      await prefillBadge.hover();
      
      // Tooltip should appear
      await expect(page.getByText(/prefilled from template/i)).toBeVisible({ timeout: 2000 });
    }
  });
});
