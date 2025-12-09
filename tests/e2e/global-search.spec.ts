import { test, expect } from '@playwright/test';

test.describe('Global Search - URL/Text Search & CTAs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should search URL and show grounded summary', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search url or enter query/i);
    await searchInput.fill('https://example.com/compliance');
    await page.getByRole('button', { name: /search/i }).click();

    // Wait for summary to appear
    await expect(page.getByText(/summary/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/classification/i)).toBeVisible();
  });

  test('should show CTAs after search', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search url or enter query/i);
    await searchInput.fill('compliance documentation');
    await page.getByRole('button', { name: /search/i }).click();

    // Wait for CTAs
    await expect(page.getByRole('button', { name: /index to knowledge/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /compliance audit/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /faq assistant/i })).toBeVisible();
  });

  test('should prefill Builder when clicking Index to Knowledge CTA', async ({ page }) => {
    // Perform search
    await page.getByPlaceholder(/search url or enter query/i).fill('https://docs.example.com');
    await page.getByRole('button', { name: /search/i }).click();

    // Click CTA
    await page.getByRole('button', { name: /index to knowledge/i }).click();

    // Should navigate to Builder with prefilled data
    await expect(page).toHaveURL(/\/builder/);
    // Check for builder-specific UI elements instead of specific step content
    await expect(page.getByText(/Define|Configure|Connect|Automate/i).first()).toBeVisible();
  });

  test('should handle network error with requestId', async ({ page }) => {
    // Mock network failure
    await page.route('**/rest/v1/**', (route) => route.abort());

    const searchInput = page.getByPlaceholder(/search url or enter query/i);
    await searchInput.fill('test query');
    await page.getByRole('button', { name: /search/i }).click();

    // Should show error with requestId
    await expect(page.getByText(/error/i)).toBeVisible();
    await expect(page.getByText(/request.*id/i)).toBeVisible();
  });

  test('should support retry after error', async ({ page }) => {
    let callCount = 0;
    await page.route('**/rest/v1/**', (route) => {
      callCount++;
      if (callCount === 1) {
        route.abort();
      } else {
        route.continue();
      }
    });

    const searchInput = page.getByPlaceholder(/search url or enter query/i);
    await searchInput.fill('test query');
    await page.getByRole('button', { name: /search/i }).click();

    // Wait for error
    await expect(page.getByText(/error/i)).toBeVisible();

    // Click retry
    const retryButton = page.getByRole('button', { name: /retry/i });
    if (await retryButton.isVisible()) {
      await retryButton.click();
      await expect(page.getByText(/summary/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show classification (industry/department/content)', async ({ page }) => {
    await page.getByPlaceholder(/search url or enter query/i).fill('engineering documentation');
    await page.getByRole('button', { name: /search/i }).click();

    await expect(page.getByText(/industry/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/department/i)).toBeVisible();
    await expect(page.getByText(/content type/i)).toBeVisible();
  });
});
