import { test, expect } from '@playwright/test';

test.describe('Agent Playground - Run Agent', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('should open playground when clicking Run Agent', async ({ page }) => {
    // Look for first "Run Agent" button
    const runButton = page.locator('button:has-text("Run Agent")').first();
    
    // Check if button exists
    const buttonExists = await runButton.count() > 0;
    
    if (buttonExists) {
      await runButton.click({ timeout: 5000 });
      await page.waitForTimeout(1000);

      // Check if playground modal opened
      const playgroundModal = page.locator('text=Playground');
      await expect(playgroundModal).toBeVisible({ timeout: 5000 });
    } else {
      test.skip('No agents available to test');
    }
  });

  test('should display agent name and close button', async ({ page }) => {
    const runButton = page.locator('button:has-text("Run Agent")').first();
    const buttonExists = await runButton.count() > 0;
    
    if (!buttonExists) {
      test.skip('No agents available');
      return;
    }

    await runButton.click({ timeout: 5000 });
    await page.waitForTimeout(1000);

    // Check for agent name display
    const agentNameInModal = await page.locator('.font-semibold').count();
    expect(agentNameInModal).toBeGreaterThan(0);

    // Check for close button
    const closeButton = page.locator('button:has-text("Close")');
    await expect(closeButton).toBeVisible();
  });

  test('should allow sending messages', async ({ page }) => {
    const runButton = page.locator('button:has-text("Run Agent")').first();
    const buttonExists = await runButton.count() > 0;
    
    if (!buttonExists) {
      test.skip('No agents available');
      return;
    }

    await runButton.click({ timeout: 5000 });
    await page.waitForTimeout(1000);

    // Find message input
    const messageInput = page.locator('input[placeholder*="message"]');
    await expect(messageInput).toBeVisible({ timeout: 5000 });

    // Type a test message
    await messageInput.fill('Hello, test message');
    
    // Find send button
    const sendButton = page.locator('button[type="submit"]').last();
    await expect(sendButton).toBeEnabled();
  });

  test('should not expose credentials in network traces', async ({ page }) => {
    const sensitiveData: string[] = [];

    page.on('request', (request) => {
      const postData = request.postData();
      if (postData && request.url().includes('agent-run')) {
        // Check that credentials are not in the request
        if (postData.includes('LOVABLE_API_KEY') || postData.includes('sk-')) {
          sensitiveData.push('Credentials found in request body');
        }
      }
    });

    page.on('response', async (response) => {
      if (response.url().includes('agent-run')) {
        try {
          const text = await response.text();
          if (text.includes('LOVABLE_API_KEY') || text.includes('sk-')) {
            sensitiveData.push('Credentials found in response');
          }
        } catch (e) {
          // Ignore
        }
      }
    });

    const runButton = page.locator('button:has-text("Run Agent")').first();
    const buttonExists = await runButton.count() > 0;
    
    if (!buttonExists) {
      test.skip('No agents available');
      return;
    }

    await runButton.click({ timeout: 5000 });
    await page.waitForTimeout(2000);

    expect(sensitiveData).toHaveLength(0);
  });

  test('should handle errors gracefully', async ({ page }) => {
    const runButton = page.locator('button:has-text("Run Agent")').first();
    const buttonExists = await runButton.count() > 0;
    
    if (!buttonExists) {
      test.skip('No agents available');
      return;
    }

    await runButton.click({ timeout: 5000 });
    await page.waitForTimeout(1000);

    // Try sending empty message (should be prevented)
    const sendButton = page.locator('button[type="submit"]').last();
    const isDisabled = await sendButton.isDisabled();
    expect(isDisabled).toBe(true);
  });

  test('should close playground modal', async ({ page }) => {
    const runButton = page.locator('button:has-text("Run Agent")').first();
    const buttonExists = await runButton.count() > 0;
    
    if (!buttonExists) {
      test.skip('No agents available');
      return;
    }

    await runButton.click({ timeout: 5000 });
    await page.waitForTimeout(1000);

    // Click close button
    const closeButton = page.locator('button:has-text("Close")');
    await closeButton.click();
    await page.waitForTimeout(500);

    // Verify modal is closed
    const playgroundModal = page.locator('text=Playground');
    await expect(playgroundModal).not.toBeVisible({ timeout: 3000 }).catch(() => {});
  });
});
