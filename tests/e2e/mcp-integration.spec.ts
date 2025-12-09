import { test, expect } from '@playwright/test';

test.describe('MCP Server Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/builder?step=3');
    await page.waitForLoadState('networkidle');
  });

  test('should display MCP server manager in Step 3', async ({ page }) => {
    await expect(page.getByText(/MCP Servers.*Arcade/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Add MCP Server/i })).toBeVisible();
  });

  test('should open add server drawer', async ({ page }) => {
    await page.getByRole('button', { name: /Add MCP Server/i }).click();
    
    await expect(page.getByRole('heading', { name: /Register MCP Server/i })).toBeVisible();
    await expect(page.getByLabel(/Server Name/i)).toBeVisible();
    await expect(page.getByLabel(/Endpoint URL/i)).toBeVisible();
    await expect(page.getByLabel(/Transport/i)).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('button', { name: /Add MCP Server/i }).click();
    await page.getByRole('button', { name: /Register Server/i }).click();
    
    await expect(page.getByText(/Validation Error/i)).toBeVisible();
  });

  test('should register MCP server', async ({ page }) => {
    await page.getByRole('button', { name: /Add MCP Server/i }).click();
    
    await page.getByLabel(/Server Name/i).fill('test-mcp-server');
    await page.getByLabel(/Endpoint URL/i).fill('https://mcp-test.example.com');
    
    // Intercept API call
    await page.route('**/functions/v1/mcp-register', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          capabilities: {
            tools: [
              { name: 'test_tool', description: 'Test tool', schema: {} }
            ],
            resources: [],
            prompts: []
          }
        })
      });
    });
    
    await page.getByRole('button', { name: /Register Server/i }).click();
    
    await expect(page.getByText(/Server Registered/i)).toBeVisible();
  });

  test('should display server in table after registration', async ({ page }) => {
    // Mock existing server
    await page.route('**/rest/v1/intelligence_settings*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          mcp_servers: [
            {
              name: 'demo-server',
              endpoint: 'https://demo.mcp.example.com',
              transport: 'http-stream',
              status: 'active',
              capabilities: {
                tools: [
                  { name: 'get_status', description: 'Get system status', schema: {} }
                ]
              }
            }
          ],
          tool_allowlist: []
        })
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('demo-server')).toBeVisible();
    await expect(page.getByText(/1 tools/i)).toBeVisible();
  });

  test('should validate server', async ({ page }) => {
    // Setup mock server
    await page.route('**/rest/v1/intelligence_settings*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          mcp_servers: [{
            name: 'test-server',
            endpoint: 'https://test.mcp.example.com',
            transport: 'http-stream',
            status: 'active'
          }],
          tool_allowlist: []
        })
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Mock validate endpoint
    await page.route('**/functions/v1/mcp-validate', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          latency: 125
        })
      });
    });

    await page.getByRole('button', { name: /refresh/i }).first().click();
    
    await expect(page.getByText(/Validation Successful/i)).toBeVisible();
    await expect(page.getByText(/125ms/i)).toBeVisible();
  });

  test('should open configure tools dialog', async ({ page }) => {
    // Setup mock server with tools
    await page.route('**/rest/v1/intelligence_settings*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          mcp_servers: [{
            name: 'tool-server',
            endpoint: 'https://tools.mcp.example.com',
            transport: 'http-stream',
            status: 'active',
            capabilities: {
              tools: [
                { 
                  name: 'analyze_data', 
                  description: 'Analyze dataset', 
                  schema: { type: 'object', properties: {} }
                },
                { 
                  name: 'generate_report', 
                  description: 'Generate report', 
                  schema: { type: 'object', properties: {} }
                }
              ]
            }
          }],
          tool_allowlist: []
        })
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /settings/i }).first().click();
    
    await expect(page.getByRole('heading', { name: /Configure Tools/i })).toBeVisible();
    await expect(page.getByText('analyze_data')).toBeVisible();
    await expect(page.getByText('generate_report')).toBeVisible();
  });

  test('should enable and save tool allowlist', async ({ page }) => {
    // Setup mock
    await page.route('**/rest/v1/intelligence_settings*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            mcp_servers: [{
              name: 'tool-server',
              capabilities: {
                tools: [{ name: 'test_tool', description: 'Test', schema: {} }]
              }
            }],
            tool_allowlist: []
          })
        });
      } else if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true })
        });
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /settings/i }).first().click();
    
    // Toggle tool
    await page.getByRole('switch').first().click();
    
    await page.getByRole('button', { name: /Save Configuration/i }).click();
    
    await expect(page.getByText(/Allowlist Saved/i)).toBeVisible();
  });

  test('should test tool execution', async ({ page }) => {
    // Setup mock
    await page.route('**/rest/v1/intelligence_settings*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          mcp_servers: [{
            name: 'exec-server',
            capabilities: {
              tools: [{ name: 'exec_tool', description: 'Execute', schema: {} }]
            }
          }],
          tool_allowlist: ['exec-server:exec_tool']
        })
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /settings/i }).first().click();
    
    // Mock test endpoint
    await page.route('**/functions/v1/mcp-test-tool', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          latency: 89,
          result: { status: 'ok' }
        })
      });
    });

    await page.getByRole('button', { name: /play/i }).first().click();
    
    await expect(page.getByText(/Test Successful/i)).toBeVisible();
  });

  test('should delete server with confirmation', async ({ page }) => {
    // Setup mock
    await page.route('**/rest/v1/intelligence_settings*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            mcp_servers: [{ name: 'delete-me', endpoint: 'https://del.example.com', transport: 'http-stream' }],
            tool_allowlist: []
          })
        });
      } else if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true })
        });
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /trash/i }).first().click();
    
    await expect(page.getByRole('heading', { name: /Delete MCP Server/i })).toBeVisible();
    await expect(page.getByText(/irreversible/i)).toBeVisible();
    
    await page.getByRole('button', { name: /Delete Server/i, exact: true }).click();
    
    await expect(page.getByText(/Server Deleted/i)).toBeVisible();
  });

  test('should handle validation errors gracefully', async ({ page }) => {
    await page.getByRole('button', { name: /Add MCP Server/i }).click();
    
    await page.getByLabel(/Server Name/i).fill('error-server');
    await page.getByLabel(/Endpoint URL/i).fill('https://error.example.com');
    
    // Mock error response
    await page.route('**/functions/v1/mcp-register', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({
          error: 'Connection timeout: server did not respond'
        })
      });
    });
    
    await page.getByRole('button', { name: /Register Server/i }).click();
    
    await expect(page.getByText(/Registration Failed/i)).toBeVisible();
    await expect(page.getByText(/Connection timeout/i)).toBeVisible();
  });

  test('should be keyboard accessible', async ({ page }) => {
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /Add MCP Server/i })).toBeFocused();
    
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: /Register MCP Server/i })).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/MCP Servers.*Arcade/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Add MCP Server/i })).toBeVisible();
  });
});
