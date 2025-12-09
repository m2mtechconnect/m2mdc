import { test, expect } from '@playwright/test';

/**
 * Digital Twin Data Layer Tests
 * 
 * Tests the core data model, validation, and CRUD operations
 * for digital twins without testing the UI or runtime.
 */

test.describe('Digital Twin Data Layer @data-layer', () => {
  const testTwin = {
    name: 'Test Digital Twin',
    slug: 'test-digital-twin',
    description: 'A test digital twin for validation',
    status: 'draft' as const,
    config: {
      version: '1.0.0',
      entities: [
        {
          id: crypto.randomUUID(),
          type: 'system' as const,
          name: 'Test Entity',
          properties: {
            prop1: 'value1',
            prop2: 123,
          },
        },
      ],
      events: [
        {
          id: crypto.randomUUID(),
          type: 'create' as const,
          name: 'Test Event',
          description: 'A test event',
        },
      ],
      workflow: {
        nodes: [
          {
            id: crypto.randomUUID(),
            type: 'trigger' as const,
            name: 'Start Node',
            config: {},
          },
          {
            id: crypto.randomUUID(),
            type: 'end' as const,
            name: 'End Node',
            config: {},
          },
        ],
        entryPoint: '', // Will be set to first node ID
      },
    },
  };

  // Set entryPoint to first node
  testTwin.config.workflow.entryPoint = testTwin.config.workflow.nodes[0].id;

  test('should create a digital twin with valid config', async ({ request }) => {
    const response = await request.post('/functions/v1/digital-twin-create', {
      data: testTwin,
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    
    // Verify REST envelope format
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('correlationId');
    expect(body.data).toHaveProperty('twin');
    
    const twin = body.data.twin;
    expect(twin).toHaveProperty('id');
    expect(twin.name).toBe(testTwin.name);
    expect(twin.slug).toBe(testTwin.slug);
    expect(twin.status).toBe('draft');
    expect(twin.config.version).toBe('1.0.0');
    expect(twin.config.entities).toHaveLength(1);
    expect(twin.config.events).toHaveLength(1);
    expect(twin.config.workflow.nodes).toHaveLength(2);
  });

  test('should reject twin with invalid slug format', async ({ request }) => {
    const invalidTwin = {
      ...testTwin,
      slug: 'Invalid Slug With Spaces',
    };

    const response = await request.post('/functions/v1/digital-twin-create', {
      data: invalidTwin,
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  test('should reject twin with missing entities', async ({ request }) => {
    const invalidTwin = {
      ...testTwin,
      slug: 'test-no-entities',
      config: {
        ...testTwin.config,
        entities: [],
      },
    };

    const response = await request.post('/functions/v1/digital-twin-create', {
      data: invalidTwin,
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  test('should reject twin with invalid workflow entry point', async ({ request }) => {
    const invalidTwin = {
      ...testTwin,
      slug: 'test-invalid-entry',
      config: {
        ...testTwin.config,
        workflow: {
          ...testTwin.config.workflow,
          entryPoint: crypto.randomUUID(), // Non-existent node
        },
      },
    };

    const response = await request.post('/functions/v1/digital-twin-create', {
      data: invalidTwin,
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  test('should list digital twins with pagination', async ({ request }) => {
    // Create a twin first
    const createResponse = await request.post('/functions/v1/digital-twin-create', {
      data: { ...testTwin, slug: 'test-list-twin' },
    });
    expect(createResponse.ok()).toBeTruthy();

    // List twins
    const listResponse = await request.get('/functions/v1/digital-twin-list', {
      params: {
        limit: '10',
        offset: '0',
      },
    });

    expect(listResponse.ok()).toBeTruthy();
    const body = await listResponse.json();
    
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('twins');
    expect(body.data).toHaveProperty('pagination');
    expect(body.data.pagination).toHaveProperty('total');
    expect(body.data.pagination).toHaveProperty('limit', 10);
    expect(body.data.pagination).toHaveProperty('offset', 0);
    expect(Array.isArray(body.data.twins)).toBe(true);
  });

  test('should retrieve a specific twin by ID', async ({ request }) => {
    // Create a twin
    const createResponse = await request.post('/functions/v1/digital-twin-create', {
      data: { ...testTwin, slug: 'test-get-twin' },
    });
    const createBody = await createResponse.json();
    const twinId = createBody.data.twin.id;

    // Get the twin
    const getResponse = await request.get('/functions/v1/digital-twin-get', {
      params: { twinId },
    });

    expect(getResponse.ok()).toBeTruthy();
    const body = await getResponse.json();
    
    expect(body.success).toBe(true);
    expect(body.data.twin.id).toBe(twinId);
    expect(body.data.twin.name).toBe(testTwin.name);
  });

  test('should update a twin', async ({ request }) => {
    // Create a twin
    const createResponse = await request.post('/functions/v1/digital-twin-create', {
      data: { ...testTwin, slug: 'test-update-twin' },
    });
    const createBody = await createResponse.json();
    const twinId = createBody.data.twin.id;

    // Update the twin
    const updateResponse = await request.post('/functions/v1/digital-twin-update', {
      data: {
        twinId,
        name: 'Updated Twin Name',
        status: 'active',
      },
    });

    expect(updateResponse.ok()).toBeTruthy();
    const body = await updateResponse.json();
    
    expect(body.success).toBe(true);
    expect(body.data.twin.name).toBe('Updated Twin Name');
    expect(body.data.twin.status).toBe('active');
  });

  test('should delete a twin', async ({ request }) => {
    // Create a twin
    const createResponse = await request.post('/functions/v1/digital-twin-create', {
      data: { ...testTwin, slug: 'test-delete-twin' },
    });
    const createBody = await createResponse.json();
    const twinId = createBody.data.twin.id;

    // Delete the twin
    const deleteResponse = await request.post('/functions/v1/digital-twin-delete', {
      data: { twinId },
    });

    expect(deleteResponse.ok()).toBeTruthy();
    const body = await deleteResponse.json();
    expect(body.success).toBe(true);

    // Verify twin is deleted
    const getResponse = await request.get('/functions/v1/digital-twin-get', {
      params: { twinId },
    });
    expect(getResponse.status()).toBe(404);
  });

  test('should validate config structure persistence', async ({ request }) => {
    // Create a twin with complex config
    const complexTwin = {
      ...testTwin,
      slug: 'test-complex-config',
      config: {
        ...testTwin.config,
        metrics: [
          {
            id: crypto.randomUUID(),
            name: 'Test Metric',
            type: 'counter' as const,
            unit: 'requests',
            aggregation: 'sum' as const,
          },
        ],
        settings: {
          enableLogging: true,
          enableMetrics: true,
          enableHumanInLoop: false,
          maxConcurrentRuns: 5,
        },
      },
    };

    const createResponse = await request.post('/functions/v1/digital-twin-create', {
      data: complexTwin,
    });
    const createBody = await createResponse.json();
    const twinId = createBody.data.twin.id;

    // Retrieve and verify config structure
    const getResponse = await request.get('/functions/v1/digital-twin-get', {
      params: { twinId },
    });
    const getBody = await getResponse.json();

    expect(getBody.data.twin.config.metrics).toHaveLength(1);
    expect(getBody.data.twin.config.metrics[0].type).toBe('counter');
    expect(getBody.data.twin.config.settings.enableLogging).toBe(true);
    expect(getBody.data.twin.config.settings.maxConcurrentRuns).toBe(5);
  });
});
