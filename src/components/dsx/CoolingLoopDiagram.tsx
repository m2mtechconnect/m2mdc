/**
 * Interactive cooling-loop diagram: CDU -> cooling unit -> served racks.
 *
 * Supply and return paths are drawn from declared connections. Flow and
 * differential-pressure visuals are omitted entirely, because no hydraulic
 * instrumentation is connected; a single missing-source state says so once.
 */
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';
import { coolingChain, dependentRacks } from '@/dsx/workspaces/facilityGraph';
import { DESIGN_INLET_LIMIT_C } from '@/dsx/metrics/computeKpis';

export function CoolingLoopDiagram() {
  const { rt, selectAsset, selectedAssetId } = useWorkspace();
  const chain = coolingChain();
  const cooling = rt.bundle.metrics.cooling_load?.value ?? null;

  return (
    <div className="space-y-3" data-testid="dsx-cooling-loop">
      <div className="grid gap-3 lg:grid-cols-3">
        {chain.map((unit) => {
          const served = dependentRacks(unit.source_asset_id);
          const readings = rt.bundle.racks.filter((r) => served.some((s) => s.stable_asset_id === r.aura_asset_id));
          const inlets = readings.map((r) => r.inlet_c).filter((v): v is number => v !== null);
          const headroom = inlets.length ? DESIGN_INLET_LIMIT_C - Math.max(...inlets) : null;
          return (
            <section key={unit.aura_asset_id} className="min-w-0 rounded-md border border-border bg-card p-3">
              <button
                type="button"
                data-testid={`dsx-select-asset-${unit.source_asset_id}`}
                data-aura-id={unit.aura_asset_id}
                onClick={() => selectAsset(unit.aura_asset_id)}
                className={cn(
                  'w-full truncate rounded-sm text-left text-[14px] font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selectedAssetId === unit.aura_asset_id && 'ring-2 ring-ring',
                )}
              >
                {unit.name}
              </button>
              <dl className="mt-1 grid grid-cols-[9rem_1fr] gap-x-2 text-[13px]">
                <dt className="text-muted-foreground">Class</dt>
                <dd>{unit.asset_class.replace(/_/g, ' ')}</dd>
                <dt className="text-muted-foreground">Rated capacity</dt>
                <dd className="tabular-nums">{unit.rated_kw} kW</dd>
                <dt className="text-muted-foreground">Supply path</dt>
                <dd className="truncate">{unit.connection_points.filter((c) => c.startsWith('CDU')).join(', ') || 'terminal loop'}</dd>
                <dt className="text-muted-foreground">Return path</dt>
                <dd className="text-muted-foreground">Not instrumented</dd>
                <dt className="text-muted-foreground">Connected racks</dt>
                <dd className="tabular-nums">{served.length}</dd>
                <dt className="text-muted-foreground">Thermal headroom</dt>
                <dd className="tabular-nums">
                  {headroom === null ? 'Unavailable' : `${headroom.toFixed(1)} degC`}
                </dd>
              </dl>
              {served.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1">
                  {served.map((s) => (
                    <li key={s.stable_asset_id}>
                      <button
                        type="button"
                        onClick={() => selectAsset(s.stable_asset_id)}
                        className="rounded-sm border border-border px-1.5 py-0.5 text-[12px] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {s.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <p className="text-[12px] text-muted-foreground tabular-nums">
        Cooling electrical draw {cooling === null ? 'unavailable' : `${cooling.toFixed(1)} kW`}. Coolant
        temperature, flow and differential pressure are not instrumented, so no hydraulic path is drawn.
      </p>
    </div>
  );
}