/**
 * PR-0.1 Checkpoint B7.4E - Pilot read adapter.
 *
 * Narrowly scoped, SELECT-only client for the two existing read models
 * authorized for the controlled approved-user pilot:
 *   - public.data_centre_twins   (primary AURA overview)
 *   - public.twin_kpi_snapshots  (representative read-only metric inspection)
 *
 * Contract (see docs/remediation/evidence/pr-0.1/checkpoint-b7/pilot-data-contract.md):
 *   - explicit column projection only
 *   - RLS relies on existing "created_by_user = auth.uid()" policy on
 *     data_centre_twins and the twin-ownership subselect on twin_kpi_snapshots.
 *     Client filters are defense-in-depth, NOT the security boundary.
 *   - bounded LIMIT
 *   - no insert/update/upsert/delete/rpc/storage/realtime
 *   - sanitized errors
 *   - no fallback/fabricated rows on failure
 */
import { supabase } from "@/integrations/supabase/client";

export interface PilotTwinRow {
  id: string;
  name: string;
  city: string;
  region_code: string;
  tier: string;
  capacity_kw: number;
  pue_target: number | null;
  updated_at: string;
  created_at: string;
  created_by_user: string;
}

export interface PilotKpiRow {
  id: string;
  twin_id: string;
  kpi_key: string;
  kpi_value: number | null;
  kpi_unit: string | null;
  domain: string | null;
  snapshot_at: string;
}

export type PilotResult<T> =
  | { status: "ok"; data: T }
  | { status: "empty" }
  | { status: "denied" }
  | { status: "unavailable"; reason: string };

const OVERVIEW_LIMIT = 25;
const KPI_LIMIT = 50;

/**
 * Freshness horizon for KPI snapshots. Anything older than this is
 * surfaced as "stale" - the contract does not permit displaying it as
 * live.
 */
export const KPI_FRESHNESS_HORIZON_MS = 24 * 60 * 60 * 1000;

export type KpiFreshness = "fresh" | "stale" | "unvalidated";

export function classifyKpi(row: PilotKpiRow, now: number = Date.now()): KpiFreshness {
  if (row.kpi_value === null || row.kpi_value === undefined) return "unvalidated";
  const ts = Date.parse(row.snapshot_at);
  if (!Number.isFinite(ts)) return "unvalidated";
  if (now - ts > KPI_FRESHNESS_HORIZON_MS) return "stale";
  return "fresh";
}

function sanitizeError(prefix: string, error: unknown): PilotResult<never> {
  const e = error as { code?: string; status?: number; message?: string } | null;
  if (e && (e.code === "PGRST301" || e.status === 401 || e.status === 403)) {
    return { status: "denied" };
  }
  const reason = e?.code
    ? `${prefix}:${e.code}`
    : e?.status
    ? `${prefix}:${e.status}`
    : `${prefix}:unavailable`;
  return { status: "unavailable", reason };
}

/**
 * Overview: list the current approved user's data-centre twins.
 * RLS restricts rows to created_by_user = auth.uid().
 */
export async function listPilotTwins(): Promise<PilotResult<PilotTwinRow[]>> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) return { status: "denied" };

  try {
    const { data, error } = await supabase
      .from("data_centre_twins")
      .select(
        "id,name,city,region_code,tier,capacity_kw,pue_target,updated_at,created_at,created_by_user"
      )
      .eq("created_by_user", authData.user.id)
      .order("updated_at", { ascending: false })
      .limit(OVERVIEW_LIMIT);
    if (error) return sanitizeError("data_centre_twins", error);
    if (!data || data.length === 0) return { status: "empty" };
    return { status: "ok", data: data as PilotTwinRow[] };
  } catch (err) {
    return sanitizeError("data_centre_twins", err);
  }
}

export async function getPilotTwin(twinId: string): Promise<PilotResult<PilotTwinRow>> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) return { status: "denied" };
  try {
    const { data, error } = await supabase
      .from("data_centre_twins")
      .select(
        "id,name,city,region_code,tier,capacity_kw,pue_target,updated_at,created_at,created_by_user"
      )
      .eq("id", twinId)
      .eq("created_by_user", authData.user.id)
      .maybeSingle();
    if (error) return sanitizeError("data_centre_twins", error);
    if (!data) return { status: "empty" };
    return { status: "ok", data: data as PilotTwinRow };
  } catch (err) {
    return sanitizeError("data_centre_twins", err);
  }
}

export async function listPilotKpis(twinId: string): Promise<PilotResult<PilotKpiRow[]>> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) return { status: "denied" };
  try {
    const { data, error } = await supabase
      .from("twin_kpi_snapshots")
      .select("id,twin_id,kpi_key,kpi_value,kpi_unit,domain,snapshot_at")
      .eq("twin_id", twinId)
      .order("snapshot_at", { ascending: false })
      .limit(KPI_LIMIT);
    if (error) return sanitizeError("twin_kpi_snapshots", error);
    if (!data || data.length === 0) return { status: "empty" };
    return { status: "ok", data: data as PilotKpiRow[] };
  } catch (err) {
    return sanitizeError("twin_kpi_snapshots", err);
  }
}