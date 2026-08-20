import { test, expect } from '@playwright/test';
import {
  resolveTestSupabaseConfig,
  resolveTestUserCredentials,
} from '../helpers/testSupabaseClient';

test.describe('Zapier API Endpoints', () => {
  const testSupabase = resolveTestSupabaseConfig();
  const baseUrl = `${testSupabase.url}/functions/v1`;
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const credentials = resolveTestUserCredentials();
    // Login to get auth token
    const response = await request.post(`${testSupabase.url}/auth/v1/token?grant_type=password`, {
      headers: {
        apikey: testSupabase.anonKey,
        'Content-Type': 'application/json'
      },
      data: {
        email: credentials.email,
        password: credentials.password,
      }
    });

    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data.access_token).toEqual(expect.any(String));
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
        api_key: crypto.randomUUID(),
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
        'X-Zapier-Signature': crypto.randomUUID(),
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
    const response = await request.get(`${testSupabase.url}/rest/v1/integrations`, {
      headers: {
        apikey: testSupabase.anonKey,
      }
    });

    // Should not return data without proper user auth
    const data = await response.json();
    expect(Array.isArray(data) ? data.length : 0).toBe(0);
  });
});
