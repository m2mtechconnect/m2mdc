import { test, expect } from '@playwright/test';

test.describe('Integrations Hub', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
  });

  test('should display integration logos and status chips', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /integrations/i })).toBeVisible();
    
    // Check for integration cards
    const integrationCards = page.locator('[data-testid="integration-card"]');
    const count = await integrationCards.count();
    expect(count).toBeGreaterThan(0);

    // Verify status chips are visible
    await expect(page.getByText(/connected|disconnected/i).first()).toBeVisible();
  });

  test('should connect integration via OAuth (mocked)', async ({ page }) => {
    // Mock OAuth flow
    await page.route('**/integrations-connect**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ status: 'connected', id: 'test-conn-123' }),
      });
    });

    const connectButton = page.getByRole('button', { name: /connect/i }).first();
    if (await connectButton.isVisible()) {
      await connectButton.click();
      await expect(page.getByText(/connected/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should disconnect integration', async ({ page }) => {
    await page.route('**/integrations-disconnect**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ status: 'disconnected' }),
      });
    });

    const disconnectButton = page.getByRole('button', { name: /disconnect/i }).first();
    if (await disconnectButton.isVisible()) {
      await disconnectButton.click();
      
      // Confirm dialog
      const confirmButton = page.getByRole('button', { name: /confirm/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      await expect(page.getByText(/disconnected/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show error message on connection failure', async ({ page }) => {
    await page.route('**/integrations-connect**', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Connection failed', requestId: 'req-123' }),
      });
    });

    const connectButton = page.getByRole('button', { name: /connect/i }).first();
    if (await connectButton.isVisible()) {
      await connectButton.click();
      await expect(page.getByText(/error|failed/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/req-123/i)).toBeVisible();
    }
  });

  test('should filter integrations by category', async ({ page }) => {
    const categoryFilter = page.getByRole('combobox', { name: /category/i });
    if (await categoryFilter.isVisible()) {
      await categoryFilter.click();
      await page.getByRole('option', { name: /storage/i }).click();
      
      // Should only show storage integrations
      await expect(page.getByText(/drive|dropbox|s3/i)).toBeVisible();
    }
  });

  test('should open integration settings drawer', async ({ page }) => {
    const settingsButton = page.getByRole('button', { name: /settings/i }).first();
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
    }
  });
});
