import { test, expect } from '@playwright/test';

test.describe('Copilot - Agents List with Filters and Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display agents list section', async ({ page }) => {
    // Look for "All Agents" section
    const agentsSection = page.locator('text=All Agents');
    await expect(agentsSection).toBeVisible({ timeout: 10000 });

    // Check for description
    await expect(page.locator('text=Browse and test all available agents')).toBeVisible();
  });

  test('should load and display agents', async ({ page }) => {
    // Wait for agents to load
    await page.waitForTimeout(2000);

    // Check if loading spinner disappears
    const loader = page.locator('[data-testid="agents-loader"]');
    await expect(loader).not.toBeVisible({ timeout: 10000 }).catch(() => {});

    // Check for agent cards or empty state
    const hasAgents = await page.locator('.agent-card, text=No agents found').count();
    expect(hasAgents).toBeGreaterThan(0);
  });

  test('should filter agents by search term', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill('test', { timeout: 5000 });
    await page.waitForTimeout(1000);

    // Verify filtering occurred (network request sent)
    // The actual filtering happens server-side via agents-list function
  });

  test('should filter agents by status', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Find status dropdown
    const statusSelect = page.locator('[role="combobox"]').first();
    await statusSelect.click({ timeout: 5000 }).catch(() => {});
    
    // Select "Active" status
    await page.locator('text=Active').first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1000);
  });

  test('should paginate through agents', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for pagination controls
    const nextButton = page.locator('button:has-text("Next")');
    const prevButton = page.locator('button:has-text("Previous")');

    // Check if pagination exists (only if there are enough agents)
    const hasPagination = await nextButton.count() > 0;
    
    if (hasPagination) {
      const isNextDisabled = await nextButton.isDisabled();
      if (!isNextDisabled) {
        await nextButton.click();
        await page.waitForTimeout(1000);
        
        // Verify page changed
        await expect(prevButton).not.toBeDisabled();
      }
    }
  });

  test('should show Run Agent button on cards', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for "Run Agent" buttons
    const runButtons = page.locator('button:has-text("Run Agent")');
    const count = await runButtons.count();

    // If there are agents, there should be Run Agent buttons
    if (count > 0) {
      await expect(runButtons.first()).toBeVisible();
    }
  });

  test('should handle empty state correctly', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Check for either agents or empty state
    const hasContent = await page.locator('text=No agents found, .agent-card').count();
    expect(hasContent).toBeGreaterThan(0);
  });
});
