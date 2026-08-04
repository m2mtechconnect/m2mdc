/**
 * Shared operational investigation context.
 *
 * The operator's scope (facility, building, data hall, asset, workload,
 * scenario, time range) is serialised into the URL so that a refresh,
 * a browser back/forward step or a shared deep link reopens exactly the
 * same investigation. Nothing here fabricates a record: an id that does
 * not resolve is reported as unavailable by the consumer.
 */
import type { AssetIdentity } from '../workspaces/facilityGraph';

export interface InvestigationContext {
  facility_id: string | null;
  building_id: string | null;
  data_hall_id: string | null;
  stable_asset_id: string | null;
  openusd_prim_path: string | null;
  workload_id: string | null;
  scenario_id: string | null;
  time_range: string | null;
  data_mode: string | null;
  source_workspace: string | null;
}

export const EMPTY_CONTEXT: InvestigationContext = {
  facility_id: null,
  building_id: null,
  data_hall_id: null,
  stable_asset_id: null,
  openusd_prim_path: null,
  workload_id: null,
  scenario_id: null,
  time_range: null,
  data_mode: null,
  source_workspace: null,
};

/** URL parameter names. Short, stable and safe to share. */
export const CONTEXT_PARAM: Record<keyof InvestigationContext, string> = {
  facility_id: 'facility',
  building_id: 'building',
  data_hall_id: 'hall',
  stable_asset_id: 'asset',
  openusd_prim_path: 'prim',
  workload_id: 'workload',
  scenario_id: 'scenario',
  time_range: 'range',
  data_mode: 'mode',
  source_workspace: 'from',
};

const KEYS = Object.keys(CONTEXT_PARAM) as (keyof InvestigationContext)[];

export function parseContext(search: string | URLSearchParams): InvestigationContext {
  const sp = typeof search === 'string' ? new URLSearchParams(search) : search;
  const out = { ...EMPTY_CONTEXT };
  for (const k of KEYS) {
    const v = sp.get(CONTEXT_PARAM[k]);
    out[k] = v && v.trim() ? v : null;
  }
  return out;
}

/** Serialises the context, dropping empty values so URLs stay readable. */
export function contextToParams(ctx: InvestigationContext): URLSearchParams {
  const sp = new URLSearchParams();
  for (const k of KEYS) {
    const v = ctx[k];
    if (v) sp.set(CONTEXT_PARAM[k], v);
  }
  return sp;
}

export function contextSearch(ctx: InvestigationContext): string {
  const s = contextToParams(ctx).toString();
  return s ? `?${s}` : '';
}

/** Builds a link to another workspace that keeps the whole investigation. */
export function linkWithContext(path: string, ctx: InvestigationContext, sourceWorkspace?: string): string {
  return `${path}${contextSearch(sourceWorkspace ? { ...ctx, source_workspace: sourceWorkspace } : ctx)}`;
}

export function isContextEmpty(ctx: InvestigationContext): boolean {
  return KEYS.every((k) => ctx[k] === null);
}

export interface ContextChip {
  /** The context field this chip represents; removing it clears that field. */
  field: keyof InvestigationContext;
  label: string;
  value: string;
  removable: boolean;
}

/**
 * Builds the visible chips. `assetName` resolves an id to a display name;
 * an unresolved id renders as "Unavailable" rather than being hidden.
 */
export function buildContextChips(
  ctx: InvestigationContext,
  resolve: (id: string) => AssetIdentity | null,
): ContextChip[] {
  const chips: ContextChip[] = [];
  const named = (id: string) => resolve(id)?.name ?? 'Unavailable (record not found)';

  if (ctx.building_id) chips.push({ field: 'building_id', label: 'Building', value: named(ctx.building_id), removable: true });
  if (ctx.data_hall_id) chips.push({ field: 'data_hall_id', label: 'Data hall', value: named(ctx.data_hall_id), removable: true });
  if (ctx.stable_asset_id) chips.push({ field: 'stable_asset_id', label: 'Asset', value: named(ctx.stable_asset_id), removable: true });
  if (ctx.workload_id) chips.push({ field: 'workload_id', label: 'Workload', value: ctx.workload_id, removable: true });
  if (ctx.time_range) chips.push({ field: 'time_range', label: 'Time range', value: ctx.time_range, removable: true });
  // Scenario and data mode are reported by the operational truth bar, which is
  // always visible, so they are not repeated here as removable scope chips.
  return chips;
}
