/**
 * PR-0.1 Checkpoint B7.4E - Representative read-only asset/metric inspection.
 *
 * Shows one data_centre_twins record and the KPI envelope of its latest
 * persisted simulation run. Provenance = source table + record owner.
 * Freshness = the run timestamp.
 * Validation = value not null AND snapshot within KPI_FRESHNESS_HORIZON_MS.
 * Anything else is surfaced as "stale" or "unvalidated" - never fabricated.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  classifyKpi,
  getPilotTwin,
  listPilotKpis,
  type PilotKpiRow,
  type PilotResult,
  type PilotTwinRow,
} from "./pilotReadAdapter";

export default function PilotAssetInspection() {
  const { twinId } = useParams<{ twinId: string }>();
  const [twin, setTwin] = useState<PilotResult<PilotTwinRow> | null>(null);
  const [kpis, setKpis] = useState<PilotResult<PilotKpiRow[]> | null>(null);

  useEffect(() => {
    let active = true;
    if (!twinId) {
      setTwin({ status: "unavailable", reason: "missing_id" });
      setKpis({ status: "unavailable", reason: "missing_id" });
      return;
    }
    getPilotTwin(twinId).then((r) => active && setTwin(r));
    listPilotKpis(twinId).then((r) => active && setKpis(r));
    return () => {
      active = false;
    };
  }, [twinId]);

  return (
    <section aria-labelledby="pilot-asset-heading" className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-xs">
        <Link to="/pilot/overview" className="text-muted-foreground hover:underline">
          &larr; Overview
        </Link>
      </nav>

      <header className="space-y-1">
        <h1 id="pilot-asset-heading" className="text-xl font-semibold">
          {twin?.status === "ok" ? twin.data.name : "Asset"}
        </h1>
        <p className="text-xs text-muted-foreground">
          Provenance: <code>public.data_centre_twins.id = {twinId}</code>.
          Access enforced by row-level security on <code>created_by_user</code>.
        </p>
      </header>

      {twin?.status === "denied" && (
        <p role="alert" className="text-sm text-destructive">
          You are not authorized to view this record.
        </p>
      )}
      {twin?.status === "empty" && (
        <p role="status" className="text-sm text-muted-foreground">
          No record matched under your account. It may not exist or you may not
          have access.
        </p>
      )}
      {twin?.status === "unavailable" && (
        <p role="alert" className="text-sm text-destructive">
          Twin metadata unavailable ({twin.reason}). No fallback data shown.
        </p>
      )}

      {twin?.status === "ok" && (
        <dl className="grid grid-cols-2 gap-2 text-sm border border-border rounded p-3">
          <dt className="text-muted-foreground">City</dt>
          <dd>{twin.data.city}</dd>
          <dt className="text-muted-foreground">Region</dt>
          <dd>{twin.data.region_code}</dd>
          <dt className="text-muted-foreground">Tier</dt>
          <dd>{twin.data.tier}</dd>
          <dt className="text-muted-foreground">Capacity (kW)</dt>
          <dd>{twin.data.capacity_kw}</dd>
          <dt className="text-muted-foreground">PUE target</dt>
          <dd>{twin.data.pue_target ?? "unvalidated"}</dd>
          <dt className="text-muted-foreground">Updated at</dt>
          <dd>{new Date(twin.data.updated_at).toISOString()}</dd>
        </dl>
      )}

      <section aria-labelledby="pilot-kpi-heading" className="space-y-2">
        <h2 id="pilot-kpi-heading" className="text-sm font-semibold">
          Latest recorded KPIs
        </h2>
        <p className="text-xs text-muted-foreground">
          Source: <code>public.simulation_runs.final_kpis</code>. Freshness is
          derived from the run timestamp; runs older than 24 hours are labelled
          stale. Non-numeric entries are labelled unvalidated. No values are
          fabricated when the source is unavailable.
        </p>

        {kpis === null && (
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
            Loading recorded KPIs...
          </p>
        )}
        {kpis?.status === "denied" && (
          <p role="alert" className="text-sm text-destructive">
            You are not authorized to view KPI data.
          </p>
        )}
        {kpis?.status === "unavailable" && (
          <p role="alert" className="text-sm text-destructive">
            Recorded KPIs unavailable ({kpis.reason}). No fallback rows shown.
          </p>
        )}
        {kpis?.status === "empty" && (
          <p role="status" className="text-sm text-muted-foreground">
            No simulation run has recorded KPIs for this asset.
          </p>
        )}
        {kpis?.status === "ok" && (
          <table
            className="w-full text-sm border border-border rounded"
            data-testid="pilot-kpi-table"
          >
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2">KPI</th>
                <th className="p-2">Value</th>
                <th className="p-2">Unit</th>
                <th className="p-2">Snapshot</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {kpis.data.map((k) => {
                const status = classifyKpi(k);
                return (
                  <tr key={k.id}>
                    <td className="p-2 font-medium">{k.kpi_key}</td>
                    <td className="p-2">{k.kpi_value ?? "-"}</td>
                    <td className="p-2 text-muted-foreground">{k.kpi_unit ?? "-"}</td>
                    <td className="p-2 text-muted-foreground">
                      {new Date(k.snapshot_at).toISOString()}
                    </td>
                    <td className="p-2">
                      <span
                        className={
                          status === "fresh"
                            ? "text-emerald-500"
                            : status === "stale"
                            ? "text-amber-500"
                            : "text-destructive"
                        }
                        aria-label={`KPI status ${status}`}
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
}