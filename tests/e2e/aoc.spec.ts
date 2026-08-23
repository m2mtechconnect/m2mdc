import { test, expect } from './fixtures/authenticatedTest';

test.describe('Agent Operations Center E2E', () => {
  test.beforeEach(async ({ page }) => {
    // The protected fixture now establishes and validates auth explicitly.
    // The placeholder agent data itself is tracked separately as fixture debt.
    await page.goto('/app/agents/test-agent-id/operations');
  });

  test('should display AOC header and controls', async ({ page }) => {
    // Check header elements
    await expect(page.getByRole('heading', { name: /back/i })).toBeVisible();
    
    // Check runtime controls
    await expect(page.getByRole('button', { name: /run/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /pause/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /stop/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /restart/i })).toBeVisible();
  });

  test('should display quick stats', async ({ page }) => {
    // Check stats are rendered
    await expect(page.getByText('Status')).toBeVisible();
    await expect(page.getByText('Success Rate')).toBeVisible();
    await expect(page.getByText('Avg Duration')).toBeVisible();
    await expect(page.getByText('Total Runs')).toBeVisible();
  });

  test('should open command palette with keyboard shortcut', async ({ page }) => {
    // Press Cmd+K (or Ctrl+K on Windows/Linux)
    await page.keyboard.press('Meta+k');
    
    // Check command palette is visible
    await expect(page.getByPlaceholder(/type a command/i)).toBeVisible();
  });

  test('should display activity stream', async ({ page }) => {
    // Check activity stream title
    await expect(page.getByText('Live Activity Stream')).toBeVisible();
    
    // Check live badge
    await expect(page.getByText('Live')).toBeVisible();
  });

  test('should toggle live mode in activity stream', async ({ page }) => {
    // Find and click pause button
    const pauseButton = page.getByRole('button', { name: /pause/i }).first();
    await pauseButton.click();
    
    // Check that live badge is gone or resume button appears
    await expect(page.getByRole('button', { name: /resume/i })).toBeVisible();
  });

  test('should navigate between tabs', async ({ page }) => {
    // Click on Team tab
    await page.getByRole('tab', { name: /team/i }).click();
    await expect(page.getByText(/active users/i)).toBeVisible();
    
    // Click on Tools tab
    await page.getByRole('tab', { name: /tools/i }).click();
    await expect(page.getByText(/alerts/i)).toBeVisible();
    
    // Click on Audit tab
    await page.getByRole('tab', { name: /audit/i }).click();
    await expect(page.getByText(/audit trail/i)).toBeVisible();
  });

  test('should handle runtime control actions', async ({ page }) => {
    // Mock API call
    await page.route('**/functions/v1/aoc-runtime-control', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, status: 'running' }),
      });
    });
    
    // Click run button
    await page.getByRole('button', { name: /^run$/i }).click();
    
    // Check for success toast
    await expect(page.getByText(/agent started/i)).toBeVisible({ timeout: 5000 });
  });

  test('should search and filter logs', async ({ page }) => {
    // Type in search bar
    const searchInput = page.getByPlaceholder(/search logs/i);
    await searchInput.fill('workflow');
    
    // Wait for filtered results
    await page.waitForTimeout(500);
    
    // Check that results are filtered
    const logs = page.locator('[data-testid="activity-log"]');
    if (await logs.count() > 0) {
      const firstLog = logs.first();
      await expect(firstLog).toContainText(/workflow/i);
    }
  });

  test('should show keyboard shortcuts dialog', async ({ page }) => {
    // Press ? key
    await page.keyboard.press('?');
    
    // Check shortcuts dialog is visible
    await expect(page.getByText(/keyboard shortcuts/i)).toBeVisible();
    
    // Check some shortcuts are listed
    await expect(page.getByText(/⌘K/)).toBeVisible();
  });

  test('should display version history', async ({ page }) => {
    // Navigate to Team > Versions tab
    await page.getByRole('tab', { name: /team/i }).click();
    await page.getByRole('tab', { name: /versions/i }).click();
    
    // Check version history is visible
    await expect(page.getByText(/deployment history/i)).toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/functions/v1/aoc-runtime-control', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });
    
    // Try to run agent
    await page.getByRole('button', { name: /^run$/i }).click();
    
    // Check for error toast
    await expect(page.getByText(/failed/i)).toBeVisible({ timeout: 5000 });
  });
});
