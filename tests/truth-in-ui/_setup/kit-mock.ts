/**
 * Kit REST mock — installs `page.route` handlers for `/kit-api/**`
 * that produce every runtime state the truth-in-UI suite needs.
 *
 * States exposed:
 *   • validated-live    — schema-valid payload, stage_ready === true
 *   • schema-invalid    — payload that fails validateKitStatus()
 *   • network-unavail   — abort() so `fetchStatusValidated()` returns
 *                         reason: 'unavailable' via safeNetworkMessage
 *   • stale             — schema-valid but marked stale downstream by
 *                         freezing the clock beyond POLL_INTERVAL_MS
 *   • server-error      — HTTP 503, produces unavailable
 *   • baseline / running — sim payload variations for the sim panels
 *
 * The mock also blocks any other `/kit-api/*` request so tests fail
 * closed if a new endpoint is introduced without coverage.
 */

import type { Page } from '@playwright/test';

export type KitMockState =
  | 'validated-live'
  | 'schema-invalid'
  | 'network-unavailable'
  | 'server-error'
  | 'stale'
  | 'baseline'
  | 'running';

const VALID_STATUS = {
  ok: true,
  stage_ready: true,
  tick: 42,
  phase: 'steady',
  scenario: 'thermal',
  rack_count: 4,
  anomaly_count: 0,
  use_nvidia_assets: false,
  nucleus_server: 'test',
  asset_source: 'procedural',
  rack_health: [
    { path: '/W/R/A1', type: 'compute',       temp: 22.4, status: 'normal' },
    { path: '/W/R/A2', type: 'compute',       temp: 22.9, status: 'normal' },
    { path: '/W/R/D1', type: 'ddn_a3i',       temp: 21.1, status: 'normal', iops: 12000, throughput_gbps: 40, latency_us: 90, io_active: true },
    { path: '/W/R/D2', type: 'ddn_exascaler', temp: 21.4, status: 'normal', iops:  9000, throughput_gbps: 30, latency_us: 95, io_active: false },
  ],
  sim_paused: false,
  sim_speed: 1,
  bot_paused: true,
  active_light_preset: 'normal',
  highlighted_rack: null,
  camera_tour_active: false,
  total_power_kw: 128.4,
  gpu_utilization_pct: 74,
  cooling_efficiency: 0.92,
  tokens_per_watt: 1.45,
  pue: 1.24,
  storage_total_iops_k: 21,
  storage_total_throughput_gbps: 70,
  storage_avg_latency_us: 92,
} as const;

/** Install the /kit-api/** interceptor for a given state. */
export async function mockKit(page: Page, state: KitMockState): Promise<void> {
  await page.route('**/kit-api/**', async route => {
    const url = route.request().url();

    // /demo/status is the only endpoint the truth-in-UI suite drives.
    if (!/\/demo\/status(\?|$)/.test(url)) {
      // Any other endpoint call from the app is out of scope here —
      // return an empty body so it doesn't hang, but the test doesn't
      // fail on it (POST actions on Kit are covered by unit tests).
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    }

    switch (state) {
      case 'validated-live':
      case 'baseline':
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(VALID_STATUS),
        });
      case 'running':
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ...VALID_STATUS, phase: 'anomaly', sim_paused: false, anomaly_count: 1 }),
        });
      case 'schema-invalid':
        // Missing required fields + wrong types.
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, rack_count: 'four', not_a_field: 1 }),
        });
      case 'server-error':
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: '{"error":"unavailable"}',
        });
      case 'network-unavailable':
        return route.abort('failed');
      case 'stale':
        // Same as valid but delay past the poll interval so the badge
        // ends up carrying an old observedAt on the next tick.
        await new Promise(r => setTimeout(r, 100));
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(VALID_STATUS),
        });
    }
  });
}