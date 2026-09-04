import { test, expect } from '@playwright/test';
import {
  createTestSupabaseClient,
  getBrowserTestSession,
  reauthenticateBrowserTestSessionIfNeeded,
} from '../helpers/testSupabaseClient';

const LIVE_QA = process.env.QA_AUTH_BOOTSTRAP === '1';

test.describe('Functional acceptance - persisted behavior, not presence-only smoke', () => {
  test.skip(!LIVE_QA, 'Requires the disposable authenticated QA backend');

  test('Builder persists one facility-bound draft and reloads that exact draft', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Durable Builder mutation runs once on Chromium to avoid cross-browser fixture races.');

    await page.goto('/builder');
    await reauthenticateBrowserTestSessionIfNeeded(page);
    await expect(page).toHaveURL(/\/builder(?:[/?#]|$)/, { timeout: 20_000 });

    const firstFacility = page.getByRole('heading', { name: /create your first facility/i });
    const startBuild = page.getByRole('heading', { name: /start a facility build/i });
    await expect(firstFacility.or(startBuild)).toBeVisible({ timeout: 20_000 });

    if (await firstFacility.isVisible()) {
      await page.getByRole('button', { name: /^create facility$/i }).click();
      await expect(page).toHaveURL(/\/manage\/facilities\?[^#]*next=builder/, { timeout: 15_000 });
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });

      await page.getByLabel('Facility name').fill('QA Acceptance Data Centre');

      await page.getByRole('combobox', { name: 'Facility region' }).click();
      await page.getByRole('option', { name: /Toronto, Ontario/i }).click();

      await page.getByRole('combobox', { name: 'Facility tier' }).click();
      await page.getByRole('option', { name: 'Tier III' }).click();

      await page.getByLabel('Design capacity (kW)').fill('3200');
      await page.getByTestId('confirm-create-facility').click();
    } else {
      await page.getByRole('button', { name: /^start build$/i }).click();
    }

    await expect(page).toHaveURL(/\/builder\?[^#]*draft=[0-9a-f-]+/i, { timeout: 30_000 });

    const url = new URL(page.url());
    const draftId = url.searchParams.get('draft');
    const twinId = url.searchParams.get('twin');
    expect(draftId).toBeTruthy();
    expect(twinId).toMatch(/^[0-9a-f-]{36}$/i);

    const session = await getBrowserTestSession(page.context());
    const client = createTestSupabaseClient({ accessToken: session.accessToken });
    const { data: draft, error } = await client
      .from('agents')
      .select('id, owner_id, status, config')
      .eq('id', draftId!)
      .single();
    expect(error).toBeNull();
    expect(draft).toMatchObject({ id: draftId, owner_id: session.userId, status: 'draft' });

    const config = draft?.config && typeof draft.config === 'object' && !Array.isArray(draft.config)
      ? draft.config as Record<string, unknown>
      : {};
    expect(config.twin_id).toBe(twinId);

    await page.reload();
    await expect(page).toHaveURL(new RegExp(`/builder\\?[^#]*draft=${draftId}[^#]*twin=${twinId}`), { timeout: 15_000 });
    await expect(page.locator('body')).not.toContainText(/not bound to a facility|still requires operator setup/i);
  });

  test('Connections opens its real guarded setup workflow rather than a placeholder panel', async ({ page }) => {
    await page.goto('/manage/integrations');
    await expect(page.getByText('Connections', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('tab', { name: 'Connections & APIs' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Available connectors' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Health & audit' })).toBeVisible();

    const addConnection = page.getByRole('button', { name: 'Add connection' }).first();
    await expect(addConnection).toBeEnabled({ timeout: 15_000 });
    await addConnection.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Add connection' })).toBeVisible();
    await expect(dialog.getByText(/Credentials go straight to the encrypted server-side vault/i)).toBeVisible();
    await expect(dialog.getByRole('list', { name: 'Setup steps' })).toBeVisible();
  });

  test('platform admin Access Control route resolves to the live platform roster', async ({ page }) => {
    await page.goto('/teams/access-control');
    await expect(page).toHaveURL(/\/teams\/access-control(?:[/?#]|$)/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /Access control/i })).toBeVisible();
    await expect(page.getByText(/Organization membership is managed separately under People and Access/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Platform role permissions/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Grant Role' })).toBeVisible();
  });
});
