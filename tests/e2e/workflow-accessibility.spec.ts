import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Workflow Editor & Builder - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/builder?id=system_test_01&step=5');
    await page.waitForLoadState('networkidle');
  });

  test('should have no WCAG 2.1 AA violations on Step 5', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have no WCAG violations on Agents page', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('should have no WCAG violations on Marketplace', async ({ page }) => {
    await page.goto('/marketplace?tab=industry');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('should support keyboard navigation for toolbar', async ({ page }) => {
    // Tab through toolbar buttons
    await page.keyboard.press('Tab');
    let focusedElement = await page.evaluate(() => document.activeElement?.textContent);
    expect(focusedElement).toContain('Save');

    await page.keyboard.press('Tab');
    focusedElement = await page.evaluate(() => document.activeElement?.textContent);
    expect(focusedElement).toContain('Validate');

    await page.keyboard.press('Tab');
    focusedElement = await page.evaluate(() => document.activeElement?.textContent);
    expect(focusedElement).toContain('Test Run');
  });

  test('should support keyboard navigation for palette', async ({ page }) => {
    // Find first palette button
    const analyzeButton = page.getByRole('button', { name: 'Analyze' });
    await analyzeButton.focus();

    // Press Enter to add node
    await page.keyboard.press('Enter');
    await expect(page.getByText('1 nodes')).toBeVisible();
  });

  test('should have proper ARIA labels on interactive elements', async ({ page }) => {
    const saveButton = page.getByRole('button', { name: /save draft/i });
    const ariaLabel = await saveButton.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();

    const validateButton = page.getByRole('button', { name: /validate/i });
    const validateAriaLabel = await validateButton.getAttribute('aria-label');
    expect(validateAriaLabel).toBeTruthy();
  });

  test('should have sufficient color contrast', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('.glass-panel')
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      v => v.id === 'color-contrast'
    );
    expect(contrastViolations).toHaveLength(0);
  });

  test('should announce state changes to screen readers', async ({ page }) => {
    // Add node
    await page.getByRole('button', { name: 'Analyze' }).click();

    // Check for toast announcement (role="status" or role="alert")
    const toast = page.locator('[role="status"], [role="alert"]');
    await expect(toast).toBeVisible();
  });

  test('should have semantic HTML structure', async ({ page }) => {
    // Check for proper heading hierarchy
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();

    // Buttons should be actual button elements
    const buttons = await page.locator('button').count();
    expect(buttons).toBeGreaterThan(0);
  });

  test('should support screen reader navigation', async ({ page }) => {
    // Check for landmarks
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Check for proper button labels
    const saveButton = page.getByRole('button', { name: /save draft/i });
    const buttonText = await saveButton.textContent();
    expect(buttonText?.trim()).toBeTruthy();
  });
});
