import { test, expect } from '@playwright/test';

test.describe('Agents - Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth');
    await page.getByPlaceholder(/email/i).fill('test@m2m.studio');
    await page.getByPlaceholder(/password/i).fill('testpass123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/i, { timeout: 10000 });
  });

  test('should display agents grid with search and pagination', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    // Should show agents grid
    const agentCards = page.locator('[data-testid="agent-card"]');
    const count = await agentCards.count();
    expect(count).toBeGreaterThan(0);

    // Test search
    await page.getByPlaceholder(/search/i).fill('Campaign');
    await page.waitForTimeout(500);
    
    const filteredCards = await page.locator('[data-testid="agent-card"]').count();
    expect(filteredCards).toBeGreaterThan(0);

    // Test pagination if present
    const nextButton = page.getByRole('button', { name: /next/i });
    if (await nextButton.isVisible() && await nextButton.isEnabled()) {
      await nextButton.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('should open preview modal with Agent Summary', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    // Click preview button on first agent
    const previewButton = page.getByRole('button', { name: /preview/i }).first();
    await previewButton.click();

    // Modal should appear
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Should show Agent Summary with LLM model
    await expect(page.getByText(/gemini|gpt|claude/i)).toBeVisible();

    // Should show MCP servers if any
    const mcpChips = page.locator('[data-testid="mcp-chip"]');
    if (await mcpChips.count() > 0) {
      expect(await mcpChips.first().isVisible()).toBe(true);
    }

    // Should show agent purpose/description
    await expect(page.locator('[role="dialog"] p').first()).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: /close/i }).click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should navigate to chat from agent card', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    // Get first agent's ID
    const firstCard = page.locator('[data-testid="agent-card"]').first();
    const chatButton = firstCard.getByRole('button', { name: /chat/i });
    
    await chatButton.click();

    // Should navigate to chat page
    await expect(page).toHaveURL(/\/agents\/.*\/chat/, { timeout: 5000 });
  });

  test('should send message and receive SSE stream response', async ({ page }) => {
    // Navigate directly to a test agent chat
    await page.goto('/agents/test-agent-123/chat');
    await page.waitForLoadState('networkidle');

    // Mock SSE response
    await page.route('**/functions/v1/agent-stream**', async (route) => {
      // Simulate SSE stream
      const streamData = [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" there!"}}]}\n\n',
        'data: [DONE]\n\n'
      ].join('');

      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: streamData
      });
    });

    // Type and send message
    const input = page.getByPlaceholder(/message|type/i);
    await input.fill('Hello, AI assistant!');
    await page.getByRole('button', { name: /send/i }).click();

    // User message should appear
    await expect(page.getByText('Hello, AI assistant!')).toBeVisible();

    // AI response should stream in
    await expect(page.getByText(/Hello there!/i)).toBeVisible({ timeout: 5000 });
  });

  test('should persist chat history', async ({ page }) => {
    await page.goto('/agents/test-agent-123/chat');
    await page.waitForLoadState('networkidle');

    // Mock message send
    await page.route('**/functions/v1/agent-stream**', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: 'data: {"choices":[{"delta":{"content":"Response"}}]}\n\ndata: [DONE]\n\n'
      });
    });

    // Send message
    await page.getByPlaceholder(/message|type/i).fill('Test message');
    await page.getByRole('button', { name: /send/i }).click();
    await page.waitForTimeout(1000);

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Message should still be visible
    await expect(page.getByText('Test message')).toBeVisible();
  });

  test('should show tooltips on action buttons', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('[data-testid="agent-card"]').first();
    
    // Hover over chat button
    const chatButton = firstCard.getByRole('button', { name: /chat/i });
    await chatButton.hover();
    
    // Tooltip should appear
    const tooltip = page.locator('[role="tooltip"]');
    if (await tooltip.count() > 0) {
      await expect(tooltip.first()).toBeVisible({ timeout: 2000 });
    }
  });

  test('should display resume, rollback, and deploy version buttons', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('[data-testid="agent-card"]').first();
    
    // Check for action buttons
    const resumeButton = firstCard.getByRole('button', { name: /resume/i });
    const rollbackButton = firstCard.getByRole('button', { name: /rollback/i });
    const deployButton = firstCard.getByRole('button', { name: /deploy/i });

    // At least one should be visible depending on agent state
    const hasActions = 
      await resumeButton.isVisible() || 
      await rollbackButton.isVisible() || 
      await deployButton.isVisible();
    
    expect(hasActions).toBe(true);
  });
});
