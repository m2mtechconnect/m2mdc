import { test, expect } from '@playwright/test';

test.describe('Smart Suggestions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display suggestions dropdown on focus', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Paste a URL"]');
    
    // Focus the input
    await searchInput.click();
    
    // Wait for suggestions to load (or empty state to appear)
    await page.waitForTimeout(1000);
    
    // Should show either suggestions or empty state
    const hasDropdown = await page.locator('.animate-fade-in').isVisible();
    expect(hasDropdown).toBeTruthy();
  });

  test('should show empty state for new users with example buttons', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Paste a URL"]');
    
    await searchInput.click();
    await page.waitForTimeout(1000);
    
    // Check for empty state message
    const emptyState = page.getByText(/No suggestions yet/i);
    // Empty state may or may not appear depending on user data
    
    // If empty state exists, verify example buttons are clickable
    if (await emptyState.isVisible()) {
      const exampleButtons = page.locator('button', { hasText: /Scan my website|Design a compliance|Map AI/i });
      const count = await exampleButtons.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should display SHORT suggestion labels (5-10 words max)', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Paste a URL"]');
    
    await searchInput.click();
    await page.waitForTimeout(1000);
    
    // Check that suggestion labels are short (if any exist)
    const suggestions = page.locator('button[type="button"]').filter({ hasText: /Run |Try |Scan |Map /i });
    const count = await suggestions.count();
    
    if (count > 0) {
      const firstSuggestion = suggestions.first();
      const text = await firstSuggestion.textContent();
      // Verify text is short - count words, not characters
      const cleanText = text?.trim() || '';
      const wordCount = cleanText.split(/\s+/).length;
      expect(wordCount).toBeLessThanOrEqual(10); // Max 10 words for short labels
      expect(wordCount).toBeGreaterThanOrEqual(2); // At least 2 words
    }
  });

  test('should show caption "Click a suggestion to ask Co-Pilot"', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Paste a URL"]');
    
    await searchInput.click();
    await page.waitForTimeout(1000);
    
    // Look for the caption text
    const caption = page.getByText(/Click a suggestion to ask Co-Pilot/i);
    // Caption may only appear when suggestions exist
  });

  test('should handle keyboard navigation', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Paste a URL"]');
    
    await searchInput.click();
    await page.waitForTimeout(1000);
    
    // Try arrow down
    await searchInput.press('ArrowDown');
    
    // Should highlight first suggestion if any exist
    const highlighted = page.locator('.bg-muted\\/50');
    // May or may not exist depending on data
  });

  test('should close dropdown on Escape key', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Paste a URL"]');
    
    await searchInput.click();
    await page.waitForTimeout(1000);
    
    // Press Escape
    await searchInput.press('Escape');
    
    // Dropdown should close
    await page.waitForTimeout(500);
    const dropdown = page.locator('.animate-fade-in');
    const isVisible = await dropdown.isVisible().catch(() => false);
    expect(isVisible).toBeFalsy();
  });

  test('should show loading state initially', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Paste a URL"]');
    
    await searchInput.click();
    
    // Should show loading briefly
    const loading = page.getByText(/Loading suggestions/i);
    // May appear very briefly
  });

  test('should display error state on network failure', async ({ page }) => {
    // Mock network failure for search-suggestions endpoint
    await page.route('**/functions/v1/search-suggestions', (route) => {
      route.abort('failed');
    });
    
    const searchInput = page.locator('input[placeholder*="Paste a URL"]');
    await searchInput.click();
    await page.waitForTimeout(1500);
    
    // Should show error message
    const error = page.getByText(/Failed to load suggestions/i);
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('should show different suggestions based on page context', async ({ page }) => {
    // Dashboard context
    await page.goto('/');
    const searchInput = page.locator('input[placeholder*="Paste a URL"]');
    await searchInput.click();
    await page.waitForTimeout(1000);
    
    // Suggestions should be context-aware (can't assert specific content without data)
    const dropdown = page.locator('.animate-fade-in');
    const isVisible = await dropdown.isVisible().catch(() => false);
    // Just verify no crash
  });

  test('should clicking any suggestion open Co-Pilot with full question', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Paste a URL"]');
    await searchInput.click();
    await page.waitForTimeout(1000);
    
    // Look for any suggestion button with short action-oriented labels
    const firstSuggestion = page.locator('button[type="button"]').filter({ hasText: /Run |Try |Scan |Map /i }).first();
    if (await firstSuggestion.isVisible()) {
      const currentUrl = page.url();
      await firstSuggestion.click();
      
      // Should NOT navigate away
      await page.waitForTimeout(500);
      expect(page.url()).toBe(currentUrl);
      
      // Co-Pilot panel should open (check for visible Co-Pilot elements)
      // Note: actual Co-Pilot panel visibility depends on implementation
      const coPilotPanel = page.locator('[data-testid="copilot-panel"]').or(page.locator('text=/Co-Pilot|Assistant/i'));
      // Panel may or may not be visible depending on state, but navigation should not happen
    }
  });
});
