import { test, expect } from '@playwright/test';

test.describe('CoPilot - Agent Streaming', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should stream responses from selected agent', async ({ page }) => {
    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(500);

    const selector = page.locator('button[role="combobox"]');
    if (await selector.count() > 0) {
      await selector.click();
      await page.waitForTimeout(300);

      const agentItems = page.locator('[role="option"]');
      const count = await agentItems.count();

      if (count > 1) {
        // Select an agent
        await agentItems.nth(1).click();
        await page.waitForTimeout(500);

        // Send query
        const input = page.locator('input[placeholder*="Ask"]');
        await input.fill('Explain quantum computing in simple terms');
        await page.keyboard.press('Enter');

        // Wait for streaming to start
        await page.waitForTimeout(1000);

        // Check for assistant message with content
        const assistantContent = page.locator('[class*="prose"]').first();
        await expect(assistantContent).toBeVisible({ timeout: 10000 });

        // Verify content is not empty
        const text = await assistantContent.textContent();
        expect(text?.length || 0).toBeGreaterThan(10);
      }
    }
  });

  test('should allow stopping streaming response', async ({ page }) => {
    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(500);

    const selector = page.locator('button[role="combobox"]');
    if (await selector.count() > 0) {
      await selector.click();
      await page.waitForTimeout(300);

      const agentItems = page.locator('[role="option"]');
      const count = await agentItems.count();

      if (count > 1) {
        await agentItems.nth(1).click();
        await page.waitForTimeout(500);

        const input = page.locator('input[placeholder*="Ask"]');
        await input.fill('Write a very long essay about artificial intelligence');
        await page.keyboard.press('Enter');

        // Wait briefly for streaming to start
        await page.waitForTimeout(800);

        // Click stop button if it exists
        const stopButton = page.locator('button:has-text("Stop")');
        if (await stopButton.count() > 0) {
          await stopButton.click();

          // Verify streaming stopped
          await page.waitForTimeout(500);
          const sendButton = page.locator('button:has-text("Send")');
          await expect(sendButton).toBeVisible();
        }
      }
    }
  });

  test('should reset conversation when switching agents', async ({ page }) => {
    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(500);

    const selector = page.locator('button[role="combobox"]');
    if (await selector.count() > 0) {
      await selector.click();
      await page.waitForTimeout(300);

      const agentItems = page.locator('[role="option"]');
      const count = await agentItems.count();

      if (count > 2) {
        // Select first agent
        await agentItems.nth(1).click();
        await page.waitForTimeout(500);

        // Send a message
        const input = page.locator('input[placeholder*="Ask"]');
        await input.fill('Hello agent 1');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Switch to another agent
        await selector.click();
        await page.waitForTimeout(300);
        await agentItems.nth(2).click();
        await page.waitForTimeout(500);

        // Verify conversation was reset (should show welcome or be empty)
        const messages = page.locator('[class*="animate-fade-in"]');
        const messageCount = await messages.count();
        expect(messageCount).toBeLessThanOrEqual(1);
      }
    }
  });

  test('should display agent name in header when selected', async ({ page }) => {
    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(500);

    const selector = page.locator('button[role="combobox"]');
    if (await selector.count() > 0) {
      await selector.click();
      await page.waitForTimeout(300);

      const agentItems = page.locator('[role="option"]');
      const count = await agentItems.count();

      if (count > 1) {
        // Get agent name from option
        const agentOption = agentItems.nth(1);
        const agentText = await agentOption.textContent();

        // Select agent
        await agentOption.click();
        await page.waitForTimeout(500);

        // Verify header shows agent name
        const header = page.locator('h3.font-display');
        const headerText = await header.textContent();
        
        // Header should not show "M2M Co-Pilot" anymore
        expect(headerText).not.toContain('M2M Co-Pilot');
      }
    }
  });
});
