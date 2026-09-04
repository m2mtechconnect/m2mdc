import { test, expect } from '@playwright/test';
import { createTestSupabaseClient, getBrowserTestSession } from '../helpers/testSupabaseClient';

const LIVE_QA = process.env.QA_AUTH_BOOTSTRAP === '1';

test.describe('Phase 1 trusted vertical slice - persisted simulation and decision evidence', () => {
  test.skip(!LIVE_QA, 'Requires the disposable authenticated QA backend');

  test('persists a reviewed run and decision, then reloads the tenant-scoped evidence', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Durable simulation mutation runs once on Chromium to avoid duplicate QA records.');

    // Establish a stored facility through the normal product flow. This keeps
    // the test from falling back to the illustrative reference facility.
    await page.goto('/builder');
    await expect(page).toHaveURL(/\/builder(?:[/?#]|$)/, { timeout: 20_000 });

    const firstFacility = page.getByRole('heading', { name: /create your first facility/i });
    const startBuild = page.getByRole('heading', { name: /start a facility build/i });
    await expect(firstFacility.or(startBuild)).toBeVisible({ timeout: 20_000 });

    if (await firstFacility.isVisible()) {
      await page.getByRole('button', { name: /^create facility$/i }).click();
      await expect(page).toHaveURL(/\/manage\/facilities\?[^#]*next=builder/, { timeout: 15_000 });
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
      await page.getByLabel('Facility name').fill('QA Vertical Slice Data Centre');
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
    const builderUrl = new URL(page.url());
    const twinId = builderUrl.searchParams.get('twin');
    expect(twinId).toMatch(/^[0-9a-f-]{36}$/i);

    await page.goto(`/simulation?step=simulate&twin=${encodeURIComponent(twinId!)}`);
    await expect(page.getByRole('heading', { name: 'Simulate scenario' })).toBeVisible({ timeout: 20_000 });

    const reviewInputs = page.getByTestId('simulation-review-inputs');
    await expect(reviewInputs).toBeVisible({ timeout: 15_000 });
    await reviewInputs.check();
    await expect(reviewInputs).toBeChecked();

    await page.getByTestId('workspace-run-scenario').click();
    await expect(page).toHaveURL(/\/simulation\?[^#]*step=compare/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Compare runs' })).toBeVisible({ timeout: 15_000 });

    const session = await getBrowserTestSession(page.context());
    const client = createTestSupabaseClient({ accessToken: session.accessToken });
    const { data: runs, error: runError } = await client
      .from('simulation_runs')
      .select('id, run_key, twin_id, user_id, tenant_id, lifecycle_status, run_intent, execution_origin, validation_status')
      .eq('twin_id', twinId!)
      .eq('user_id', session.userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1);
    expect(runError).toBeNull();
    const persistedRun = runs?.[0];
    expect(persistedRun).toMatchObject({
      twin_id: twinId,
      user_id: session.userId,
      lifecycle_status: 'succeeded',
      run_intent: 'preview',
      execution_origin: 'client-browser',
      validation_status: 'client-produced-unverified',
    });
    expect(persistedRun?.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(persistedRun?.run_key).toBeTruthy();

    await page.getByRole('button', { name: 'Continue to decide' }).click();
    await expect(page.getByRole('heading', { name: 'Review and record' })).toBeVisible({ timeout: 15_000 });
    const rationale = page.getByLabel('Review rationale').first();
    await rationale.fill('QA records a tenant-scoped rejection for this simulated evidence.');
    await page.getByRole('button', { name: 'Reject' }).first().click();
    await expect(page.locator('[data-testid^="decision-evidence-"]').first()).toBeVisible({ timeout: 20_000 });

    const { data: decisions, error: decisionError } = await client
      .from('decision_records')
      .select('id, run_id, user_id, tenant_id, outcome, rationale, data_mode')
      .eq('run_id', persistedRun!.id)
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false })
      .limit(1);
    expect(decisionError).toBeNull();
    expect(decisions?.[0]).toMatchObject({
      run_id: persistedRun!.id,
      user_id: session.userId,
      outcome: 'rejected',
      data_mode: 'SIMULATED',
    });
    expect(decisions?.[0]?.rationale).toContain('tenant-scoped rejection');

    await page.goto(
      `/simulation?step=decide&twin=${encodeURIComponent(twinId!)}&run=${encodeURIComponent(persistedRun!.run_key as string)}`,
    );
    await expect(page.getByRole('heading', { name: 'Review and record' })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-testid^="decision-evidence-"]').first()).toContainText('rejected', {
      timeout: 20_000,
    });
  });
});
