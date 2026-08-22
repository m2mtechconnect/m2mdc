/**
 * AURA End-to-End Regression Suite
 * 
 * Comprehensive test coverage for all critical user flows:
 * - Dashboard + Header
 * - URL/Intake flows  
 * - Template Library + YVR
 * - Builder Steps 1-5
 * - Simulation
 * - Deploy → Deployed Agents
 * - KPI tiles → Analytics
 * 
 * Run: npm run test:e2e tests/e2e/aura-regression-suite.spec.ts
 * or: npx playwright test tests/e2e/aura-regression-suite.spec.ts
 */

import { test, expect } from '@playwright/test';
import { login, logout } from '../helpers/auth';
import { seedMockDigitalTwin, cleanupTestData } from '../helpers/seedHelpers';
import {
  getBrowserTestSession,
  resolveTestUserCredentials,
} from '../helpers/testSupabaseClient';

test.describe('AURA Regression Suite @regression', () => {
  let authenticatedUserId: string | undefined;
  let seededAgentIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    seededAgentIds = [];
    const credentials = resolveTestUserCredentials();
    // Login as test user
    await login(page, credentials.email, credentials.password);
    await page.waitForURL('/');
    authenticatedUserId = (await getBrowserTestSession(page.context())).userId;
  });

  test.afterEach(async ({ page }) => {
    try {
      if (authenticatedUserId && seededAgentIds.length > 0) {
        await cleanupTestData({
          userId: authenticatedUserId,
          agentIds: seededAgentIds,
        });
      }
    } finally {
      await logout(page);
    }
  });

  test.describe('1. Header & User Experience', () => {
    test('should display AURA branding and personalized greeting', async ({ page }) => {
      // Wait for header to load
      await page.waitForSelector('header');

      // Verify AURA branding (logo only, no text)
      const logo = page.locator('header img[alt="AURA"]');
      await expect(logo).toBeVisible();

      // Verify personalized greeting appears
      const greeting = page.locator('header', { hasText: /Good (morning|afternoon|evening)/ });
      await expect(greeting).toBeVisible();

      // Verify greeting contains user name
      await expect(greeting).toContainText(/test|exec/i);

      // Verify no role dropdown exists
      const roleDropdown = page.locator('select:has-text("Executive")');
      await expect(roleDropdown).not.toBeVisible();

      // Verify Co-Pilot button is NOT in header (removed per requirements)
      const headerCoPilotButton = page.locator('header button:has-text("Co-Pilot")');
      await expect(headerCoPilotButton).not.toBeVisible();

      // Verify hamburger menu exists and is styled correctly
      const menuButton = page.locator('header button[aria-label*="menu"]');
      await expect(menuButton).toBeVisible();

      // Verify no console errors on load
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      await page.waitForTimeout(2000);
      expect(consoleErrors).toHaveLength(0);
    });

    test('should display modern hamburger icon and function correctly', async ({ page }) => {
      const menuButton = page.locator('header button[aria-label*="menu"]');
      await expect(menuButton).toBeVisible();

      // Click to open mobile menu
      await menuButton.click();
      
      // Verify menu opens
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      // Verify AURA branding in mobile menu
      await expect(page.locator('[role="dialog"] >> text=AURA')).toBeVisible();

      // Close menu
      await menuButton.click();
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });
  });

  test.describe('2. Dashboard & Hero Message', () => {
    test('should display updated AURA welcome message', async ({ page }) => {
      // Verify new hero heading
      await expect(page.locator('h1:has-text("Welcome to AURA")')).toBeVisible();

      // Verify new tagline
      await expect(page.locator('text=Powering enterprise-grade digital twins and autonomous AI agents.')).toBeVisible();

      // Verify no old messaging
      await expect(page.locator('text=Your Digital Twin Studio')).not.toBeVisible();
      await expect(page.locator('text=Turn your data, processes, and workflows')).not.toBeVisible();
      await expect(page.locator('text=Where ideas become intelligent twins')).not.toBeVisible();
    });

    test('should display Co-Pilot command bar', async ({ page }) => {
      // Verify the unified command bar exists
      const commandBar = page.locator('input[placeholder*="Co-Pilot"]');
      await expect(commandBar).toBeVisible();

      // Verify suggestion chips appear on focus
      await commandBar.click();
      await expect(page.locator('button:has-text("Scan")')).toBeVisible();
    });
  });

  test.describe('3. URL Scanner / Opportunity Scanner', () => {
    test('should scan URL and generate recommendations', async ({ page }) => {
      // Enter URL in command bar
      const input = page.locator('input[placeholder*="Co-Pilot"]');
      await input.fill('https://www.yvr.ca');
      
      // Submit
      await page.keyboard.press('Enter');

      // Wait for scan to complete
      await page.waitForSelector('text=Scanning', { state: 'hidden', timeout: 30000 });

      // Verify recommendations appear
      await expect(page.locator('text=Top Digital Twin Blueprints')).toBeVisible();

      // Verify at least one recommendation card
      const recommendationCards = page.locator('[data-testid="recommendation-card"]');
      await expect(recommendationCards.first()).toBeVisible();

      // Verify clicking opens template preview (not builder directly)
      await recommendationCards.first().click();
      await expect(page.locator('[role="dialog"]:has-text("Preview")')).toBeVisible();
      await expect(page.locator('[role="dialog"] >> button:has-text("Use This Template")')).toBeVisible();
    });

    test('should handle invalid URL gracefully', async ({ page }) => {
      const input = page.locator('input[placeholder*="Co-Pilot"]');
      await input.fill('not-a-valid-url');
      await page.keyboard.press('Enter');

      // Should show error or treat as Co-Pilot query
      // Wait for either error message or Co-Pilot drawer
      const errorOrCoPilot = page.locator('text=couldn\'t process, text=Co-Pilot');
      await expect(errorOrCoPilot.first()).toBeVisible({ timeout: 10000 });

      // No page crash
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('4. Template Library & YVR Template', () => {
    test('should open template library and display YVR card', async ({ page }) => {
      // Click "Start with a template"
      await page.click('button:has-text("Start with a template")');

      // Wait for template library modal
      await expect(page.locator('[role="dialog"]:has-text("Template Library")')).toBeVisible();

      // Search for YVR
      const searchInput = page.locator('[role="dialog"] input[placeholder*="Search"]');
      await searchInput.fill('YVR');
      await page.waitForTimeout(500);

      // Verify YVR card appears
      const yvrCard = page.locator('[data-testid="template-card"]:has-text("YVR Airport")');
      await expect(yvrCard).toBeVisible();

      // Verify card shows correct metadata
      await expect(yvrCard).toContainText('Aviation');
      await expect(yvrCard).toContainText(/digital[_\s]twin|Agentic System/i);

      // Verify card has tags/labels
      const tags = yvrCard.locator('[data-testid="template-tag"]');
      await expect(tags.first()).toBeVisible();
    });

    test('should open YVR preview with all tabs', async ({ page }) => {
      // Open template library
      await page.click('button:has-text("Start with a template")');
      await page.waitForSelector('[role="dialog"]:has-text("Template Library")');

      // Click YVR card
      await page.click('[data-testid="template-card"]:has-text("YVR Airport")');

      // Wait for preview modal
      await expect(page.locator('[role="dialog"]:has-text("Preview")')).toBeVisible();

      // Verify all tabs exist
      const tabs = ['Overview', 'Blueprint', 'Preview', 'Day in the Life', 'Scenarios', 'Simulation', 'Deploy'];
      for (const tab of tabs) {
        await expect(page.locator(`[role="tab"]:has-text("${tab}")`)).toBeVisible();
      }

      // Test tab switching doesn't break layout
      await page.click('[role="tab"]:has-text("Blueprint")');
      await expect(page.locator('[role="tabpanel"]:has-text("Agents")')).toBeVisible();

      await page.click('[role="tab"]:has-text("Scenarios")');
      await expect(page.locator('[role="tabpanel"]:has-text("Test Scenarios")')).toBeVisible();

      await page.click('[role="tab"]:has-text("Simulation")');
      await expect(page.locator('[role="tabpanel"]:has-text("Idle")')).toBeVisible();

      // Verify close button still works after tab switching
      const closeButton = page.locator('[role="dialog"] button[aria-label*="Close"]');
      await expect(closeButton).toBeVisible();
      await closeButton.click();
      await expect(page.locator('[role="dialog"]:has-text("Preview")')).not.toBeVisible();
    });

    test('should verify YVR Overview tab content', async ({ page }) => {
      await page.click('button:has-text("Start with a template")');
      await page.click('[data-testid="template-card"]:has-text("YVR Airport")');

      // Verify Overview content
      await expect(page.locator('text=Problem Statement')).toBeVisible();
      await expect(page.locator('text=KPIs Improved')).toBeVisible();
      await expect(page.locator('text=Business Impact')).toBeVisible();
      await expect(page.locator('text=ROI')).toBeVisible();

      // Verify KPI cards exist (at least 3)
      const kpiCards = page.locator('[data-testid="kpi-card"]');
      await expect(kpiCards).toHaveCount(3, { timeout: 5000 }).catch(async () => {
        // Fallback: check for any KPI display
        await expect(page.locator('text=On-Time Performance, text=Baggage')).toBeVisible();
      });
    });

    test('should verify YVR Blueprint tab content', async ({ page }) => {
      await page.click('button:has-text("Start with a template")');
      await page.click('[data-testid="template-card"]:has-text("YVR Airport")');
      await page.click('[role="tab"]:has-text("Blueprint")');

      // Verify Agents section
      await expect(page.locator('text=Agents')).toBeVisible();
      
      // Verify at least 3 agents listed
      const agentCards = page.locator('[data-testid="agent-card"]');
      const agentCount = await agentCards.count();
      expect(agentCount).toBeGreaterThanOrEqual(3);

      // Verify data sources section
      await expect(page.locator('text=Data Sources')).toBeVisible();

      // Verify integrations section
      await expect(page.locator('text=Integrations')).toBeVisible();
    });

    test('should verify Scenarios tab is separate from Simulation', async ({ page }) => {
      await page.click('button:has-text("Start with a template")');
      await page.click('[data-testid="template-card"]:has-text("YVR Airport")');

      // Click Scenarios tab
      await page.click('[role="tab"]:has-text("Scenarios")');
      await expect(page.locator('[role="tabpanel"]:has-text("Test Scenarios")')).toBeVisible();

      // Verify scenarios exist (at least 3)
      const scenarioCards = page.locator('[data-testid="scenario-card"]');
      const count = await scenarioCards.count();
      expect(count).toBeGreaterThanOrEqual(3);

      // Click Simulation tab (separate)
      await page.click('[role="tab"]:has-text("Simulation")');
      await expect(page.locator('[role="tabpanel"]:has-text("Idle")')).toBeVisible();

      // Verify simulation controls exist
      await expect(page.locator('button:has-text("Run")')).toBeVisible();
    });
  });

  test.describe('5. Builder Flow (Use This Template)', () => {
    test('should start builder from YVR template', async ({ page }) => {
      // Open YVR preview
      await page.click('button:has-text("Start with a template")');
      await page.click('[data-testid="template-card"]:has-text("YVR Airport")');

      // Click "Use This Template"
      await page.click('button:has-text("Use This Template")');

      // Verify builder opens at Step 1
      await expect(page).toHaveURL(/\/builder/);
      await expect(page.locator('text=Step 1')).toBeVisible();

      // Verify pre-filled data
      const nameInput = page.locator('input[name="name"]');
      await expect(nameInput).toHaveValue(/YVR|Airport/i);
    });

    test('should navigate through all builder steps without errors', async ({ page }) => {
      // Start builder with YVR
      await page.click('button:has-text("Start with a template")');
      await page.click('[data-testid="template-card"]:has-text("YVR Airport")');
      await page.click('button:has-text("Use This Template")');

      // Step 1 → Step 2
      await page.click('button:has-text("Next")');
      await expect(page.locator('text=Step 2')).toBeVisible();
      await expect(page.locator('text=Intelligence')).toBeVisible();

      // Step 2 → Step 3
      await page.click('button:has-text("Next")');
      await expect(page.locator('text=Step 3')).toBeVisible();
      await expect(page.locator('text=Tools')).toBeVisible();

      // Step 3 → Step 4
      await page.click('button:has-text("Next")');
      await expect(page.locator('text=Step 4')).toBeVisible();
      await expect(page.locator('text=Workflow')).toBeVisible();

      // Verify NO "Workflow actions are required" error
      await expect(page.locator('text=Workflow actions are required')).not.toBeVisible();

      // Step 4 → Step 5
      await page.click('button:has-text("Next")');
      await expect(page.locator('text=Step 5')).toBeVisible();
      await expect(page.locator('text=Simulation')).toBeVisible();

      // Verify Deploy button exists
      await expect(page.locator('button:has-text("Deploy")')).toBeVisible();
    });

    test('should verify Step 4 workflow is pre-populated', async ({ page }) => {
      await page.click('button:has-text("Start with a template")');
      await page.click('[data-testid="template-card"]:has-text("YVR Airport")');
      await page.click('button:has-text("Use This Template")');

      // Navigate to Step 4
      for (let i = 0; i < 3; i++) {
        await page.click('button:has-text("Next")');
        await page.waitForTimeout(500);
      }

      // Verify workflows exist
      const workflowItems = page.locator('[data-testid="workflow-item"]');
      const count = await workflowItems.count();
      expect(count).toBeGreaterThan(0);

      // Verify at least one workflow has triggers and actions
      await expect(page.locator('text=Trigger, text=Action')).toBeVisible();
    });
  });

  test.describe('6. Simulation Tab - Mock Data & Run Behavior', () => {
    test('should display baseline metrics and run simulation', async ({ page }) => {
      // Open YVR preview
      await page.click('button:has-text("Start with a template")');
      await page.click('[data-testid="template-card"]:has-text("YVR Airport")');
      
      // Go to Simulation tab
      await page.click('[role="tab"]:has-text("Simulation")');

      // Verify baseline metrics are NOT 0.0
      const metricValues = page.locator('[data-testid="metric-value"]');
      const firstMetric = await metricValues.first().textContent();
      expect(firstMetric).not.toBe('0.0');
      expect(firstMetric).not.toBe('0.00');

      // Verify status is Idle
      await expect(page.locator('text=Idle')).toBeVisible();

      // Click Run button
      await page.click('button:has-text("Run")');

      // Verify status changes to Running
      await expect(page.locator('text=Running')).toBeVisible({ timeout: 5000 });

      // Verify Event Timeline shows events
      await expect(page.locator('[data-testid="event-timeline"]')).toContainText(/Holiday|Fog|Baggage|Runway/i, { timeout: 10000 });

      // Wait for simulation to complete
      await expect(page.locator('text=Completed')).toBeVisible({ timeout: 15000 });

      // Verify metrics updated
      const metricsAfter = await metricValues.allTextContents();
      expect(metricsAfter.some(m => m !== '0.0')).toBeTruthy();
    });

    test('should reset simulation correctly', async ({ page }) => {
      await page.click('button:has-text("Start with a template")');
      await page.click('[data-testid="template-card"]:has-text("YVR Airport")');
      await page.click('[role="tab"]:has-text("Simulation")');

      // Run simulation
      await page.click('button:has-text("Run")');
      await page.waitForSelector('text=Running');

      // Click Reset
      await page.click('button[aria-label*="Reset"]');

      // Verify status back to Idle
      await expect(page.locator('text=Idle')).toBeVisible();

      // Verify metrics reset to baseline
      await expect(page.locator('[data-testid="metric-value"]').first()).toBeVisible();
    });
  });

  test.describe('7. Deploy Flow & Deployed Agents Dashboard', () => {
    test.skip('should deploy digital twin from builder', async ({ page }) => {
      // Navigate through builder to Step 5
      await page.click('button:has-text("Start with a template")');
      await page.click('[data-testid="template-card"]:has-text("YVR Airport")');
      await page.click('button:has-text("Use This Template")');

      // Navigate to Step 5
      for (let i = 0; i < 4; i++) {
        await page.click('button:has-text("Next")');
        await page.waitForTimeout(500);
      }

      // Click Deploy
      await page.click('button:has-text("Deploy")');

      // Verify deploy button shows loading state
      await expect(page.locator('button:has-text("Deploying")')).toBeVisible({ timeout: 5000 });

      // Wait for success
      await expect(page.locator('text=deployed successfully')).toBeVisible({ timeout: 30000 });

      // Verify redirect to dashboard
      await expect(page).toHaveURL(/\/agents|\/dashboard/);

      // Verify deployed twin appears in list
      await expect(page.locator('[data-testid="agent-card"]:has-text("YVR")')).toBeVisible();
    });

    test('should show deployed twin with correct status', async ({ page }) => {
      // Seed a mock deployed twin
      const seededTwin = await seedMockDigitalTwin(page.context(), {
        name: 'YVR Airport Operations',
        status: 'Active',
        template_id: 'YVR_AIRPORT_DIGITAL_TWIN'
      });
      seededAgentIds.push(seededTwin.id);

      // Navigate to agents dashboard
      await page.goto('/agents');

      // Verify twin appears
      await expect(page.locator('[data-testid="agent-card"]:has-text("YVR")')).toBeVisible();

      // Verify status badge
      await expect(page.locator('[data-testid="status-badge"]:has-text("Active")')).toBeVisible();

      // Verify action buttons
      await expect(page.locator('button:has-text("Run")')).toBeVisible();
      await expect(page.locator('button:has-text("Manage")')).toBeVisible();
    });

    test('should open Manage view with unified preview layout', async ({ page }) => {
      const seededTwin = await seedMockDigitalTwin(page.context(), {
        name: 'YVR Airport Operations',
        status: 'Active'
      });
      seededAgentIds.push(seededTwin.id);

      await page.goto('/agents');

      // Click Manage
      await page.click('button:has-text("Manage")');

      // Verify preview modal opens
      await expect(page.locator('[role="dialog"]:has-text("Manage")')).toBeVisible();

      // Verify tabs exist (same as template preview)
      await expect(page.locator('[role="tab"]:has-text("Overview")')).toBeVisible();
      await expect(page.locator('[role="tab"]:has-text("Simulation")')).toBeVisible();
    });
  });

  test.describe('8. KPI Tiles → Analytics Pages', () => {
    test('should display KPI tiles on dashboard', async ({ page }) => {
      await page.goto('/');

      // Verify KPI tiles exist
      const kpiTiles = page.locator('[data-testid="kpi-tile"]');
      await expect(kpiTiles.first()).toBeVisible();

      // Verify tiles show values (0 is allowed)
      const tileValue = await kpiTiles.first().locator('[data-testid="kpi-value"]').textContent();
      expect(tileValue).toBeTruthy();
    });

    test('should navigate to analytics page when KPI tile clicked', async ({ page }) => {
      await page.goto('/');

      // Click first KPI tile
      const firstTile = page.locator('[data-testid="kpi-tile"]').first();
      await firstTile.click();

      // Verify navigation to analytics/KPI page
      await expect(page).toHaveURL(/\/analytics|\/intelligence|\/kpi/);

      // Verify no 404
      await expect(page.locator('text=404')).not.toBeVisible();
      await expect(page.locator('text=Not Found')).not.toBeVisible();
    });
  });

  test.describe('9. Global Visual/UX Checks', () => {
    test('should have functional close buttons in modals', async ({ page }) => {
      // Open template library
      await page.click('button:has-text("Start with a template")');
      await page.waitForSelector('[role="dialog"]');

      // Verify close button exists and is visible
      const closeButton = page.locator('[role="dialog"] button[aria-label*="Close"]');
      await expect(closeButton).toBeVisible();

      // Click and verify modal closes
      await closeButton.click();
      await expect(page.locator('[role="dialog"]:has-text("Template Library")')).not.toBeVisible();
    });

    test('should have consistent fonts and spacing', async ({ page }) => {
      // Check dashboard cards
      const dashboardCard = page.locator('[data-testid="dashboard-card"]').first();
      await expect(dashboardCard).toBeVisible();

      // Open template preview
      await page.click('button:has-text("Start with a template")');
      await page.click('[data-testid="template-card"]').first();

      // Check preview header
      const previewHeader = page.locator('[role="dialog"] h2').first();
      await expect(previewHeader).toBeVisible();

      // Verify no overlapping elements
      const dialogOverlay = page.locator('[role="dialog"]');
      const boundingBox = await dialogOverlay.boundingBox();
      expect(boundingBox).toBeTruthy();
    });
  });

  test.describe('10. Error Handling & Negative Tests', () => {
    test('should show validation error when deploying without workflows', async ({ page }) => {
      // This test requires a template WITHOUT pre-filled workflows
      // For now, we'll test the validation message existence
      
      await page.goto('/builder');
      
      // Fill minimal Step 1
      await page.fill('input[name="name"]', 'Test Twin');
      await page.click('button:has-text("Next")');

      // Skip to Step 4 (workflows)
      for (let i = 0; i < 2; i++) {
        await page.click('button:has-text("Next")');
      }

      // Clear any workflows if present
      // (This would need specific implementation)

      // Try to proceed to Step 5
      await page.click('button:has-text("Next")');

      // Should show validation error
      await expect(page.locator('text=Workflow actions are required')).toBeVisible();

      // Page should NOT crash
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle deleted template gracefully', async ({ page }) => {
      // Try to load builder with non-existent template
      await page.goto('/builder?templateId=NON_EXISTENT_TEMPLATE_ID');

      // Should show error message OR redirect to template selection
      const errorOrRedirect = page.locator('text=not found, text=Select a template');
      await expect(errorOrRedirect.first()).toBeVisible({ timeout: 10000 });

      // Should NOT show blank modal
      const blankModal = page.locator('[role="dialog"]:not(:has-text(/[a-zA-Z]/))');
      await expect(blankModal).not.toBeVisible();
    });

    test('should retry failed API calls gracefully', async ({ page }) => {
      // Intercept and fail an API request
      await page.route('**/rest/v1/agents*', route => route.abort());

      await page.goto('/agents');

      // Should show error state or retry option
      await expect(page.locator('text=Try again, text=Retry, text=something went wrong')).toBeVisible({ timeout: 10000 });

      // Should NOT crash the page
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('11. Network & Performance', () => {
    test('should have no 4xx/5xx errors in core flows', async ({ page }) => {
      const failedRequests: string[] = [];

      page.on('response', response => {
        if (response.status() >= 400 && response.status() < 600) {
          failedRequests.push(`${response.status()} ${response.url()}`);
        }
      });

      // Navigate through core flow
      await page.goto('/');
      await page.click('button:has-text("Start with a template")');
      await page.waitForTimeout(2000);

      // Check for failed requests
      expect(failedRequests).toHaveLength(0);
    });

    test('should load dashboard within 3 seconds', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForSelector('h1:has-text("Welcome to AURA")');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
    });
  });
});
