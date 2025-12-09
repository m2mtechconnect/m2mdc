import { test, expect } from '@playwright/test';

test.describe('CoPilot - Security & No Secrets', () => {
  const SENSITIVE_PATTERNS = [
    /LOVABLE_API_KEY/i,
    /SUPABASE_SERVICE_ROLE_KEY/i,
    /sk-[a-zA-Z0-9]{40,}/,  // API key pattern
    /Bearer\s+[a-zA-Z0-9_-]{100,}/,  // Long bearer tokens (service role)
  ];

  test('should not expose secrets in network traffic', async ({ page }) => {
    const leakedSecrets: string[] = [];

    // Monitor requests
    page.on('request', (request) => {
      const headers = request.headers();
      const postData = request.postData();

      // Check headers (except Authorization which should have user JWT)
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() === 'authorization') {
          // User JWT should NOT be a service role key
          if (value.includes('service_role')) {
            leakedSecrets.push(`Service role key in Authorization header`);
          }
        } else {
          SENSITIVE_PATTERNS.forEach(pattern => {
            if (pattern.test(key) || pattern.test(value)) {
              leakedSecrets.push(`Sensitive data in header ${key}`);
            }
          });
        }
      });

      // Check request body
      if (postData) {
        SENSITIVE_PATTERNS.forEach(pattern => {
          if (pattern.test(postData)) {
            leakedSecrets.push(`Sensitive data in request body to ${request.url()}`);
          }
        });
      }
    });

    // Monitor responses
    page.on('response', async (response) => {
      try {
        const text = await response.text();
        SENSITIVE_PATTERNS.forEach(pattern => {
          if (pattern.test(text)) {
            leakedSecrets.push(`Sensitive data in response from ${response.url()}`);
          }
        });
      } catch (e) {
        // Ignore binary responses
      }
    });

    // Monitor console
    page.on('console', (msg) => {
      const text = msg.text();
      SENSITIVE_PATTERNS.forEach(pattern => {
        if (pattern.test(text)) {
          leakedSecrets.push(`Sensitive data in console: ${text.substring(0, 50)}...`);
        }
      });
    });

    // Open Co-Pilot and interact
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(500);

    // Send a test query
    const input = page.locator('input[placeholder*="Ask"]');
    await input.fill('list all available agents');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);

    // Check for violations
    expect(leakedSecrets, `Found ${leakedSecrets.length} secret leaks:\n${leakedSecrets.join('\n')}`).toHaveLength(0);
  });

  test('should use proper authentication for edge functions', async ({ page }) => {
    const edgeFunctionCalls: { url: string; hasAuth: boolean }[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/functions/v1/')) {
        const auth = request.headers()['authorization'];
        edgeFunctionCalls.push({
          url,
          hasAuth: !!auth && auth.startsWith('Bearer ')
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(500);

    const input = page.locator('input[placeholder*="Ask"]');
    await input.fill('test query');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // All edge function calls should have authorization
    const unauthCalls = edgeFunctionCalls.filter(call => !call.hasAuth);
    expect(unauthCalls, `Unauthorized edge function calls: ${JSON.stringify(unauthCalls)}`).toHaveLength(0);
  });

  test('should handle rate limiting gracefully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(500);

    // Try to trigger rate limit (if it happens)
    const input = page.locator('input[placeholder*="Ask"]');
    
    for (let i = 0; i < 5; i++) {
      await input.fill(`test query ${i}`);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }

    // Check if rate limit error is displayed properly
    const errorMsg = page.locator('text=/rate limit|too many requests/i');
    if (await errorMsg.count() > 0) {
      // Rate limit error should be user-friendly
      await expect(errorMsg).toBeVisible();
    }
  });
});
