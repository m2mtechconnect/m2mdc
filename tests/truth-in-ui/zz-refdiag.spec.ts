import { test } from '@playwright/test';
import { installSupabaseMock } from './_setup/supabase-mock';

const ROUTE = '/data-centre-twin?geometry=nvidia-reference';
const ASSET_ORIGIN = process.env.AURA_ASSET_ORIGIN ?? 'https://m2mdc.lovable.app';

test('diagnose reference facility mounts', async ({ context, page }) => {
  test.setTimeout(180_000);
  const mock = await installSupabaseMock(context);
  const twinId = '00000000-0000-4000-8000-000000000042';
  const twin = {
    id: twinId, location_id: null, name: 'Diag Twin', city: 'Montreal', region_code: 'ca-central-1',
    tier: '4', capacity_kw: 5000, industry: 'data_centre', sovereignty_level: 'sovereign',
    pue_target: 1.2, renewable_target_pct: 80, carbon_intensity: 25, metadata: {}, blueprint_id: null,
    created_by_user: mock.session.userId, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
  };
  await context.route('**/rest/v1/data_centre_twins*', async (route) => {
    const wantsSingle = (route.request().headers()['accept'] ?? '').includes('pgrst.object');
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(wantsSingle ? twin : [twin]) });
  });
  await context.addInitScript((id) => localStorage.setItem('dc_active_twin_id', id), twinId);
  const api = await test.request.newContext();
  const assetLog: string[] = [];
  await context.route('**/__l5e/assets-v1/**', async (route) => {
    const url = new URL(route.request().url());
    const local = await route.fetch().catch(() => null);
    const type = local?.headers()['content-type'] ?? '';
    if (local && local.ok() && !type.includes('text/html')) { assetLog.push(`local ok ${url.pathname}`); await route.fulfill({ response: local }); return; }
    const upstream = await api.get(`${ASSET_ORIGIN}${url.pathname}`);
    assetLog.push(`upstream ${upstream.status()} ${url.pathname}`);
    await route.fulfill({ status: upstream.status(), contentType: 'model/gltf-binary', headers: { 'access-control-allow-origin': '*' }, body: await upstream.body() });
  });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE', m.type(), m.text().slice(0, 240)); });
  page.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 240)));

  await page.goto(ROUTE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(45_000);
  console.log('URL', page.url());
  const snap = await page.evaluate(() => {
    const c = window.__auraRuntimeCoverage?.() ?? null;
    return {
      sessionId: c?.sessionId, owners: c?.owners, roleKeys: Object.keys(c?.roles ?? {}),
      mounted: Object.values(c?.rackMounts ?? {}).filter((m: any) => m.mounted).length,
      rackCount: Object.keys(c?.rackMounts ?? {}).length,
      families: window.__auraFacilityFamilies?.() ?? null,
      canvases: document.querySelectorAll('canvas').length,
    };
  });
  console.log('SNAP', JSON.stringify(snap, null, 1).slice(0, 4000));
  console.log('ASSETS', JSON.stringify(assetLog, null, 1).slice(0, 4000));
});
