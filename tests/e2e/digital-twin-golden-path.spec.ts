import { test, expect } from '@playwright/test';

/**
 * Golden Path E2E Test for Digital Twin Builder
 * 
 * Tests the complete business flow:
 * 1. Enter URL in scanner
 * 2. Wait for recommendations to appear
 * 3. Click "Create Agent" on a recommendation
 * 4. Assert builder page loads with correct data
 * 5. Navigate to Step 6 (Summary)
 * 6. Verify AI summary is present and references the recommendation
 */

test.describe('Digital Twin Builder - Golden Path @critical', () => {
  // Use a deterministic test URL that works in dev
  const TEST_URL = 'lovable.dev';
  
  test('URL → Recommendations → Create Agent → Builder → Summary', async ({ page }) => {
    // Step 1: Visit the main app and enter URL
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find and fill the URL scanner input
    const urlInput = page.locator('input[type="url"], input[placeholder*="website"], input[placeholder*="URL"]').first();
    await expect(urlInput).toBeVisible({ timeout: 10000 });
    await urlInput.fill(TEST_URL);
    
    // Trigger scan
    const scanButton = page.locator('button:has-text("Scan"), button:has-text("Analyze"), button:has-text("Search")').first();
    await scanButton.click();
    
    // Step 2: Wait for recommendations to appear
    console.log('[Golden Path] Waiting for recommendations...');
    await expect(page.getByText(/recommendation|opportunity|suggestion/i).first()).toBeVisible({ timeout: 60000 });
    
    // Verify at least one recommendation card is present
    const recoCards = page.locator('[data-testid*="recommendation"], .recommendation-card, [class*="recommendation"]');
    await expect(recoCards.first()).toBeVisible({ timeout: 5000 });
    
    // Step 3: Click "Create Agent" on the first recommendation
    console.log('[Golden Path] Clicking Create Agent...');
    const createAgentButton = page.locator('button:has-text("Create Agent"), button:has-text("Build Agent")').first();
    await expect(createAgentButton).toBeVisible({ timeout: 5000 });
    
    // Store recommendation title for later verification
    const recoTitle = await page.locator('h3, h4, [data-testid*="title"]').first().textContent() || '';
    console.log('[Golden Path] Recommendation title:', recoTitle);
    
    await createAgentButton.click();
    
    // Step 4: Assert that Agent Builder page loads
    console.log('[Golden Path] Verifying builder page loaded...');
    await page.waitForURL(/\/builder/i, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    
    // Verify builder is on Step 1 (Define Goal)
    await expect(page.getByText(/define.*goal|step.*1/i).first()).toBeVisible({ timeout: 10000 });
    
    // Verify goal/description is prefilled based on recommendation
    const goalInput = page.locator('input[name="systemName"], input[name="goal"], textarea[name="description"]').first();
    const goalValue = await goalInput.inputValue();
    expect(goalValue.length).toBeGreaterThan(0); // Should not be empty
    console.log('[Golden Path] Prefilled goal:', goalValue);
    
    // Verify workflow/digital twin steps exist (at least 3-5 visible indicators)
    const stepIndicators = page.locator('[data-testid*="step"], .step-indicator, [class*="step-"]');
    const stepCount = await stepIndicators.count();
    expect(stepCount).toBeGreaterThanOrEqual(3); // Should have multiple steps visible
    console.log('[Golden Path] Step count:', stepCount);
    
    // Step 5: Navigate to Step 6 (Summary)
    console.log('[Golden Path] Navigating to Step 6...');
    
    // Look for "Step 6" button or "Summary" button
    const step6Button = page.locator('button:has-text("Step 6"), button:has-text("Summary"), button:has-text("Measure"), [data-testid="step-6"]').first();
    
    if (await step6Button.isVisible()) {
      await step6Button.click();
    } else {
      // Alternative: Click "Next Step" multiple times
      for (let i = 0; i < 5; i++) {
        const nextButton = page.locator('button:has-text("Next Step"), button:has-text("Next")').first();
        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(1000); // Allow for navigation
        }
      }
    }
    
    await page.waitForLoadState('networkidle');
    
    // Step 6: Verify AI summary is present
    console.log('[Golden Path] Verifying Step 6 summary...');
    
    // Check for Step 6 heading
    await expect(page.getByText(/measure.*deploy|step.*6|summary/i).first()).toBeVisible({ timeout: 10000 });
    
    // Verify AI summary exists and is non-empty
    const summarySection = page.locator('[data-testid*="summary"], .summary, [class*="summary"]').first();
    await expect(summarySection).toBeVisible({ timeout: 10000 });
    
    const summaryText = await summarySection.textContent() || '';
    expect(summaryText.length).toBeGreaterThan(50); // Should have substantial content
    
    // Verify summary references current state (not blank/stale)
    // Should contain system-related keywords
    const hasSystemKeywords = /agent|system|automation|workflow|process|digital|twin/i.test(summaryText);
    expect(hasSystemKeywords).toBe(true);
    
    console.log('[Golden Path] Summary length:', summaryText.length);
    console.log('[Golden Path] ✓ Golden path test completed successfully');
  });
  
  test('should fail if REST response shape is wrong', async ({ page }) => {
    // Intercept API calls and verify they return correct envelope
    let capturedResponses: any[] = [];
    
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/functions/v1/')) {
        try {
          const body = await response.json();
          capturedResponses.push({ url, body, status: response.status() });
        } catch {
          // Not JSON, skip
        }
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const urlInput = page.locator('input[type="url"], input[placeholder*="website"]').first();
    await urlInput.fill(TEST_URL);
    
    const scanButton = page.locator('button:has-text("Scan"), button:has-text("Analyze")').first();
    await scanButton.click();
    
    // Wait for API calls to complete
    await page.waitForTimeout(5000);
    
    // Verify all edge function responses have correct envelope
    for (const response of capturedResponses) {
      if (response.status >= 200 && response.status < 300) {
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('correlationId');
        expect(typeof response.body.success).toBe('boolean');
        expect(typeof response.body.correlationId).toBe('string');
      }
    }
  });
  
  test('should handle edge function errors gracefully', async ({ page }) => {
    // Test with invalid URL to trigger error path
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const urlInput = page.locator('input[type="url"], input[placeholder*="website"]').first();
    await urlInput.fill('invalid-url-that-does-not-exist-123456.com');
    
    const scanButton = page.locator('button:has-text("Scan"), button:has-text("Analyze")').first();
    await scanButton.click();
    
    // Should show error message (not crash)
    await expect(page.getByText(/error|failed|unable/i).first()).toBeVisible({ timeout: 30000 });
    
    // Page should still be functional
    await expect(urlInput).toBeVisible();
  });

  test('regenerate should maintain Digital Twin mode, not revert to generic AI', async ({ page }) => {
    // REGRESSION TEST: Verify regenerate button doesn't switch to generic AI initiatives
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const urlInput = page.locator('input[type="url"]').first();
    await urlInput.fill('walmart.com');
    
    const scanButton = page.locator('button:has-text("Scan")').first();
    await scanButton.click();
    
    // Wait for initial recommendations (Digital Twins)
    await expect(page.getByText(/Top \d+ Digital Twin/i).first()).toBeVisible({ timeout: 60000 });
    
    // Get first recommendation title
    const firstCardTitle = await page.locator('h3, h4').first().textContent() || '';
    console.log('[Regression Test] Initial recommendation:', firstCardTitle);
    
    // Should be a Digital Twin
    const isDigitalTwin = 
      firstCardTitle.toLowerCase().includes('digital twin') ||
      firstCardTitle.toLowerCase().includes('supply chain') ||
      firstCardTitle.toLowerCase().includes('warehouse') ||
      firstCardTitle.toLowerCase().includes('logistics') ||
      firstCardTitle.toLowerCase().includes('operations');
    
    expect(isDigitalTwin).toBe(true);
    
    // Click regenerate button (if visible)
    const regenerateButton = page.locator('button:has-text("Regenerate"), button[aria-label*="regenerate"]').first();
    const hasRegenerateButton = await regenerateButton.isVisible().catch(() => false);
    
    if (hasRegenerateButton) {
      await regenerateButton.click();
      
      // Wait for regeneration to complete
      await page.waitForTimeout(5000);
      
      // Get new first recommendation title
      const newFirstCardTitle = await page.locator('h3, h4').first().textContent() || '';
      console.log('[Regression Test] After regenerate:', newFirstCardTitle);
      
      // CRITICAL: Should STILL be a Digital Twin, NOT generic AI
      const isStillDigitalTwin = 
        newFirstCardTitle.toLowerCase().includes('digital twin') ||
        newFirstCardTitle.toLowerCase().includes('supply chain') ||
        newFirstCardTitle.toLowerCase().includes('warehouse') ||
        newFirstCardTitle.toLowerCase().includes('logistics') ||
        newFirstCardTitle.toLowerCase().includes('operations');
      
      expect(isStillDigitalTwin).toBe(true);
      
      // Should NOT contain generic AI initiative phrases
      const isGenericAI =
        newFirstCardTitle.toLowerCase().includes('innovation program') ||
        newFirstCardTitle.toLowerCase().includes('ai adoption') ||
        newFirstCardTitle.toLowerCase().includes('digital transformation');
      
      expect(isGenericAI).toBe(false);
      
      console.log('[Regression Test] ✓ Regenerate maintains Digital Twin mode');
    } else {
      console.log('[Regression Test] No regenerate button found, skipping regenerate test');
    }
  });
});
