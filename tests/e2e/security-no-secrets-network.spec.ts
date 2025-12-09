import { test, expect } from '@playwright/test';

test.describe('Security - No Secrets in Network', () => {
  const SENSITIVE_PATTERNS = [
    /OPENAI_API_KEY/i,
    /LOVABLE_API_KEY/i,
    /SUPABASE_SERVICE_ROLE_KEY/i,
    /AWS_SECRET_ACCESS_KEY/i,
    /MSFT_CLIENT_SECRET/i,
    /GOOGLE_APPLICATION_CREDENTIALS/i,
    /sk-[a-zA-Z0-9]{40,}/,  // OpenAI key pattern
    /service_role\./,        // Service role JWT pattern
  ];

  test('should not expose secrets in network requests', async ({ page }) => {
    const leakedSecrets: string[] = [];

    // Monitor all requests
    page.on('request', (request) => {
      const headers = request.headers();
      const postData = request.postData();
      
      // Check headers
      Object.entries(headers).forEach(([key, value]) => {
        SENSITIVE_PATTERNS.forEach(pattern => {
          if (pattern.test(key) || pattern.test(value)) {
            leakedSecrets.push(`Header ${key}: ${value.substring(0, 20)}...`);
          }
        });
      });

      // Check request body
      if (postData) {
        SENSITIVE_PATTERNS.forEach(pattern => {
          if (pattern.test(postData)) {
            leakedSecrets.push(`Request body contains sensitive pattern`);
          }
        });
      }
    });

    // Monitor all responses
    page.on('response', async (response) => {
      try {
        const text = await response.text();
        SENSITIVE_PATTERNS.forEach(pattern => {
          if (pattern.test(text)) {
            leakedSecrets.push(`Response from ${response.url()} contains sensitive pattern`);
          }
        });
      } catch (e) {
        // Ignore binary responses
      }
    });

    // Monitor console for leaked secrets
    page.on('console', (msg) => {
      const text = msg.text();
      SENSITIVE_PATTERNS.forEach(pattern => {
        if (pattern.test(text)) {
          leakedSecrets.push(`Console log contains sensitive pattern: ${text.substring(0, 50)}...`);
        }
      });
    });

    // Navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Interact with various features
    await page.click('text=Builder', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2000);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for violations
    expect(leakedSecrets, `Found ${leakedSecrets.length} secret leaks:\n${leakedSecrets.join('\n')}`).toHaveLength(0);
  });

  test('should only expose public anon key', async ({ page }) => {
    const exposedKeys: string[] = [];

    page.on('request', (request) => {
      const headers = request.headers();
      const apikey = headers['apikey'];
      
      if (apikey && !apikey.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')) {
        exposedKeys.push(`Non-standard API key in request: ${apikey.substring(0, 20)}...`);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(exposedKeys).toHaveLength(0);
  });

  test('should use JWT for authentication', async ({ page }) => {
    const authRequests: string[] = [];

    page.on('request', (request) => {
      const headers = request.headers();
      const auth = headers['authorization'];
      
      if (auth && request.url().includes('supabase.co')) {
        if (auth.startsWith('Bearer eyJ')) {
          authRequests.push('Valid JWT auth');
        } else {
          authRequests.push(`Invalid auth: ${auth.substring(0, 20)}...`);
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should have at least one valid JWT auth
    const validAuth = authRequests.filter(a => a.includes('Valid JWT'));
    expect(validAuth.length).toBeGreaterThan(0);
  });
});
