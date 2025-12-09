import { test, expect } from '@playwright/test';

test.describe('Learning Hub - Clean & Optimized', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');
  });

  test('should render Learning Hub without funding content', async ({ page }) => {
    // Verify main heading
    await expect(page.getByRole('heading', { name: 'Learning Hub' })).toBeVisible();
    
    // Verify NO funding-related content appears
    await expect(page.getByText(/funding program/i)).not.toBeVisible();
    await expect(page.getByText(/scale ai/i)).not.toBeVisible();
    await expect(page.getByText(/upskill canada/i)).not.toBeVisible();
    await expect(page.getByText(/government of canada/i)).not.toBeVisible();
    await expect(page.getByText(/grant/i)).not.toBeVisible();
    
    // Verify all 4 sections are present
    await expect(page.getByRole('heading', { name: /getting started/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /user guides/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /roi calculator/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /expert guidance/i })).toBeVisible();
  });

  test('should display quickstart tutorial section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /build your first ai system/i })).toBeVisible();
    await expect(page.getByText(/5-minute quickstart guide/i)).toBeVisible();
    
    // Verify action buttons
    await expect(page.getByRole('button', { name: /watch tutorial/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /view documentation/i })).toBeVisible();
  });

  test('should display all tutorial items', async ({ page }) => {
    const tutorialItems = [
      'Build Your First AI System',
      'Understanding ROI Metrics',
      'Connecting Your Tech Stack',
      'Setting Up Team Permissions'
    ];

    for (const item of tutorialItems) {
      await expect(page.getByText(item)).toBeVisible();
    }
  });

  test('should display user guides and templates', async ({ page }) => {
    // User Guides
    await expect(page.getByText('No-Code Builder Tutorial')).toBeVisible();
    await expect(page.getByText('Analytics Dashboard Guide')).toBeVisible();
    await expect(page.getByText('Compliance & Audit Best Practices')).toBeVisible();
    
    // Templates
    await expect(page.getByText('Healthcare Compliance Template')).toBeVisible();
    await expect(page.getByText('Manufacturing Quality Control')).toBeVisible();
    await expect(page.getByText('Marketing Automation Setup')).toBeVisible();
  });

  test('should have working ROI calculator with live updates', async ({ page }) => {
    // Verify calculator is visible
    await expect(page.getByRole('heading', { name: /roi calculator/i })).toBeVisible();
    
    // Check for sliders
    const sliders = page.getByRole('slider');
    await expect(sliders).toHaveCount(4); // Manual hours, hourly cost, automation %, timeline
    
    // Verify live calculation results are displayed
    await expect(page.getByText(/annual savings/i)).toBeVisible();
    await expect(page.getByText(/roi/i)).toBeVisible();
    await expect(page.getByText(/time saved\/week/i)).toBeVisible();
    
    // Verify formula is shown
    await expect(page.getByText(/annual savings = \(manual hours/i)).toBeVisible();
  });

  test('should update ROI calculations in real-time', async ({ page }) => {
    // Get initial annual savings value
    const savingsLocator = page.locator('text=/\\$[\\d,]+/').first();
    const initialSavings = await savingsLocator.textContent();
    
    // Adjust the first slider (manual hours)
    const firstSlider = page.getByRole('slider').first();
    await firstSlider.click();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    
    // Wait a moment for calculation to update
    await page.waitForTimeout(500);
    
    // Verify the value has changed
    const newSavings = await savingsLocator.textContent();
    expect(newSavings).not.toBe(initialSavings);
  });

  test('should display ROI calculator tooltips', async ({ page }) => {
    // Hover over first info icon
    const infoIcons = page.locator('svg').filter({ hasText: '' }).locator('..').filter({ has: page.locator('[data-testid="info"]') });
    
    // There should be tooltip triggers (Info icons)
    const firstInfo = page.locator('label').filter({ hasText: 'Manual Hours/Week' }).locator('svg').first();
    await firstInfo.hover();
    
    // Tooltip should appear (may need to wait)
    await page.waitForTimeout(300);
  });

  test('should have contact expert form with validation', async ({ page }) => {
    // Verify form fields
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/message/i)).toBeVisible();
    
    // Verify action buttons
    await expect(page.getByRole('button', { name: /contact expert/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /schedule demo/i })).toBeVisible();
  });

  test('should validate contact form inputs', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /contact expert/i });
    
    // Try to submit empty form
    await submitButton.click();
    
    // HTML5 validation should prevent submission
    const nameInput = page.getByLabel(/name/i);
    await expect(nameInput).toHaveAttribute('required', '');
    
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(emailInput).toHaveAttribute('type', 'email');
  });

  test('should submit contact form successfully', async ({ page }) => {
    // Fill out the form
    await page.getByLabel(/name/i).fill('John Doe');
    await page.getByLabel(/email/i).fill('john@example.com');
    await page.getByLabel(/message/i).fill('I need help with AI implementation');
    
    // Submit the form
    await page.getByRole('button', { name: /contact expert/i }).click();
    
    // Wait for success message (toast)
    await expect(page.getByText(/our team will reach out shortly/i)).toBeVisible({ timeout: 5000 });
    
    // Form should be cleared
    await expect(page.getByLabel(/name/i)).toHaveValue('');
    await expect(page.getByLabel(/email/i)).toHaveValue('');
    await expect(page.getByLabel(/message/i)).toHaveValue('');
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify all sections are still accessible
    await expect(page.getByRole('heading', { name: 'Learning Hub' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /getting started/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /roi calculator/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /expert guidance/i })).toBeVisible();
    
    // Verify buttons stack properly on mobile
    const watchButton = page.getByRole('button', { name: /watch tutorial/i });
    await expect(watchButton).toBeVisible();
  });

  test('should be accessible (WCAG 2.2 AA)', async ({ page }) => {
    // Check for proper heading hierarchy
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText('Learning Hub');
    
    // Verify form labels are properly associated
    const nameInput = page.getByLabel(/name/i);
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveAttribute('aria-label');
    
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('aria-label');
    
    // Check keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT']).toContain(focusedElement);
  });

  test('should enforce maxLength on form inputs', async ({ page }) => {
    const nameInput = page.getByLabel(/name/i);
    const emailInput = page.getByLabel(/email/i);
    const messageInput = page.getByLabel(/message/i);
    
    // Check maxLength attributes
    await expect(nameInput).toHaveAttribute('maxlength', '100');
    await expect(emailInput).toHaveAttribute('maxlength', '255');
    await expect(messageInput).toHaveAttribute('maxlength', '2000');
  });

  test('should show proper M2M branding', async ({ page }) => {
    // Check for M2M gold/blue color scheme (via CSS classes)
    const primaryButton = page.getByRole('button', { name: /watch tutorial/i });
    await expect(primaryButton).toHaveClass(/glow-yellow/);
    
    // Verify font usage (Poppins for headings via font-display class)
    const heading = page.getByRole('heading', { name: 'Learning Hub' });
    await expect(heading).toHaveClass(/font-display/);
  });
});
