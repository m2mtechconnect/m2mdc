import { test, expect } from '@playwright/test';

test.describe('Builder Step 2 - Industry Marketplace UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/builder?step=2');
    await page.waitForLoadState('networkidle');
  });

  test('should display Industry Marketplace UI in Step 2', async ({ page }) => {
    // Should show marketplace heading
    await expect(page.getByText(/choose.*base|industry marketplace/i)).toBeVisible();

    // Should show industry agent cards
    const agentCards = page.locator('[data-testid="industry-agent-card"]');
    expect(await agentCards.count()).toBeGreaterThan(0);
  });

  test('should filter by industry', async ({ page }) => {
    // Open industry filter
    const industryFilter = page.getByRole('button', { name: /industry|filter/i }).first();
    await industryFilter.click();

    // Select Marketing
    await page.getByRole('checkbox', { name: /marketing/i }).click();
    await page.waitForTimeout(500);

    // Results should update
    const cards = page.locator('[data-testid="industry-agent-card"]');
    expect(await cards.count()).toBeGreaterThan(0);

    // URL should reflect filter
    await expect(page).toHaveURL(/industries.*marketing/i);
  });

  test('should filter by certified status', async ({ page }) => {
    // Click certified filter
    const certifiedToggle = page.getByRole('checkbox', { name: /certified/i });
    if (await certifiedToggle.isVisible()) {
      await certifiedToggle.click();
      await page.waitForTimeout(500);

      // URL should reflect filter
      await expect(page).toHaveURL(/certified=true/);
    }
  });

  test('should filter by ROI range', async ({ page }) => {
    // Adjust ROI slider
    const roiSlider = page.locator('[role="slider"]').first();
    if (await roiSlider.isVisible()) {
      await roiSlider.focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(500);

      // Results should update
      const cards = page.locator('[data-testid="industry-agent-card"]');
      expect(await cards.count()).toBeGreaterThan(0);
    }
  });

  test('should search agents by name/description', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('Campaign');
    await page.waitForTimeout(500);

    // Should show filtered results
    const results = page.locator('[data-testid="industry-agent-card"]');
    expect(await results.count()).toBeGreaterThan(0);

    // At least one should contain 'Campaign'
    await expect(page.getByText(/campaign/i).first()).toBeVisible();
  });

  test('should sort agents', async ({ page }) => {
    const sortButton = page.getByRole('button', { name: /sort/i });
    if (await sortButton.isVisible()) {
      await sortButton.click();
      await page.getByRole('option', { name: /roi/i }).click();
      await page.waitForTimeout(500);

      // Results should reorder
      const firstCard = page.locator('[data-testid="industry-agent-card"]').first();
      await expect(firstCard).toBeVisible();
    }
  });

  test('should persist filters in query string', async ({ page }) => {
    // Apply multiple filters
    await page.getByPlaceholder(/search/i).fill('Healthcare');
    
    const industryFilter = page.getByRole('button', { name: /industry|filter/i }).first();
    await industryFilter.click();
    await page.getByRole('checkbox', { name: /healthcare/i }).click();
    await page.waitForTimeout(1000);

    // Check URL
    const url = page.url();
    expect(url).toMatch(/q=Healthcare/i);
    expect(url).toMatch(/industries/i);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Filters should persist
    const searchValue = await page.getByPlaceholder(/search/i).inputValue();
    expect(searchValue).toBe('Healthcare');
  });

  test('should preview agent before using as base', async ({ page }) => {
    const previewButton = page.getByRole('button', { name: /preview/i }).first();
    await previewButton.click();

    // Modal should open with agent details
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Should show LLM model
    await expect(modal.getByText(/gemini|gpt|claude/i)).toBeVisible();

    // Should show Use Template button in modal
    const useButton = modal.getByRole('button', { name: /use.*template|select/i });
    await expect(useButton).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: /close/i }).click();
  });

  test('should select agent as base and enable Next button', async ({ page }) => {
    // Initially Next might be disabled
    const nextButton = page.getByRole('button', { name: /^next$/i });
    
    // Use Template
    const useButton = page.getByRole('button', { name: /use.*template/i }).first();
    await useButton.click();
    await page.waitForTimeout(500);

    // Next button should be enabled
    await expect(nextButton).toBeEnabled();

    // Badge should show selection
    await expect(page.getByText(/base selected|template selected/i)).toBeVisible();
  });

  test('should advance to Step 3 after selecting base', async ({ page }) => {
    // Select agent
    const useButton = page.getByRole('button', { name: /use.*template/i }).first();
    await useButton.click();
    await page.waitForTimeout(500);

    // Click Next
    const nextButton = page.getByRole('button', { name: /^next$/i });
    await nextButton.click();

    // Should navigate to Step 3
    await expect(page).toHaveURL(/step=3/, { timeout: 5000 });
  });

  test('should show clear filters button when filters applied', async ({ page }) => {
    // Apply filter
    await page.getByPlaceholder(/search/i).fill('Test');
    await page.waitForTimeout(500);

    // Clear button should appear
    const clearButton = page.getByRole('button', { name: /clear.*filter/i });
    await expect(clearButton).toBeVisible();

    // Click clear
    await clearButton.click();
    await page.waitForTimeout(500);

    // Search should be empty
    const searchValue = await page.getByPlaceholder(/search/i).inputValue();
    expect(searchValue).toBe('');
  });
});
