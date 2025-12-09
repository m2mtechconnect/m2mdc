import { test, expect } from '@playwright/test';

test.describe('CoPilot - Command Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should list agents with /list command', async ({ page }) => {
    // Open Co-Pilot
    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(500);

    // Type /list command
    const input = page.locator('input[placeholder*="Ask anything"]');
    await input.fill('/list');
    await page.keyboard.press('Enter');

    // Wait for response
    await page.waitForTimeout(1000);

    // Check for agent list response
    const response = page.locator('text=Available Agents');
    await expect(response).toBeVisible({ timeout: 5000 });

    // Check for command help
    await expect(page.locator('text=/use [agent_name]')).toBeVisible();
    await expect(page.locator('text=/reset')).toBeVisible();
    await expect(page.locator('text=/params')).toBeVisible();
  });

  test('should switch to agent with /use command', async ({ page }) => {
    // Open Co-Pilot
    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(500);

    // List agents first
    const input = page.locator('input[placeholder*="Ask anything"]');
    await input.fill('/list agents');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Get first agent name from the list
    const agentListText = await page.locator('.prose').first().textContent();
    const agentMatch = agentListText?.match(/\d+\.\s+\*\*(.+?)\*\*/);
    
    if (agentMatch && agentMatch[1]) {
      const agentName = agentMatch[1];
      
      // Use /use command
      await input.fill(`/use ${agentName}`);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

      // Check for confirmation
      await expect(page.locator(`text=Now chatting with ${agentName}`)).toBeVisible({ timeout: 3000 });

      // Verify header updates
      const header = page.locator('h3.font-display');
      await expect(header).toContainText(agentName);
    }
  });

  test('should show error for invalid agent name', async ({ page }) => {
    // Open Co-Pilot
    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(500);

    // Try to use non-existent agent
    const input = page.locator('input[placeholder*="Ask anything"]');
    await input.fill('/use NonExistentAgent123');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Check for error message
    await expect(page.locator('text=not found')).toBeVisible({ timeout: 3000 });
  });

  test('should reset conversation with /reset command', async ({ page }) => {
    // Open Co-Pilot
    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(500);

    // Send a regular message first
    const input = page.locator('input[placeholder*="Ask anything"]');
    await input.fill('Hello, test message');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Count messages
    const messagesBefore = await page.locator('[class*="animate-fade-in"]').count();
    expect(messagesBefore).toBeGreaterThan(0);

    // Use /reset command
    await input.fill('/reset');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Check for reset confirmation
    await expect(page.locator('text=Chat context cleared')).toBeVisible({ timeout: 3000 });

    // Verify messages cleared (only welcome/reset message remains)
    const messagesAfter = await page.locator('[class*="animate-fade-in"]').count();
    expect(messagesAfter).toBeLessThanOrEqual(1);
  });

  test('should show parameters with /params command', async ({ page }) => {
    // Open Co-Pilot
    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(500);

    // Use /params without agent
    const input = page.locator('input[placeholder*="Ask anything"]');
    await input.fill('/params');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Check for no agent message
    await expect(page.locator('text=No agent selected')).toBeVisible({ timeout: 3000 });

    // Now select an agent if available
    const selector = page.locator('button[role="combobox"]');
    if (await selector.count() > 0) {
      await selector.click();
      await page.waitForTimeout(300);

      const agentItems = page.locator('[role="option"]');
      const count = await agentItems.count();

      if (count > 1) {
        // Select first agent
        await agentItems.nth(1).click();
        await page.waitForTimeout(500);

        // Use /params again
        await input.fill('/params');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Check for parameter info
        await expect(page.locator('text=Active Agent')).toBeVisible({ timeout: 3000 });
        await expect(page.locator('text=Model')).toBeVisible();
        await expect(page.locator('text=Status')).toBeVisible();
      }
    }
  });

  test('should show command help in placeholder', async ({ page }) => {
    // Open Co-Pilot
    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(500);

    // Check input placeholder
    const input = page.locator('input[placeholder*="Ask anything"]');
    await expect(input).toHaveAttribute('placeholder', expect.stringContaining('/list'));
    await expect(input).toHaveAttribute('placeholder', expect.stringContaining('/use'));
    await expect(input).toHaveAttribute('placeholder', expect.stringContaining('/reset'));
    await expect(input).toHaveAttribute('placeholder', expect.stringContaining('/params'));
  });

  test('should handle commands case-insensitively', async ({ page }) => {
    // Open Co-Pilot
    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(500);

    // Test uppercase command
    const input = page.locator('input[placeholder*="Ask anything"]');
    await input.fill('/LIST');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Should still work
    await expect(page.locator('text=Available Agents')).toBeVisible({ timeout: 5000 });
  });

  test('should not treat regular messages as commands', async ({ page }) => {
    // Open Co-Pilot
    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(500);

    // Send a message that's not a command
    const input = page.locator('input[placeholder*="Ask anything"]');
    await input.fill('What is the /list command used for?');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Should process as regular message, not as command
    const userMessage = page.locator('text=What is the /list command used for?');
    await expect(userMessage).toBeVisible({ timeout: 3000 });
  });
});
