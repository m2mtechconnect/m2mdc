import { test, expect } from '@playwright/test';

test.describe('Zapier API Endpoints', () => {
  const baseUrl = 'https://mlhcdcvpvztfjfndmxzl.supabase.co/functions/v1';
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Login to get auth token
    const response = await request.post('https://mlhcdcvpvztfjfndmxzl.supabase.co/auth/v1/token?grant_type=password', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1saGNkY3Zwdnp0ZmpmbmRteHpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MzU1NDAsImV4cCI6MjA3NzUxMTU0MH0.OgcmUgCsCL2s2eOTPmZYPaDY_Fy-JwVNTVOfgA3mJSk',
        'Content-Type': 'application/json'
      },
      data: {
        email: 'test@m2m.studio',
        password: 'testpass123'
      }
    });

    const data = await response.json();
    authToken = data.access_token;
  });

  test('POST /zapier-connect should create integration', async ({ request }) => {
    const response = await request.post(`${baseUrl}/zapier-connect`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        app_key: 'salesforce',
        auth_type: 'oauth',
        api_key: 'test-api-key-123',
        webhook_url: 'https://hooks.zapier.com/test/123'
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('connected');
    expect(data.id).toBeTruthy();
  });

  test('POST /zapier-disconnect should remove integration', async ({ request }) => {
    const response = await request.post(`${baseUrl}/zapier-disconnect`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        app_key: 'salesforce'
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('disconnected');
  });

  test('GET /zapier-status should return connection status', async ({ request }) => {
    const response = await request.get(`${baseUrl}/zapier-status?app=salesforce`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('connected');
    expect(data).toHaveProperty('error_count');
  });

  test('POST /zapier-test should test connection', async ({ request }) => {
    const response = await request.post(`${baseUrl}/zapier-test?app=salesforce`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('latency');
  });

  test('POST /zapier-webhook/{integration_id} should process webhook', async ({ request }) => {
    // First create an integration to get ID
    const createResponse = await request.post(`${baseUrl}/zapier-connect`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        app_key: 'test-app',
        auth_type: 'webhook',
        webhook_url: 'https://hooks.zapier.com/test/456'
      }
    });

    const integration = await createResponse.json();

    // Send webhook
    const webhookResponse = await request.post(`${baseUrl}/zapier-webhook/${integration.id}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Zapier-Signature': 'test-signature'
      },
      data: {
        event: 'document.created',
        data: {
          id: 'doc-123',
          name: 'Test Document'
        }
      }
    });

    expect(webhookResponse.status()).toBe(200);
    const data = await webhookResponse.json();
    expect(data.status).toBe('processed');
  });

  test('webhook should verify HMAC signature', async ({ request }) => {
    // Try webhook without signature
    const response = await request.post(`${baseUrl}/zapier-webhook/test-integration-id`, {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        event: 'test.event'
      }
    });

    // Should reject without valid signature
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('should return 401 for unauthenticated requests', async ({ request }) => {
    const response = await request.post(`${baseUrl}/zapier-connect`, {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        app_key: 'test'
      }
    });

    expect(response.status()).toBe(401);
  });

  test('should enforce RLS on integration queries', async ({ request }) => {
    // Try to query integrations without auth
    const response = await request.get('https://mlhcdcvpvztfjfndmxzl.supabase.co/rest/v1/integrations', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1saGNkY3Zwdnp0ZmpmbmRteHpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MzU1NDAsImV4cCI6MjA3NzUxMTU0MH0.OgcmUgCsCL2s2eOTPmZYPaDY_Fy-JwVNTVOfgA3mJSk'
      }
    });

    // Should not return data without proper user auth
    const data = await response.json();
    expect(Array.isArray(data) ? data.length : 0).toBe(0);
  });
});
