/**
 * PR-0.1 Checkpoint B7.4E - Primary AURA overview (approved-user pilot).
 *
 * Read-only list of the current user's data_centre_twins rows.
 * No edge functions. No writes. No fabricated fallback data.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listPilotTwins, type PilotTwinRow, type PilotResult } from "./pilotReadAdapter";

export default function PilotOverview() {
  const [result, setResult] = useState<PilotResult<PilotTwinRow[]> | null>(null);

  useEffect(() => {
    let active = true;
    listPilotTwins().then((r) => {
      if (active) setResult(r);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section aria-labelledby="pilot-overview-heading" className="space-y-4">
      <header className="space-y-1">
        <h1 id="pilot-overview-heading" className="text-xl font-semibold">
          Data-centre twins
        </h1>
        <p className="text-xs text-muted-foreground">
          Source: <code>public.data_centre_twins</code>. Row visibility is enforced
          server-side by row-level security scoped to the record owner.
        </p>
      </header>

      {result === null && (
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          Loading twins...
        </p>
      )}

      {result?.status === "denied" && (
        <p role="alert" className="text-sm text-destructive">
          You are not authorized to view this data.
        </p>
      )}

      {result?.status === "unavailable" && (
        <p role="alert" className="text-sm text-destructive">
          Data is currently unavailable ({result.reason}). No fallback records
          are shown.
        </p>
      )}

      {result?.status === "empty" && (
        <p role="status" className="text-sm text-muted-foreground">
          No twins are visible under your account.
        </p>
      )}

      {result?.status === "ok" && (
        <ul className="divide-y divide-border border border-border rounded" data-testid="pilot-twin-list">
          {result.data.map((t) => (
            <li key={t.id} className="p-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <Link
                  to={`/pilot/asset/${t.id}`}
                  className="font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {t.name}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {t.city} - {t.region_code} - Tier {t.tier} - {t.capacity_kw} kW
                </div>
              </div>
              <div
                className="text-xs text-muted-foreground shrink-0"
                aria-label={`Last updated ${t.updated_at}`}
              >
                Updated {new Date(t.updated_at).toISOString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}