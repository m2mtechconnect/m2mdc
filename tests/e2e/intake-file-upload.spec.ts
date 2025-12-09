/**
 * E2E Test: File Upload → Gemini Analysis → Builder
 * Tests the complete flow from document upload through analysis to builder opening
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('File Upload Intake Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should upload a file, analyze it, and open builder with blueprint', async ({ page }) => {
    // Step 1: Click "Upload a file" button
    await page.click('text=Upload a file');
    
    // Wait for upload dialog
    await expect(page.locator('text=Upload & Analyze Document')).toBeVisible();
    
    // Verify stepper shows correct steps
    await expect(page.locator('text=Upload Document')).toBeVisible();
    await expect(page.locator('text=Gemini Analysis')).toBeVisible();
    await expect(page.locator('text=Convert to Twin / Agent')).toBeVisible();

    // Step 2: Upload a test file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'sample-brief-small.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Mock PDF content for testing'),
    });

    // Verify file is displayed
    await expect(page.locator('text=sample-brief-small.pdf')).toBeVisible();
    await expect(page.locator('[data-testid="file-size"]')).toContainText('KB');

    // Step 3: Click "Analyze Document"
    await page.click('button:has-text("Analyze Document")');

    // Verify analysis stage is shown
    await expect(page.locator('text=Analyzing with Gemini AI')).toBeVisible();
    
    // Check progress updates
    await expect(page.locator('text=Extracting text from file')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="progressbar"]')).toBeVisible();
    
    // Wait for progress to reach at least 50%
    await page.waitForFunction(() => {
      const progressBar = document.querySelector('[role="progressbar"]');
      const value = progressBar?.getAttribute('aria-valuenow');
      return value && parseInt(value) >= 50;
    }, { timeout: 10000 });

    // Step 4: Wait for analysis completion
    await expect(page.locator('text=Analysis complete!')).toBeVisible({ timeout: 30000 });
    
    // Verify results are displayed
    await expect(page.locator('text=Document Analysis Results')).toBeVisible();
    await expect(page.locator('text=Industry:')).toBeVisible();
    await expect(page.locator('text=Department:')).toBeVisible();
    await expect(page.locator('text=Recommended Type:')).toBeVisible();

    // Step 5: Select agent type and build in studio
    await page.click('label:has-text("Process Twin")');
    await page.click('button:has-text("Build in Studio")');

    // Step 6: Verify builder opens with pre-filled data
    await page.waitForURL(/\/builder\?/, { timeout: 10000 });
    
    // Verify Step 1 is pre-filled
    await expect(page.locator('input[placeholder*="name"]')).not.toBeEmpty();
    await expect(page.locator('textarea[placeholder*="description"]')).not.toBeEmpty();
    
    // Check for expected ROI cards
    await expect(page.locator('text=Expected ROI')).toBeVisible();
    await expect(page.locator('text=Time Saved')).toBeVisible();
    await expect(page.locator('text=Efficiency Gain')).toBeVisible();

    // Verify Step 2 has knowledge sources
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=Knowledge Sources')).toBeVisible();
    await expect(page.locator('text=sample-brief-small.pdf')).toBeVisible();

    // Verify Step 3 has recommended integrations
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=Recommended Integrations')).toBeVisible();

    // Verify Step 4 has workflow
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=Workflow Builder')).toBeVisible();
    
    // Check that workflow has nodes
    const workflowNodes = page.locator('[data-testid="workflow-node"]');
    await expect(workflowNodes).toHaveCount({ min: 1 });
  });

  test('should handle unsupported file type error', async ({ page }) => {
    await page.click('text=Upload a file');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'invalid.exe',
      mimeType: 'application/x-msdownload',
      buffer: Buffer.from('Invalid file'),
    });

    // Verify error toast appears
    await expect(page.locator('text=Unsupported file format')).toBeVisible();
    
    // Verify builder does not open
    await expect(page).not.toHaveURL(/\/builder/);
  });

  test('should handle file size limit error', async ({ page }) => {
    await page.click('text=Upload a file');
    
    // Create a mock large file (26MB)
    const largeBuffer = Buffer.alloc(26 * 1024 * 1024);
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'large-file.pdf',
      mimeType: 'application/pdf',
      buffer: largeBuffer,
    });

    // Verify error message
    await expect(page.locator('text=File too large')).toBeVisible();
    await expect(page.locator('text=Maximum 25MB allowed')).toBeVisible();
  });

  test('should handle analysis failure gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('**/functions/v1/document-analysis-start', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Analysis service unavailable' }),
      });
    });

    await page.click('text=Upload a file');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Test content'),
    });

    await page.click('button:has-text("Analyze Document")');

    // Verify error state
    await expect(page.locator('text=Analysis failed')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Try again")')).toBeVisible();
    
    // Verify builder does not open
    await expect(page).not.toHaveURL(/\/builder/);
  });

  test('should allow canceling analysis', async ({ page }) => {
    await page.click('text=Upload a file');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Test content'),
    });

    await page.click('button:has-text("Analyze Document")');
    
    // Wait for analysis to start
    await expect(page.locator('text=Analyzing with Gemini AI')).toBeVisible();
    
    // Click cancel
    await page.click('button:has-text("Cancel Analysis")');
    
    // Verify returned to upload stage
    await expect(page.locator('text=Drag & drop your file')).toBeVisible();
    
    // Verify builder does not open
    await expect(page).not.toHaveURL(/\/builder/);
  });

  test('should track analytics events correctly', async ({ page }) => {
    // Listen for analytics events
    const analyticsEvents: any[] = [];
    await page.on('console', msg => {
      if (msg.text().includes('[Telemetry]')) {
        analyticsEvents.push(msg.text());
      }
    });

    await page.click('text=Upload a file');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Test content'),
    });

    await page.click('button:has-text("Analyze Document")');
    
    // Wait for completion
    await expect(page.locator('text=Analysis complete!')).toBeVisible({ timeout: 30000 });
    
    await page.click('label:has-text("AI Agent")');
    await page.click('button:has-text("Build in Studio")');
    
    await page.waitForURL(/\/builder\?/, { timeout: 10000 });

    // Verify analytics events fired
    expect(analyticsEvents.some(e => e.includes('agent_intake.file_upload.completed'))).toBeTruthy();
    expect(analyticsEvents.some(e => e.includes('agent_intake.completed'))).toBeTruthy();
    expect(analyticsEvents.some(e => e.includes('agent_intake.builder_opened'))).toBeTruthy();
  });
});
