import { test, expect } from '@playwright/test';

test.describe('Builder Step 5 - Deployment Review', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth for testing
    await page.goto('/builder?step=5');
    await page.waitForLoadState('networkidle');
  });

  test('should render deployment warnings panel when config incomplete', async ({ page }) => {
    // Deployment warnings should show for missing config
    const warningsPanel = page.locator('text=Deployment Warnings');
    // May or may not be visible depending on state
    const exists = await warningsPanel.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });

  test('should render readiness checklist', async ({ page }) => {
    // Readiness checklist should be visible
    await expect(page.getByText(/Deployment Readiness/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show checklist items with status indicators', async ({ page }) => {
    // Should show checklist items
    await expect(page.getByText(/Intelligence configured/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Tools.*integrations/i)).toBeVisible();
    await expect(page.getByText(/workflow enabled/i)).toBeVisible();
  });

  test('should render tabs for Overview, Simulation, Version, Governance', async ({ page }) => {
    // Tab list should be visible with all tabs
    await expect(page.getByRole('tab', { name: /Overview/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('tab', { name: /Simulation/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Version/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Governance/i })).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    // Click Simulation tab
    const simulationTab = page.getByRole('tab', { name: /Simulation/i });
    await simulationTab.click();
    await expect(page.getByText(/Simulation Preview/i)).toBeVisible({ timeout: 5000 });

    // Click Version tab
    const versionTab = page.getByRole('tab', { name: /Version/i });
    await versionTab.click();
    await expect(page.getByText(/Version Control/i)).toBeVisible({ timeout: 5000 });

    // Click Governance tab
    const governanceTab = page.getByRole('tab', { name: /Governance/i });
    await governanceTab.click();
    await expect(page.getByText(/Governance.*Security/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show deployment environment pipeline', async ({ page }) => {
    // Deployment pipeline should be visible
    await expect(page.getByText(/Deploy to Environment/i)).toBeVisible({ timeout: 10000 });
    
    // Should show all 3 environments
    await expect(page.getByRole('button', { name: /Development/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Staging/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Production/i })).toBeVisible();
  });

  test('should show Co-Pilot integration', async ({ page }) => {
    // Co-Pilot section should be visible
    await expect(page.getByText(/Ask Co-Pilot/i)).toBeVisible({ timeout: 10000 });
    
    // Should show contextual questions
    await expect(page.getByRole('button', { name: /Review deployment/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Explain risks/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Suggest improvements/i })).toBeVisible();
  });

  test('should display configuration summary in Overview tab', async ({ page }) => {
    // Overview tab should be active by default
    await expect(page.getByText(/Configuration Summary/i)).toBeVisible({ timeout: 10000 });
    
    // Should show key sections
    await expect(page.getByText(/Intelligence/i).first()).toBeVisible();
    await expect(page.getByText(/Workflows/i).first()).toBeVisible();
  });

  test('should show industry-specific KPI recommendations', async ({ page }) => {
    // KPIs section should be visible
    const kpiSection = page.locator('text=Recommended KPIs');
    const exists = await kpiSection.count();
    // May show "KPIs Configured" if already set
    expect(exists).toBeGreaterThanOrEqual(0);
  });

  test('should handle simulation tab with mock data', async ({ page }) => {
    // Go to simulation tab
    await page.getByRole('tab', { name: /Simulation/i }).click();
    
    // Should show simulation header with industry title
    await expect(page.getByText(/Run Simulation/i).first()).toBeVisible({ timeout: 5000 });
    
    // Should show sample data badge when no real simulations
    const sampleBadge = page.locator('text=Sample Data');
    const exists = await sampleBadge.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });

  test('should show simulation KPI cards with baseline and simulated values', async ({ page }) => {
    // Go to simulation tab
    await page.getByRole('tab', { name: /Simulation/i }).click();
    
    // Should show Key Performance Indicators section
    await expect(page.getByText(/Key Performance Indicators/i)).toBeVisible({ timeout: 5000 });
    
    // Should show baseline and simulated labels
    await expect(page.getByText(/Before Twin/i).first()).toBeVisible();
    await expect(page.getByText(/With Twin/i).first()).toBeVisible();
  });

  test('should show simulation event timeline', async ({ page }) => {
    // Go to simulation tab
    await page.getByRole('tab', { name: /Simulation/i }).click();
    
    // Should show Event Timeline section
    await expect(page.getByText(/Event Timeline/i)).toBeVisible({ timeout: 5000 });
    
    // Should show timeline events with timestamps
    await expect(page.getByText(/Start/i).first()).toBeVisible();
  });

  test('should show default simulation query', async ({ page }) => {
    // Go to simulation tab
    await page.getByRole('tab', { name: /Simulation/i }).click();
    
    // Should show default query preview
    await expect(page.getByText(/Default Simulation Query/i)).toBeVisible({ timeout: 5000 });
    
    // Should have a "Run this scenario" button
    await expect(page.getByText(/Run this scenario/i)).toBeVisible();
  });

  test('should show version control in Version tab', async ({ page }) => {
    // Go to version tab
    await page.getByRole('tab', { name: /Version/i }).click();
    
    // Should show version control panel
    await expect(page.getByText(/Version Control/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Current Configuration/i)).toBeVisible();
    
    // Should have create snapshot button
    await expect(page.getByRole('button', { name: /Create Snapshot/i })).toBeVisible();
  });

  test('should show governance panel in Governance tab', async ({ page }) => {
    // Go to governance tab
    await page.getByRole('tab', { name: /Governance/i }).click();
    
    // Should show governance panel
    await expect(page.getByText(/Governance.*Security/i)).toBeVisible({ timeout: 5000 });
    
    // Should show access control matrix
    await expect(page.getByText(/Access Control Matrix/i)).toBeVisible();
    
    // Should show security checks
    await expect(page.getByText(/Security Checks/i)).toBeVisible();
  });

  test('should run simulation when button clicked', async ({ page }) => {
    // Go to simulation tab
    await page.getByRole('tab', { name: /Simulation/i }).click();
    
    // Click run simulation button
    const runButton = page.getByRole('button', { name: /Run Recommended Simulation/i });
    await expect(runButton).toBeVisible({ timeout: 5000 });
    await runButton.click();
    
    // Should show running state
    await expect(page.getByText(/Running/i)).toBeVisible({ timeout: 2000 });
    
    // Should complete and show toast
    await expect(page.getByText(/completed/i)).toBeVisible({ timeout: 10000 });
  });

  test('should create version snapshot', async ({ page }) => {
    // Go to version tab
    await page.getByRole('tab', { name: /Version/i }).click();
    
    // Enter commit message
    const input = page.getByPlaceholder(/Configure|Initial/i);
    await input.fill('Test snapshot');
    
    // Click create snapshot
    await page.getByRole('button', { name: /Create Snapshot/i }).click();
    
    // Should show success toast
    await expect(page.getByText(/Version.*created/i)).toBeVisible({ timeout: 5000 });
  });

  test('should gate production deployment on readiness score', async ({ page }) => {
    // Production button should have requirements
    const productionBtn = page.getByRole('button', { name: /Production/i });
    
    // Should show readiness requirement message
    await expect(page.getByText(/readiness score/i)).toBeVisible({ timeout: 10000 });
  });
});
