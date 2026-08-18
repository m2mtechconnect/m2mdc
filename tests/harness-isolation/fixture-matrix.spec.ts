/**
 * TEMPORARY diagnostic: 8-case fixture-isolation matrix for the
 * NVIDIA Reference Facility regression harness. Identifies the
 * smallest fixture combination that reproduces the unresolved
 * lazy-module promise on /data-centre-twin?geometry=nvidia-reference.
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { installSupabaseMock } from '../truth-in-ui/_setup/supabase-mock';

const ROUTE = '/data-centre-twin?geometry=nvidia-reference';
const ASSET_ORIGIN = process.env.AURA_ASSET_ORIGIN ?? 'https://m2mdc.lovable.app';
const OUT = path.resolve(
  'docs/remediation/hybrid-nvidia-runtime/evidence/reference-facility-ui/harness-isolation',
);

const ONLY = (process.env.MATRIX_CASES ?? '').split(',').filter(Boolean).map(Number);
const ALL_CASES = [
  { id: 1, rest: false, init: false, asset: false },
  { id: 2, rest: true,  init: false, asset: false },
  { id: 3, rest: false, init: true,  asset: false },
  { id: 4, rest: false, init: false, asset: true  },
  { id: 5, rest: true,  init: true,  asset: false },
  { id: 6, rest: true,  init: false, asset: true  },
  { id: 7, rest: false, init: true,  asset: true  },
  { id: 8, rest: true,  init: true,  asset: true  },
];
const CASES = ONLY.length ? ALL_CASES.filter((c) => ONLY.includes(c.id)) : ALL_CASES;

const results: unknown[] = [];

test.afterAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, process.env.MATRIX_OUT ?? 'fixture-matrix.json'), JSON.stringify(results, null, 2));
});

for (const c of CASES) {
  test(`case ${c.id} rest=${c.rest} init=${c.init} asset=${c.asset}`, async ({ context, page }) => {
    test.setTimeout(90_000);
    const started = Date.now();
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const lazy: Record<string, unknown>[] = [];
    const intercepted: { url: string; type: string; handler: string }[] = [];

    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
    page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));
    page.on('response', async (r) => {
      const u = r.url();
      if (/DataCentreTwin|TwinVisualizationLayout/.test(u)) {
        lazy.push({
          url: u.slice(0, 200),
          status: r.status(),
          contentType: r.headers()['content-type'] ?? null,
          size: await r.body().then((b) => b.length).catch(() => null),
        });
      }
    });

    const mock = await installSupabaseMock(context);
    const twinId = '00000000-0000-4000-8000-000000000042';
    const twin = {
      id: twinId, location_id: null, name: 'Matrix Twin', city: 'Montreal',
      region_code: 'ca-central-1', tier: '4', capacity_kw: 5000, industry: 'data_centre',
      sovereignty_level: 'sovereign', pue_target: 1.2, renewable_target_pct: 80,
      carbon_intensity: 25, metadata: {}, blueprint_id: null,
      created_by_user: mock.session.userId,
      created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
    };

    if (c.rest) {
      await context.route('**/rest/v1/data_centre_twins*', async (route) => {
        intercepted.push({
          url: route.request().url().slice(0, 160),
          type: route.request().resourceType(),
          handler: 'rest',
        });
        const wantsSingle = (route.request().headers()['accept'] ?? '').includes('pgrst.object');
        await route.fulfill({
          status: 200, contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify(wantsSingle ? twin : [twin]),
        });
      });
    }
    if (c.init) {
      await context.addInitScript((id) => localStorage.setItem('dc_active_twin_id', id), twinId);
    }
    let api: Awaited<ReturnType<typeof test.request.newContext>> | null = null;
    if (c.asset) {
      api = await test.request.newContext();
      await context.route('**/__l5e/assets-v1/**', async (route) => {
        intercepted.push({
          url: route.request().url().slice(0, 160),
          type: route.request().resourceType(),
          handler: 'asset',
        });
        const url = new URL(route.request().url());
        const local = await route.fetch().catch(() => null);
        const type = local?.headers()['content-type'] ?? '';
        if (local && local.ok() && !type.includes('text/html')) {
          await route.fulfill({ response: local });
          return;
        }
        const upstream = await api!.get(`${ASSET_ORIGIN}${url.pathname}`);
        await route.fulfill({
          status: upstream.status(), contentType: 'model/gltf-binary',
          headers: { 'access-control-allow-origin': '*' },
          body: await upstream.body(),
        });
      });
    }

    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' });

    let layout = false;
    try {
      await expect(page.getByTestId('twin-visualization-layout')).toBeVisible({ timeout: Number(process.env.MATRIX_WAIT ?? 45_000) });
      layout = true;
    } catch { layout = false; }

    const mainText = await page.locator('main').first().innerText().catch(() => '');
    const record = {
      case: c.id, rest: c.rest, init: c.init, asset: c.asset,
      layoutVisible: layout,
      mainSnippet: mainText.slice(0, 160).replace(/\s+/g, ' '),
      lazyResponses: lazy,
      interceptedCount: intercepted.length,
      interceptedSample: intercepted.slice(0, 8),
      interceptedResourceTypes: [...new Set(intercepted.map((i) => i.type))],
      consoleErrors: consoleErrors.slice(0, 8),
      pageErrors: pageErrors.slice(0, 8),
      elapsedMs: Date.now() - started,
    };
    results.push(record);
    console.log('MATRIX ' + JSON.stringify(record));
    await api?.dispose();
  });
}
