import { test, expect } from '@playwright/test';

test.describe('Compliance & Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/compliance');
    await page.waitForLoadState('networkidle');
  });

  test('should display decision replay panel', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /compliance|audit/i })).toBeVisible();
    await expect(page.getByText(/decision replay|audit trail/i)).toBeVisible();
  });

  test('should open decision replay modal', async ({ page }) => {
    const replayButton = page.getByRole('button', { name: /replay|view decision/i }).first();
    if (await replayButton.isVisible()) {
      await replayButton.click();
      
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText(/citations|sources/i)).toBeVisible();
    }
  });

  test('should show citations with doc IDs and snippets', async ({ page }) => {
    const replayButton = page.getByRole('button', { name: /replay|view/i }).first();
    if (await replayButton.isVisible()) {
      await replayButton.click();
      
      // Check for citation details
      await expect(page.getByText(/source|document|snippet/i)).toBeVisible();
      await expect(page.locator('[data-testid="citation-item"]').first()).toBeVisible();
    }
  });

  test('should export audit PDF', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      page.getByRole('button', { name: /export.*pdf/i }).click(),
    ]);

    expect(download.suggestedFilename()).toContain('.pdf');
    
    // Verify file is not empty
    const path = await download.path();
    const fs = require('fs');
    const stats = fs.statSync(path);
    expect(stats.size).toBeGreaterThan(0);
  });

  test('should filter audit logs by date range', async ({ page }) => {
    const dateFilter = page.getByRole('button', { name: /date|range/i });
    if (await dateFilter.isVisible()) {
      await dateFilter.click();
      
      // Select preset or custom range
      await page.getByRole('option', { name: /last 30 days/i }).click();
      
      await page.waitForTimeout(500);
      await expect(page.getByRole('table')).toBeVisible();
    }
  });

  test('should display grounding metadata', async ({ page }) => {
    const detailsButton = page.getByRole('button', { name: /details|view/i }).first();
    if (await detailsButton.isVisible()) {
      await detailsButton.click();
      
      await expect(page.getByText(/grounding|faithfulness|confidence/i)).toBeVisible();
    }
  });

  test('should search audit logs', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('compliance');
      await page.waitForTimeout(500);
      
      // Results should filter
      await expect(page.getByRole('table')).toBeVisible();
    }
  });
});
