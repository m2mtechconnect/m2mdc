import { test, expect } from '@playwright/test';

test.describe('SSE Streaming', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.getByPlaceholder(/email/i).fill('test@m2m.studio');
    await page.getByPlaceholder(/password/i).fill('testpass123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/i, { timeout: 10000 });
  });

  test('should stream chat response with SSE', async ({ page }) => {
    await page.goto('/agents/test-agent-123/chat');
    await page.waitForLoadState('networkidle');

    // Mock SSE stream
    await page.route('**/functions/v1/agent-stream**', async (route) => {
      const streamChunks = [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" "}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"there!"}}]}\n\n',
        'data: [DONE]\n\n'
      ];

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        body: streamChunks.join('')
      });
    });

    // Send message
    await page.getByPlaceholder(/message|type/i).fill('Hi');
    await page.getByRole('button', { name: /send/i }).click();

    // Should see response appear progressively
    await expect(page.getByText(/Hello there!/i)).toBeVisible({ timeout: 5000 });
  });

  test('should reconnect SSE stream on connection drop', async ({ page }) => {
    await page.goto('/agents/test-agent-123/chat');
    
    let callCount = 0;
    await page.route('**/functions/v1/agent-stream**', async (route) => {
      callCount++;
      
      if (callCount === 1) {
        // First call: fail to simulate connection drop
        await route.abort('failed');
      } else {
        // Second call: succeed
        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
          body: 'data: {"choices":[{"delta":{"content":"Reconnected!"}}]}\n\ndata: [DONE]\n\n'
        });
      }
    });

    // Send message
    await page.getByPlaceholder(/message|type/i).fill('Test reconnect');
    await page.getByRole('button', { name: /send/i }).click();

    // Should eventually succeed after retry
    await expect(page.getByText(/Reconnected!/i)).toBeVisible({ timeout: 10000 });
    expect(callCount).toBeGreaterThan(1); // Should have retried
  });

  test('should handle 429 rate limit with exponential backoff', async ({ page }) => {
    await page.goto('/agents/test-agent-123/chat');

    let attemptCount = 0;
    await page.route('**/functions/v1/agent-stream**', async (route) => {
      attemptCount++;
      
      if (attemptCount < 3) {
        // Return 429 for first 2 attempts
        await route.fulfill({
          status: 429,
          body: JSON.stringify({ error: 'Rate limit exceeded' })
        });
      } else {
        // Succeed on 3rd attempt
        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
          body: 'data: {"choices":[{"delta":{"content":"Success after backoff"}}]}\n\ndata: [DONE]\n\n'
        });
      }
    });

    // Send message
    await page.getByPlaceholder(/message|type/i).fill('Test rate limit');
    await page.getByRole('button', { name: /send/i }).click();

    // Should show rate limit toast
    await expect(page.getByText(/rate limit|too many requests/i)).toBeVisible({ timeout: 3000 });

    // Should eventually succeed
    await expect(page.getByText(/Success after backoff/i)).toBeVisible({ timeout: 15000 });
  });

  test('should stream ingest progress with SSE', async ({ page }) => {
    // RAG upload is now in Step 3 (Configure Intelligence)
    await page.goto('/builder?step=3');
    await page.waitForLoadState('networkidle');

    // Mock ingest stream
    await page.route('**/functions/v1/ingest-file**', async (route) => {
      const streamChunks = [
        'data: {"status":"processing","progress":25}\n\n',
        'data: {"status":"processing","progress":50}\n\n',
        'data: {"status":"processing","progress":75}\n\n',
        'data: {"status":"complete","progress":100}\n\n'
      ];

      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: streamChunks.join('')
      });
    });

    // Navigate to RAG panel tab
    const ragTab = page.getByRole('tab', { name: /RAG|Knowledge|Upload/i });
    if (await ragTab.isVisible()) {
      await ragTab.click();
    }

    // Upload file (simulate)
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('test content')
      });

      // Should show progress
      await expect(page.getByText(/25%|50%|75%/)).toBeVisible({ timeout: 5000 });
      
      // Should complete
      await expect(page.getByText(/100%|complete/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('should handle SSE parse errors gracefully', async ({ page }) => {
    await page.goto('/agents/test-agent-123/chat');

    // Send malformed SSE data
    await page.route('**/functions/v1/agent-stream**', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: 'data: {invalid json\n\ndata: {"choices":[{"delta":{"content":"recovered"}}]}\n\ndata: [DONE]\n\n'
      });
    });

    await page.getByPlaceholder(/message|type/i).fill('Test parse error');
    await page.getByRole('button', { name: /send/i }).click();

    // Should handle error and continue with valid data
    await expect(page.getByText(/recovered/i)).toBeVisible({ timeout: 5000 });
  });

  test('should close SSE stream on navigation', async ({ page }) => {
    await page.goto('/agents/test-agent-123/chat');
    
    // Start streaming
    await page.route('**/functions/v1/agent-stream**', async (route) => {
      // Never complete to test cancellation
      await new Promise(() => {}); // Infinite wait
    });

    await page.getByPlaceholder(/message|type/i).fill('Test');
    await page.getByRole('button', { name: /send/i }).click();
    await page.waitForTimeout(1000);

    // Navigate away
    await page.goto('/dashboard');

    // Stream should be cancelled (no errors in console)
    const consoleLogs = [];
    page.on('console', msg => consoleLogs.push(msg.text()));
    
    await page.waitForTimeout(2000);
    const streamErrors = consoleLogs.filter(log => 
      log.includes('stream') && (log.includes('error') || log.includes('failed'))
    );
    expect(streamErrors.length).toBe(0);
  });
});
