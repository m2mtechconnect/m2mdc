import { test, expect } from '@playwright/test';

/**
 * Complete AOC Flow Tests
 * Tests all major user flows from different entry points to AOC
 */

test.describe('AOC Complete Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@aura.com');
    await page.fill('input[type="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await expect(page.locator('h1:has-text("Welcome")')).toBeVisible();
  });

  test.describe('Template → Build → Deploy → Manage Flow', () => {
    test('complete template to AOC workflow', async ({ page }) => {
      // Step 1: Browse templates
      await page.goto('/templates');
      await expect(page.locator('h1')).toContainText('Templates');
      
      // Step 2: Select YVR template
      await page.click('text=YVR Airport Digital Twin');
      await expect(page.locator('text=Overview')).toBeVisible();
      
      // Step 3: Use template
      await page.click('button:has-text("Use This Template")');
      await expect(page.url()).toContain('/builder');
      
      // Step 4: Configure agent (Step 1)
      const agentName = `Test Agent ${Date.now()}`;
      await page.fill('[name="name"]', agentName);
      await page.fill('[name="description"]', 'E2E test agent');
      await page.click('button:has-text("Next")');
      
      // Step 5: Review agents (Step 2) - should be pre-populated
      await expect(page.locator('text=Agent Configuration')).toBeVisible();
      await page.click('button:has-text("Next")');
      
      // Step 6: Review data sources (Step 3) - should be pre-populated
      await expect(page.locator('text=Data Sources')).toBeVisible();
      await page.click('button:has-text("Next")');
      
      // Step 7: Review workflows (Step 4) - should be pre-populated
      await expect(page.locator('text=Workflows')).toBeVisible();
      await page.click('button:has-text("Next")');
      
      // Step 8: Review KPIs (Step 5)
      await expect(page.locator('text=KPIs')).toBeVisible();
      await page.click('button:has-text("Next")');
      
      // Step 9: Deploy
      await page.click('button:has-text("Deploy")');
      await expect(page.locator('text=Deploying')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Successfully deployed')).toBeVisible({ timeout: 30000 });
      
      // Step 10: Navigate to AOC
      await page.click('button:has-text("Manage Agent")');
      
      // Step 11: Verify AOC loaded
      await expect(page.url()).toContain('/operations');
      await expect(page.locator('text=Agent Operations')).toBeVisible();
      
      // Step 12: Verify all panels loaded
      await expect(page.locator('.activity-stream')).toBeVisible();
      await expect(page.locator('.metrics-panel')).toBeVisible();
      await expect(page.locator('.workflow-graph')).toBeVisible();
      await expect(page.locator('.control-panel')).toBeVisible();
      
      // Step 13: Verify agent name displayed
      await expect(page.locator(`text=${agentName}`)).toBeVisible();
      
      // Step 14: Test runtime control
      await page.click('button:has-text("Start")');
      await expect(page.locator('.status-badge:has-text("Active")')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Scanner → Build → Deploy → Manage Flow', () => {
    test('URL scanner to AOC workflow', async ({ page }) => {
      // Step 1: Navigate to home
      await page.goto('/');
      
      // Step 2: Enter URL and scan
      const urlInput = page.locator('input[placeholder*="website"]');
      await urlInput.fill('https://example-airport.com');
      await page.click('button:has-text("Scan")');
      
      // Step 3: Wait for analysis
      await expect(page.locator('text=Analyzing')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Analysis Complete')).toBeVisible({ timeout: 30000 });
      
      // Step 4: Review recommendations
      await expect(page.locator('text=Recommended Template')).toBeVisible();
      
      // Step 5: Build agent
      await page.click('button:has-text("Build Agent")');
      await expect(page.url()).toContain('/builder');
      
      // Step 6: Complete builder (condensed for speed)
      const agentName = `Scanner Agent ${Date.now()}`;
      await page.fill('[name="name"]', agentName);
      
      // Quick navigate through steps
      for (let i = 0; i < 5; i++) {
        await page.click('button:has-text("Next")');
        await page.waitForTimeout(500);
      }
      
      // Step 7: Deploy
      await page.click('button:has-text("Deploy")');
      await expect(page.locator('text=Successfully deployed')).toBeVisible({ timeout: 30000 });
      
      // Step 8: Open AOC
      await page.click('button:has-text("Manage Agent")');
      
      // Step 9: Verify AOC
      await expect(page.url()).toContain('/operations');
      await expect(page.locator('text=Agent Operations')).toBeVisible();
    });
  });

  test.describe('Quick Access Navigation', () => {
    test('navigate to AOC via quick access dropdown', async ({ page }) => {
      // Pre-condition: Create an active agent
      await page.goto('/agents');
      
      // Find first active agent
      const activeAgent = page.locator('.agent-card').filter({ hasText: 'Active' }).first();
      const agentName = await activeAgent.locator('.agent-name').textContent();
      
      // Step 1: Click Operations dropdown in header
      await page.click('button:has-text("Operations")');
      
      // Step 2: Verify dropdown shows active agents
      await expect(page.locator('.dropdown-menu')).toBeVisible();
      await expect(page.locator(`.dropdown-menu:has-text("${agentName}")`)).toBeVisible();
      
      // Step 3: Click agent in dropdown
      await page.click(`.dropdown-menu >> text=${agentName}`);
      
      // Step 4: Verify navigated to AOC
      await expect(page.url()).toContain('/operations');
      await expect(page.locator(`text=${agentName}`)).toBeVisible();
    });
  });

  test.describe('Runtime Controls', () => {
    test('start, pause, stop, restart agent', async ({ page }) => {
      // Navigate to AOC for test agent
      await page.goto('/agents');
      const testAgent = page.locator('.agent-card').first();
      await testAgent.locator('button:has-text("Manage")').click();
      
      await expect(page.url()).toContain('/operations');
      
      // Test Start
      await page.click('button:has-text("Start")');
      await expect(page.locator('.status-badge:has-text("Active")')).toBeVisible({ timeout: 15000 });
      
      // Verify logs streaming
      await expect(page.locator('.log-entry')).toHaveCount.greaterThan(0, { timeout: 10000 });
      
      // Test Pause
      await page.click('.status-indicator');
      await page.click('text=Pause Agent');
      await expect(page.locator('.status-badge:has-text("Paused")')).toBeVisible({ timeout: 5000 });
      
      // Test Resume
      await page.click('.status-indicator');
      await page.click('text=Resume');
      await expect(page.locator('.status-badge:has-text("Active")')).toBeVisible({ timeout: 5000 });
      
      // Test Stop
      await page.click('.status-indicator');
      await page.click('text=Stop Agent');
      await page.click('button:has-text("Confirm")');
      await expect(page.locator('.status-badge:has-text("Stopped")')).toBeVisible({ timeout: 5000 });
      
      // Test Restart
      await page.click('.status-indicator');
      await page.click('text=Restart');
      await expect(page.locator('.status-badge:has-text("Active")')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Panel Functionality', () => {
    test('all panels load and display data', async ({ page }) => {
      // Navigate to AOC
      await page.goto('/agents');
      await page.locator('.agent-card').first().locator('button:has-text("Manage")').click();
      
      // Activity Stream Panel
      await expect(page.locator('.activity-stream')).toBeVisible();
      await expect(page.locator('.log-entry')).toHaveCount.greaterThan(0, { timeout: 10000 });
      
      // Metrics Panel
      await expect(page.locator('.metrics-panel')).toBeVisible();
      await expect(page.locator('[data-metric="success-rate"]')).toBeVisible();
      await expect(page.locator('[data-metric="avg-latency"]')).toBeVisible();
      await expect(page.locator('[data-metric="total-runs"]')).toBeVisible();
      
      // Control Panel
      await expect(page.locator('.control-panel')).toBeVisible();
      await expect(page.locator('.status-indicator')).toBeVisible();
      
      // Workflow Graph
      await expect(page.locator('.workflow-graph')).toBeVisible();
      // Wait for graph to render
      await expect(page.locator('.workflow-node')).toHaveCount.greaterThan(0, { timeout: 5000 });
      
      // Recent Activity
      await expect(page.locator('.recent-activity')).toBeVisible();
    });

    test('real-time log streaming works', async ({ page }) => {
      // Navigate to AOC with active agent
      await page.goto('/agents');
      const activeAgent = page.locator('.agent-card').filter({ hasText: 'Active' }).first();
      await activeAgent.locator('button:has-text("Manage")').click();
      
      // Get initial log count
      const initialCount = await page.locator('.log-entry').count();
      
      // Wait for new logs (real-time streaming)
      await page.waitForTimeout(5000);
      
      // Verify new logs appeared
      const newCount = await page.locator('.log-entry').count();
      expect(newCount).toBeGreaterThan(initialCount);
    });

    test('metrics update in real-time', async ({ page }) => {
      // Navigate to AOC
      await page.goto('/agents');
      await page.locator('.agent-card').first().locator('button:has-text("Manage")').click();
      
      // Get initial total runs
      const initialRuns = await page.locator('[data-metric="total-runs"]').textContent();
      
      // Trigger test run via edge function
      await page.click('button:has-text("Test Run")');
      
      // Wait for metrics to update
      await page.waitForTimeout(3000);
      
      // Verify total runs increased
      const newRuns = await page.locator('[data-metric="total-runs"]').textContent();
      expect(parseInt(newRuns!)).toBeGreaterThan(parseInt(initialRuns!));
    });
  });

  test.describe('Search and Filters', () => {
    test('command palette search works', async ({ page }) => {
      // Navigate to AOC
      await page.goto('/agents');
      await page.locator('.agent-card').first().locator('button:has-text("Manage")').click();
      
      // Open command palette
      await page.keyboard.press('Meta+K');
      await expect(page.locator('.command-palette')).toBeVisible();
      
      // Search for error logs
      await page.fill('.command-palette input', 'status:error');
      await page.keyboard.press('Enter');
      
      // Verify filtered results
      const logEntries = page.locator('.log-entry');
      const count = await logEntries.count();
      
      if (count > 0) {
        // Verify all visible logs are errors
        for (let i = 0; i < Math.min(count, 5); i++) {
          await expect(logEntries.nth(i)).toContainText('ERROR');
        }
      }
    });

    test('log level filters work', async ({ page }) => {
      // Navigate to AOC
      await page.goto('/agents');
      await page.locator('.agent-card').first().locator('button:has-text("Manage")').click();
      
      // Open filter menu
      await page.click('button[aria-label="Filter logs"]');
      
      // Select only ERROR level
      await page.click('text=Error');
      await page.click('button:has-text("Apply")');
      
      // Verify only error logs shown
      const errorLogs = page.locator('.log-entry:has-text("ERROR")');
      const allLogs = page.locator('.log-entry');
      
      const errorCount = await errorLogs.count();
      const totalCount = await allLogs.count();
      
      expect(errorCount).toBe(totalCount);
    });
  });

  test.describe('Workflow Visualization', () => {
    test('workflow graph renders and is interactive', async ({ page }) => {
      // Navigate to AOC
      await page.goto('/agents');
      await page.locator('.agent-card').first().locator('button:has-text("Manage")').click();
      
      // Wait for workflow graph to load
      await expect(page.locator('.workflow-graph')).toBeVisible();
      await expect(page.locator('.workflow-node')).toHaveCount.greaterThan(0, { timeout: 5000 });
      
      // Click on a node
      const firstNode = page.locator('.workflow-node').first();
      await firstNode.click();
      
      // Verify node details drawer opens
      await expect(page.locator('.node-details-drawer')).toBeVisible();
      
      // Verify node details displayed
      await expect(page.locator('.node-details-drawer')).toContainText('Execution Count');
      await expect(page.locator('.node-details-drawer')).toContainText('Success Rate');
    });

    test('workflow graph highlights active execution path', async ({ page }) => {
      // Navigate to AOC with active agent
      await page.goto('/agents');
      const activeAgent = page.locator('.agent-card').filter({ hasText: 'Active' }).first();
      await activeAgent.locator('button:has-text("Manage")').click();
      
      // Wait for workflow graph
      await expect(page.locator('.workflow-graph')).toBeVisible();
      
      // Trigger a run
      await page.click('button:has-text("Test Run")');
      
      // Verify active nodes are highlighted
      await expect(page.locator('.workflow-node.active')).toHaveCount.greaterThan(0, { timeout: 10000 });
    });
  });

  test.describe('RBAC Enforcement', () => {
    test('viewer role has read-only access', async ({ page }) => {
      // Login as viewer
      await page.goto('/login');
      await page.fill('input[type="email"]', 'viewer@aura.com');
      await page.fill('input[type="password"]', 'Viewer123!@#');
      await page.click('button[type="submit"]');
      
      // Navigate to AOC
      await page.goto('/agents');
      await page.locator('.agent-card').first().locator('button:has-text("Manage")').click();
      
      // Verify control buttons are disabled
      await expect(page.locator('button:has-text("Start")')).toBeDisabled();
      await expect(page.locator('button:has-text("Stop")')).toBeDisabled();
      
      // Verify can view logs
      await expect(page.locator('.activity-stream')).toBeVisible();
    });

    test('operator can control but not configure', async ({ page }) => {
      // Login as operator
      await page.goto('/login');
      await page.fill('input[type="email"]', 'operator@aura.com');
      await page.fill('input[type="password"]', 'Operator123!@#');
      await page.click('button[type="submit"]');
      
      // Navigate to AOC
      await page.goto('/agents');
      await page.locator('.agent-card').first().locator('button:has-text("Manage")').click();
      
      // Verify control buttons are enabled
      await expect(page.locator('button:has-text("Start")')).not.toBeDisabled();
      
      // Verify settings are hidden
      await expect(page.locator('button:has-text("Configure")')).not.toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('AOC loads within 2 seconds', async ({ page }) => {
      const startTime = Date.now();
      
      // Navigate to AOC
      await page.goto('/agents');
      await page.locator('.agent-card').first().locator('button:has-text("Manage")').click();
      
      // Wait for key elements
      await expect(page.locator('.activity-stream')).toBeVisible();
      await expect(page.locator('.metrics-panel')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(2000);
    });

    test('log streaming has minimal latency', async ({ page }) => {
      // Navigate to AOC with active agent
      await page.goto('/agents');
      const activeAgent = page.locator('.agent-card').filter({ hasText: 'Active' }).first();
      await activeAgent.locator('button:has-text("Manage")').click();
      
      // Trigger action
      const actionTime = Date.now();
      await page.click('button:has-text("Test Action")');
      
      // Wait for log to appear
      await expect(page.locator('.log-entry:has-text("Test Action")')).toBeVisible();
      const logTime = Date.now();
      
      const latency = logTime - actionTime;
      
      // Verify latency < 200ms
      expect(latency).toBeLessThan(200);
    });
  });

  test.describe('Error Handling', () => {
    test('handles network errors gracefully', async ({ page }) => {
      // Navigate to AOC
      await page.goto('/agents');
      await page.locator('.agent-card').first().locator('button:has-text("Manage")').click();
      
      // Simulate network offline
      await page.context().setOffline(true);
      
      // Attempt action
      await page.click('button:has-text("Refresh")');
      
      // Verify error message displayed
      await expect(page.locator('text=Connection lost')).toBeVisible({ timeout: 5000 });
      
      // Restore network
      await page.context().setOffline(false);
      
      // Verify auto-reconnect
      await expect(page.locator('text=Connected')).toBeVisible({ timeout: 10000 });
    });

    test('handles API errors with user-friendly messages', async ({ page }) => {
      // Navigate to AOC
      await page.goto('/agents');
      await page.locator('.agent-card').first().locator('button:has-text("Manage")').click();
      
      // Trigger error (e.g., start agent with invalid config)
      await page.click('button:has-text("Start")');
      
      // If error occurs, verify friendly message
      const errorMessage = page.locator('.error-message');
      if (await errorMessage.isVisible({ timeout: 5000 })) {
        const text = await errorMessage.textContent();
        // Verify no raw error codes shown
        expect(text).not.toContain('500');
        expect(text).not.toContain('undefined');
        expect(text).not.toContain('null');
      }
    });
  });
});
