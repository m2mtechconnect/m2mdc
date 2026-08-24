import { test, expect } from '@playwright/test';
import { createTestSupabaseClient, getBrowserTestSession } from '../helpers/testSupabaseClient';

const LIVE_QA = process.env.QA_AUTH_BOOTSTRAP === '1';

test.describe('Functional acceptance — persisted behavior, not presence-only smoke', () => {
  test.skip(!LIVE_QA, 'Requires the disposable authenticated QA backend');

  test('Builder creates one persisted draft and reloads that exact draft', async ({ page }) => {
    await page.goto('/builder');
    await expect(page.getByRole('heading', { name: /Start a new build/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Start blank' }).click();
    await expect(page).toHaveURL(/\/builder\?draft=[0-9a-f-]+/i, { timeout: 20_000 });

    const draftId = new URL(page.url()).searchParams.get('draft');
    expect(draftId).toBeTruthy();

    const session = await getBrowserTestSession(page.context());
    const client = createTestSupabaseClient({ accessToken: session.accessToken });
    const { data: draft, error } = await client
      .from('agents')
      .select('id, owner_id, status')
      .eq('id', draftId!)
      .single();
    expect(error).toBeNull();
    expect(draft).toMatchObject({ id: draftId, owner_id: session.userId, status: 'draft' });

    await page.reload();
    await expect(page).toHaveURL(new RegExp(`/builder\\?draft=${draftId}`), { timeout: 15_000 });
  });

  test('Connections opens its real guarded setup workflow rather than a placeholder panel', async ({ page }) => {
    await page.goto('/manage/integrations');
    await expect(page.getByText('Connections', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('tab', { name: 'Connected systems' })).toBeVisible();
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
    await expect(page.getByText(/role assignments across the platform/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Grant Role' })).toBeVisible();
  });
});
