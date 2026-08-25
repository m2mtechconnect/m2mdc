import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installAuraUxBackend, type AcceptanceRole } from './auraUxBackend';

const REQUIRED_VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x1000', width: 1440, height: 1000 },
  { name: '1280x900', width: 1280, height: 900 },
  { name: '1024x900', width: 1024, height: 900 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '390x844', width: 390, height: 844 },
] as const;

const FORBIDDEN_VISIBLE_TERMS = /\b(?:lovable|zapier|mcp|supabase|openai|gemini|gpt(?:-?\d+)?)\b/i;

function builderUrl(extra = ''): string {
  const base = '/builder?new=true&goal=Finance%20compliance%20system&industry=Finance&department=Finance&type=agent';
  return extra ? `${base}&${extra}` : base;
}

async function assertNoDocumentOverflow(page: Page, label: string) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.scrollWidth, `${label} must not create document-level horizontal overflow`).toBeLessThanOrEqual(metrics.clientWidth + 1);
}

async function assertWhiteLabelVisibleSurface(page: Page, selector: string) {
  const text = await page.locator(selector).innerText();
  expect(text).not.toMatch(FORBIDDEN_VISIBLE_TERMS);
}

async function runAxe(page: Page, label: string) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(result.violations, `${label} accessibility violations:\n${JSON.stringify(result.violations, null, 2)}`).toEqual([]);
}

