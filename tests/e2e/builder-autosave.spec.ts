import { test, expect } from '@playwright/test';

test.describe('Builder - Autosave Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          user: { id: 'test-user-123', email: 'test@example.com' }
        })
      });
    });

    await page.goto('/builder');
    await page.waitForLoadState('networkidle');
  });

  test('should autosave after field changes', async ({ page }) => {
    // Fill in Step 1 fields
    await page.fill('[id="systemName"]', 'Test Autosave System');
    await page.selectOption('[id="department"]', 'Operations');
    await page.fill('[id="outcome"]', 'Test automated saving functionality');
    await page.fill('[id="successMetric"]', 'Save indicator appears within 2 seconds');

    // Wait for "Saving..." indicator
    await expect(page.getByText(/saving/i)).toBeVisible({ timeout: 3000 });

    // Wait for "Saved" indicator with timestamp
    await expect(page.getByText(/saved •/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show saved timestamp', async ({ page }) => {
    await page.fill('[id="systemName"]', 'Timestamp Test');
    
    // Wait for save completion
    await page.waitForSelector('text=/Saved •/', { timeout: 5000 });
    
    // Verify timestamp format (should match HH:MM:SS)
    const savedText = await page.textContent('text=/Saved •/');
    expect(savedText).toMatch(/Saved • \d{1,2}:\d{2}:\d{2}/);
  });

  test('should persist state across page refreshes', async ({ page }) => {
    const testSystemName = `Persistence Test ${Date.now()}`;
    
    // Fill fields
    await page.fill('[id="systemName"]', testSystemName);
    await page.selectOption('[id="department"]', 'Finance');
    
    // Wait for save
    await expect(page.getByText(/saved •/i)).toBeVisible({ timeout: 5000 });
    
    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify data persisted
    const systemNameValue = await page.inputValue('[id="systemName"]');
    expect(systemNameValue).toBe(testSystemName);
    
    const departmentValue = await page.inputValue('[id="department"]');
    expect(departmentValue).toBe('Finance');
  });

  test('should debounce rapid changes', async ({ page }) => {
    const systemNameInput = page.locator('[id="systemName"]');
    
    // Type rapidly
    await systemNameInput.fill('T');
    await systemNameInput.fill('Te');
    await systemNameInput.fill('Tes');
    await systemNameInput.fill('Test');
    await systemNameInput.fill('Test System');
    
    // Should only see one save operation (debounced)
    await expect(page.getByText(/saving/i)).toBeVisible({ timeout: 2000 });
    
    // Wait for save to complete
    await expect(page.getByText(/saved •/i)).toBeVisible({ timeout: 3000 });
    
    // Verify final value saved
    const finalValue = await systemNameInput.inputValue();
    expect(finalValue).toBe('Test System');
  });

  test('should handle save errors gracefully', async ({ page }) => {
    // Mock save failure
    await page.route('**/rest/v1/system_builder_state**', async (route) => {
      if (route.request().method() === 'POST' || route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ message: 'Database error' })
        });
      } else {
        await route.continue();
      }
    });
    
    await page.fill('[id="systemName"]', 'Error Test');
    
    // Should show error toast
    await expect(page.getByText(/failed to save/i)).toBeVisible({ timeout: 5000 });
  });

  test('should save across all builder steps', async ({ page }) => {
    // Step 1
    await page.fill('[id="systemName"]', 'Multi-Step Save Test');
    await page.selectOption('[id="department"]', 'Marketing');
    await expect(page.getByText(/saved •/i)).toBeVisible({ timeout: 5000 });
    
    // Go to Step 2
    await page.click('button:has-text("Next Step")');
    await page.waitForLoadState('networkidle');
    
    // Select template
    const templateCard = page.locator('[data-template-id]').first();
    if (await templateCard.isVisible()) {
      await templateCard.click();
      await expect(page.getByText(/saved •/i)).toBeVisible({ timeout: 5000 });
    }
    
    // Verify step progress saved
    expect(page.url()).toContain('step=2');
  });

  test('should maintain dirty state correctly', async ({ page }) => {
    await page.fill('[id="systemName"]', 'Dirty State Test');
    
    // Should show "Unsaved changes" badge immediately
    await expect(page.getByText(/unsaved changes/i)).toBeVisible({ timeout: 1000 });
    
    // Wait for autosave
    await expect(page.getByText(/saved •/i)).toBeVisible({ timeout: 5000 });
    
    // "Unsaved changes" should disappear
    await expect(page.getByText(/unsaved changes/i)).not.toBeVisible();
  });
});
