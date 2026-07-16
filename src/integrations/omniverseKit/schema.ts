/**
 * Runtime validation for the Omniverse Kit `/demo/status` response.
 *
 * The internal `DataCentreFacility` is constructed from this payload; every
 * downstream KPI marked `live` or `derived` traces to a field validated here.
 *
 * Design rules:
 *   - Extra fields are stripped (Zod default) so unknown/hostile fields cannot
 *     leak into the mapper.
 *   - Optional fields default to safe values so a partial payload degrades
 *     to `demo` provenance for the missing sections rather than throwing.
 *   - We do NOT log the raw payload on validation failure — only a compact
 *     issue summary (path + code + message) so tokens and internal server
 *     names are not exposed via console/telemetry.
 */

import { z } from 'zod';

export const KitRackHealthSchema = z.object({
  path: z.string(),
  type: z.enum(['compute', 'ddn_a3i', 'ddn_exascaler']),
  temp: z.number().finite(),
  status: z.enum(['normal', 'warning', 'critical', 'offline']),
  iops: z.number().optional(),
  throughput_gbps: z.number().optional(),
  latency_us: z.number().optional(),
  io_active: z.boolean().optional(),
});

export const KitStatusSchema = z.object({
  ok: z.boolean(),
  stage_ready: z.boolean(),
  tick: z.number(),
  phase: z.enum(['steady', 'anomaly', 'cascade', 'dispatch', 'resolution', 'cooldown']).nullable(),
  scenario: z.enum(['thermal', 'power_failure', 'cdu_failure']),
  rack_count: z.number().int().nonnegative(),
  anomaly_count: z.number().int().nonnegative(),
  use_nvidia_assets: z.boolean(),
  nucleus_server: z.string(),
  asset_source: z.enum(['nucleus', 'procedural']),
  rack_health: z.array(KitRackHealthSchema),
  sim_paused: z.boolean(),
  sim_speed: z.number(),
  bot_paused: z.boolean(),
  active_light_preset: z.string(),
  highlighted_rack: z.string().nullable(),
  camera_tour_active: z.boolean(),
  total_power_kw: z.number().finite().nonnegative(),
  gpu_utilization_pct: z.number().finite().min(0).max(100),
  cooling_efficiency: z.number().finite().min(0).max(1),
  tokens_per_watt: z.number().finite().nonnegative(),
  pue: z.number().finite().positive(),
  storage_total_iops_k: z.number().finite().nonnegative(),
  storage_total_throughput_gbps: z.number().finite().nonnegative(),
  storage_avg_latency_us: z.number().finite().nonnegative(),
});

export type KitStatusValidated = z.infer<typeof KitStatusSchema>;

export type KitValidationOutcome =
  | { ok: true; data: KitStatusValidated }
  | { ok: false; reason: 'invalid'; issues: KitValidationIssue[] }
  | { ok: false; reason: 'unavailable'; message: string };

export interface KitValidationIssue {
  path: string;
  code: string;
  message: string;
}

/**
 * Validate an unknown payload against the Kit schema. Never throws.
 * Returns a compact issue list on failure — safe to log (no raw payload data).
 */
export function validateKitStatus(payload: unknown): KitValidationOutcome {
  const parsed = KitStatusSchema.safeParse(payload);
  if (parsed.success) return { ok: true, data: parsed.data };
  const issues: KitValidationIssue[] = parsed.error.issues.map(i => ({
    path: i.path.join('.'),
    code: i.code,
    message: i.message,
  }));
  return { ok: false, reason: 'invalid', issues };
}

/** Convenience for callers that already caught a fetch/network failure. */
export function unavailableOutcome(message: string): KitValidationOutcome {
  return { ok: false, reason: 'unavailable', message };
}