test.describe('PR13 automated persona acceptance', () => {
  test('manager journey: five-step Builder is truthful, interactive and result-driven', async ({ context, page }) => {
    const backend = await installAuraUxBackend(context, { role: 'manager' });
    await page.goto(builderUrl(), { waitUntil: 'domcontentloaded' });

    await expect(page.locator('[data-builder-flow="standard"]')).toBeVisible();
    await expect(page.getByText('AI & Automation')).toBeVisible();
    await expect(page.getByText(/Step 1 of 5.*Overview/)).toBeVisible();

    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText(/Step 2 of 5.*Intelligence/)).toBeVisible();
    await expect(page.getByText('AURA Intelligence')).toBeVisible();
    await expect(page.getByText('1. Intelligence profile')).toBeVisible();
    await expect(page.getByText('2. Knowledge')).toBeVisible();
    await expect(page.getByText('3. Behavior & evidence')).toBeVisible();

    const advanced = page.locator('details').filter({ hasText: 'Advanced operational controls' });
    await advanced.locator('summary').click();
    await expect(advanced.getByText(/policy starting points, not observed telemetry/i)).toBeVisible();

    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText(/Step 3 of 5.*Connections/)).toBeVisible();
    await expect(page.getByText('Recommended for this build')).toBeVisible();
    await expect(page.getByText(/does not mean the capability is authenticated, connected, healthy or moving data/i)).toBeVisible();
    await expect(page.getByText('Browse all approved capabilities')).toBeVisible();

    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText(/Step 4 of 5.*Workflow/)).toBeVisible();

    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText(/Step 5 of 5.*Review & Deploy/)).toBeVisible();
    await page.getByRole('button', { name: 'Review & Deploy', exact: true }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Review deployment' })).toBeVisible();
    await expect(dialog.getByText(/real deployment operation/i)).toBeVisible();
    await dialog.getByRole('button', { name: 'Deploy', exact: true }).click();
    await expect(dialog.getByRole('heading', { name: 'Deployment result' })).toBeVisible();
    await expect(dialog.getByText('Deployment completed')).toBeVisible();
    expect(backend.deploymentCalls()).toBe(1);

    await assertWhiteLabelVisibleSurface(page, 'main');
    expect(backend.blockedRequests()).toEqual([]);
  });

  test('manager failure journey: deployment failure remains failed and retry is a real second request', async ({ context, page }) => {
    const backend = await installAuraUxBackend(context, { role: 'manager', failFirstDeployment: true });
    await page.goto(builderUrl('step=5'), { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Step 5 of 5.*Review & Deploy/)).toBeVisible();
    await page.getByRole('button', { name: 'Review & Deploy', exact: true }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Deploy', exact: true }).click();
    await expect(dialog.getByRole('heading', { name: 'Deployment could not complete' })).toBeVisible();
    await expect(dialog.getByText('Deployment failed')).toBeVisible();
    await dialog.getByRole('button', { name: 'Retry deployment' }).click();
    await expect(dialog.getByRole('heading', { name: 'Deployment result' })).toBeVisible();
    expect(backend.deploymentCalls()).toBe(2);
  });

  test('engineer journey: Connections uses server-backed rows, working tabs, refresh and drawer focus restoration', async ({ context, page }) => {
    const backend = await installAuraUxBackend(context, { role: 'engineer' });
    await page.goto('/manage/integrations', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('connections-page')).toBeVisible();

    for (const name of ['Overview', 'Systems', 'Data flows', 'Connectors', 'Activity']) {
      await expect(page.getByRole('tab', { name, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Add connection' })).toBeEnabled();

    const beforeRefresh = backend.countPath('/rest/v1/connection_instances');
    await page.getByRole('button', { name: 'Refresh' }).click();
    await expect.poll(() => backend.countPath('/rest/v1/connection_instances')).toBeGreaterThan(beforeRefresh);

    const systems = page.getByRole('tab', { name: 'Systems', exact: true });
    await systems.focus();
    await page.keyboard.press('Enter');
    await expect(systems).toHaveAttribute('data-state', 'active');
    await expect(page.getByText('Facility telemetry')).toBeVisible();
    await expect(page.getByText('Healthy').first()).toBeVisible();

    const open = page.getByRole('button', { name: 'Open', exact: true }).first();
    await open.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Facility telemetry')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(open).toBeFocused();

    await page.getByRole('tab', { name: 'Data flows', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Data flows', exact: true })).toHaveAttribute('data-state', 'active');
    await page.getByRole('tab', { name: 'Connectors', exact: true }).click();
    await expect(page.getByText('BACnet/IP').first()).toBeVisible();
    await page.getByRole('tab', { name: 'Activity', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Activity', exact: true })).toHaveAttribute('data-state', 'active');

    await assertWhiteLabelVisibleSurface(page, '[data-testid="connections-page"]');
    expect(backend.blockedRequests()).toEqual([]);
  });

  for (const persona of [
    { role: 'executive' as AcceptanceRole, label: 'executive' },
    { role: 'compliance' as AcceptanceRole, label: 'compliance officer' },
  ]) {
    test(`${persona.label} journey: operational truth is readable but mutation controls are sealed`, async ({ context, page }) => {
      await installAuraUxBackend(context, { role: persona.role });
      await page.goto('/manage/integrations', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('connections-page')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add connection' })).toBeDisabled();
      await page.getByRole('tab', { name: 'Systems', exact: true }).click();
      await expect(page.getByText('Facility telemetry')).toBeVisible();
      await page.getByRole('tab', { name: 'Activity', exact: true }).click();
      await expect(page.getByRole('tab', { name: 'Activity', exact: true })).toHaveAttribute('data-state', 'active');
    });
  }
});

test.describe('PR13 automated visual, reflow and accessibility acceptance', () => {
  test('required desktop, tablet and mobile viewports have no document overflow', async ({ context, page }) => {
    test.setTimeout(180_000);
    await installAuraUxBackend(context, { role: 'manager' });

    for (const viewport of REQUIRED_VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/manage/integrations', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('connections-page')).toBeVisible();
      await assertNoDocumentOverflow(page, `Connections ${viewport.name}`);

      await page.goto(builderUrl(), { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-builder-flow="standard"]')).toBeVisible();
      await assertNoDocumentOverflow(page, `Builder ${viewport.name}`);
    }
  });

  test('400 percent reflow equivalent at 320 CSS pixels remains usable without horizontal document scrolling', async ({ context, page }) => {
    await installAuraUxBackend(context, { role: 'manager' });
    await page.setViewportSize({ width: 320, height: 800 });

    await page.goto('/manage/integrations', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('connections-page')).toBeVisible();
    await assertNoDocumentOverflow(page, 'Connections 400 percent reflow equivalent');
    await expect(page.getByRole('tab', { name: 'Overview', exact: true })).toBeVisible();

    await page.goto(builderUrl(), { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-builder-flow="standard"]')).toBeVisible();
    await assertNoDocumentOverflow(page, 'Builder 400 percent reflow equivalent');
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeVisible();
  });

  test('reduced-motion preference preserves both primary experiences and semantics', async ({ context, page }) => {
    await installAuraUxBackend(context, { role: 'manager' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);

    await page.goto(builderUrl(), { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[aria-current="step"]')).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('AURA Intelligence')).toBeVisible();

    await page.goto('/manage/integrations', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('tab', { name: 'Overview', exact: true })).toHaveAttribute('data-state', 'active');
  });

  test('screen-reader semantics and WCAG A/AA automated scans pass on Builder and Connections', async ({ context, page }) => {
    test.setTimeout(120_000);
    await installAuraUxBackend(context, { role: 'compliance' });

    await page.goto('/manage/integrations', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('connections-page')).toBeVisible();
    await expect(page.getByRole('tablist')).toBeVisible();
    await runAxe(page, 'Connections');

    await page.goto(builderUrl(), { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[aria-current="step"]')).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('AURA Intelligence')).toBeVisible();
    await runAxe(page, 'Builder Intelligence');
  });
});
