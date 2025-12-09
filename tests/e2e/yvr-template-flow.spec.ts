/**
 * E2E Test: YVR Airport Digital Twin Template Flow
 * Tests the complete user journey from marketplace to deployment
 */

import { test, expect } from '@playwright/test';

test.describe('YVR Template Implementation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to auth page (assuming login is required)
    await page.goto('/auth');
    
    // Wait for page to be stable
    await page.waitForLoadState('networkidle');
  });

  test('YVR template exists in database', async ({ page }) => {
    // This test verifies database state through the API
    const response = await page.request.get('/api/templates/YVR_AIRPORT_DIGITAL_TWIN');
    
    expect(response.ok()).toBeTruthy();
    const template = await response.json();
    
    expect(template.id).toBe('YVR_AIRPORT_DIGITAL_TWIN');
    expect(template.name).toBe('YVR Airport Operations Digital Twin');
    expect(template.slug).toBe('yvr-airport-digital-twin');
    expect(template.is_featured).toBe(true);
  });

  test('YVR template appears in marketplace grid', async ({ page }) => {
    // Login first (if required)
    // await loginHelper(page);
    
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');
    
    // Look for YVR template card
    const yvrCard = page.locator('[data-template-id="YVR_AIRPORT_DIGITAL_TWIN"]').or(
      page.locator('text=YVR Airport Operations Digital Twin')
    );
    
    await expect(yvrCard).toBeVisible({ timeout: 10000 });
  });

  test('YVR template preview opens with all tabs', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');
    
    // Click on YVR template
    await page.locator('text=YVR Airport').first().click();
    
    // Wait for preview modal
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    // Verify all tabs exist
    const tabs = [
      'Overview',
      'Blueprint', 
      'Preview',
      'Day in the Life',
      'Scenarios',
      'Deploy'
    ];
    
    for (const tab of tabs) {
      await expect(page.locator(`button:has-text("${tab}")`)).toBeVisible();
    }
  });

  test('Day in the Life tab shows all roles', async ({ page }) => {
    await page.goto('/marketplace');
    
    // Open YVR preview
    await page.locator('text=YVR Airport').first().click();
    await page.waitForSelector('[role="dialog"]');
    
    // Click Day in the Life tab
    await page.locator('button:has-text("Day in the Life")').click();
    
    // Verify all 3 roles are displayed
    const roles = [
      'Duty Manager',
      'Head of Baggage Operations',
      'Chief Sustainability Officer'
    ];
    
    for (const role of roles) {
      await expect(page.locator(`text=${role}`)).toBeVisible();
    }
  });

  test('Deploy tab shows cloud metadata', async ({ page }) => {
    await page.goto('/marketplace');
    
    // Open YVR preview
    await page.locator('text=YVR Airport').first().click();
    await page.waitForSelector('[role="dialog"]');
    
    // Click Deploy tab
    await page.locator('button:has-text("Deploy")').click();
    
    // Verify cloud provider sections
    const providers = ['AWS', 'Azure', 'GCP'];
    
    for (const provider of providers) {
      await expect(page.locator(`text=${provider}`)).toBeVisible();
    }
  });

  test('Use This Template navigates to builder', async ({ page }) => {
    await page.goto('/marketplace');
    
    // Open YVR preview
    await page.locator('text=YVR Airport').first().click();
    await page.waitForSelector('[role="dialog"]');
    
    // Click "Use This Template" button
    const useButton = page.locator('button:has-text("Use This Template")').or(
      page.locator('button:has-text("Use Template")')
    );
    
    await useButton.click();
    
    // Should navigate to builder
    await expect(page).toHaveURL(/\/builder/, { timeout: 10000 });
  });

  test('Builder loads with YVR template data', async ({ page }) => {
    // Navigate directly to builder with YVR template
    await page.goto('/builder?template=YVR_AIRPORT_DIGITAL_TWIN');
    await page.waitForLoadState('networkidle');
    
    // Verify template data is loaded
    await expect(page.locator('text=YVR Airport').or(
      page.locator('text=Aviation')
    )).toBeVisible({ timeout: 5000 });
    
    // Verify workflow actions exist
    await page.locator('text=Step 4').or(page.locator('button:has-text("Workflow")')).click();
    
    // Should have at least one workflow action
    const workflowActions = page.locator('[data-workflow-action]');
    await expect(workflowActions.first()).toBeVisible({ timeout: 5000 });
  });

  test('Workflow auto-repair prevents empty actions', async ({ page }) => {
    // This test verifies the auto-repair logic works
    await page.goto('/builder?template=YVR_AIRPORT_DIGITAL_TWIN');
    
    // Navigate to workflow step
    await page.locator('text=Step 4').or(page.locator('button:has-text("Workflow")')).click();
    
    // Check console for auto-repair logs
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('WorkflowAutoRepair')) {
        logs.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Workflow should have actions (either original or auto-added)
    const actionsList = page.locator('[data-workflow-actions-list]');
    await expect(actionsList).toBeVisible();
  });

  test('Analytics events are tracked', async ({ page }) => {
    // Intercept analytics requests
    const analyticsRequests: any[] = [];
    
    page.on('request', request => {
      if (request.url().includes('audit_logs') || request.url().includes('analytics')) {
        analyticsRequests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        });
      }
    });
    
    await page.goto('/marketplace');
    
    // Open YVR preview (should track preview_viewed)
    await page.locator('text=YVR Airport').first().click();
    await page.waitForTimeout(1000);
    
    // Click Use This Template (should track use_clicked)
    const useButton = page.locator('button:has-text("Use This Template")');
    if (await useButton.isVisible()) {
      await useButton.click();
    }
    
    // Verify analytics events were sent
    expect(analyticsRequests.length).toBeGreaterThan(0);
  });
});
