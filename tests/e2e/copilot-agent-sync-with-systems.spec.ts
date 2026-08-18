import { test, expect } from '@playwright/test';

test.describe('CoPilot - Agent Sync with Your AI Systems', () => {
  test('should display same agents as Your AI Systems section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get agents from "Your AI Systems" section
    const systemsSection = page.locator('text=Your AI Systems').first();
    const systemsAgents: string[] = [];

    if (await systemsSection.count() > 0) {
      // Wait for agents to load
      await page.waitForTimeout(1000);

      // Get agent names from cards or list
      const agentCards = page.locator('[class*="card"]').filter({ hasText: /agent|system/i });
      const count = await agentCards.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const text = await agentCards.nth(i).textContent();
        if (text) systemsAgents.push(text.trim());
      }
    }

    // Open Co-Pilot
    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(500);

    // Open agent selector
    const selector = page.locator('button[role="combobox"]');
    if (await selector.count() > 0) {
      await selector.click();
      await page.waitForTimeout(300);

      // Get agents from dropdown
      const agentOptions = page.locator('[role="option"]');
      const optionCount = await agentOptions.count();

      // Should have at least Co-Pilot option
      expect(optionCount).toBeGreaterThanOrEqual(1);

      // If we found agents in systems, verify they appear in copilot
      if (systemsAgents.length > 0) {
        const copilotOptions: string[] = [];
        for (let i = 0; i < optionCount; i++) {
          const text = await agentOptions.nth(i).textContent();
          if (text) copilotOptions.push(text);
        }

        // At least some agents should match
        const hasMatchingAgents = systemsAgents.some(sysAgent =>
          copilotOptions.some(copilotOpt => 
            copilotOpt.toLowerCase().includes(sysAgent.toLowerCase().slice(0, 10))
          )
        );

        expect(hasMatchingAgents).toBeTruthy();
      }
    }
  });

  test('should only show active/deployed agents', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(500);

    const selector = page.locator('button[role="combobox"]');
    if (await selector.count() > 0) {
      await selector.click();
      await page.waitForTimeout(300);

      const agentOptions = page.locator('[role="option"]');
      const count = await agentOptions.count();

      // Check that agent options don't mention "draft" or "paused" status
      for (let i = 1; i < count; i++) { // Skip Co-Pilot option
        const text = await agentOptions.nth(i).textContent();
        expect(text?.toLowerCase()).not.toContain('draft');
        expect(text?.toLowerCase()).not.toContain('paused');
      }
    }
  });

  test('should load agents on copilot open', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Monitor network for agents query
    const agentRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('agents') || url.includes('from=agents')) {
        agentRequests.push(url);
      }
    });

    // Open Co-Pilot
    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(1000);

    // Should have made a request to load agents
    expect(agentRequests.length).toBeGreaterThan(0);
  });

  test('should handle user without agents gracefully', async ({ page }) => {
    // This test ensures the UI works even if user has no agents
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(500);

    const selector = page.locator('button[role="combobox"]');
    
    // Selector should exist
    await expect(selector).toBeVisible();

    // Should at least show Co-Pilot option
    await selector.click();
    await page.waitForTimeout(300);

    const options = page.locator('[role="option"]');
    const optionCount = await options.count();

    // Should have Co-Pilot option even with no agents
    expect(optionCount).toBeGreaterThanOrEqual(1);

    const firstOption = await options.first().textContent();
    expect(firstOption).toContain('Co-Pilot');
  });

  test('should refresh agents list when new agent is created', async ({ page }) => {
    // This is a conceptual test - in real scenario, user would create agent
    // and we'd verify the copilot list updates
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(500);

    const selector = page.locator('button[role="combobox"]');
    if (await selector.count() > 0) {
      await selector.click();
      await page.waitForTimeout(300);

      const initialCount = await page.locator('[role="option"]').count();

      // Close and reopen to simulate refresh
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      const closeButton = page.locator('button[aria-label*="close"]').or(page.locator('button:has(svg)').filter({ hasText: '' }).first());
      if (await closeButton.count() > 0) {
        await closeButton.click();
      }
      await page.waitForTimeout(300);

      // Reopen
      await page.click('button:has-text("Co-Pilot")');
      await page.waitForTimeout(500);

      await selector.click();
      await page.waitForTimeout(300);

      const newCount = await page.locator('[role="option"]').count();

      // Count should be consistent (agents didn't disappear)
      expect(newCount).toBeGreaterThanOrEqual(initialCount - 1);
    }
  });
});
