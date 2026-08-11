/**
 * Interactive power one-line diagram: Utility -> UPS -> RPP -> Rack.
 *
 * Only declared connections are drawn. A hop with no metering is drawn with a
 * dashed connector and reports "not instrumented" instead of a value; no
 * branch-level number is invented.
 */
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';
import { dependentRacks } from '@/dsx/workspaces/facilityGraph';
import { EVIDENCE_BETA_ASSETS, EVIDENCE_BETA_SITE } from '@/dsx/fixtures/evidenceBetaFacility';

interface Node {
  key: string;
  name: string;
  detail: string;
  capacity: string;
  instrumented: boolean;
  auraId?: string;
  sourceId?: string;
  loadKw: number | null;
}

function NodeCard({ node }: { node: Node }) {
  const { selectAsset, selectedAssetId } = useWorkspace();
  const body = (
    <>
      <span className="truncate text-[13px] font-semibold">{node.name}</span>
      <span className="truncate text-[12px] tabular-nums">
        {node.loadKw === null ? 'Load not instrumented' : `${node.loadKw.toFixed(1)} kW`}
      </span>
      <span className="truncate text-[12px] text-muted-foreground">{node.capacity}</span>
      <span className="truncate text-[12px] text-muted-foreground">{node.detail}</span>
    </>
  );
  const className = cn(
    'flex min-h-11 w-full min-w-0 flex-col rounded-md border bg-card p-2 text-left',
    node.instrumented ? 'border-border' : 'border-dashed border-muted-foreground/40',
    node.auraId && selectedAssetId === node.auraId && 'ring-2 ring-ring',
  );

  if (!node.auraId) return <div className={className} data-testid={`dsx-power-node-${node.key}`}>{body}</div>;
  return (
    <button
      type="button"
      className={cn(className, 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
      data-testid={`dsx-select-asset-${node.sourceId}`}
      data-aura-id={node.auraId}
      onClick={() => selectAsset(node.auraId!)}
    >
      {body}
    </button>
  );
}

export function PowerOneLine() {
  const { rt } = useWorkspace();
  const facility = rt.bundle.metrics.facility_load?.value ?? null;
  const itLoad = rt.bundle.metrics.it_load?.value ?? null;

  const ups = EVIDENCE_BETA_ASSETS.find((a) => a.asset_class === 'ups');
  const rpps = EVIDENCE_BETA_ASSETS.filter((a) => a.asset_class === 'rpp');

  const stages: { title: string; nodes: Node[] }[] = [
    {
      title: 'Utility',
      nodes: [{
        key: 'utility',
        name: 'Utility supply',
        detail: 'No utility meter is declared in the facility record.',
        capacity: `Site rating ${EVIDENCE_BETA_SITE.rated_kw ?? 'not declared'} kW`,
        instrumented: false,
        loadKw: null,
      }],
    },
    {
      title: 'UPS',
      nodes: ups ? [{
        key: 'ups',
        name: ups.name,
        auraId: ups.aura_asset_id,
        sourceId: ups.source_asset_id,
        detail: `Serves ${dependentRacks(ups.source_asset_id).length} rack(s)`,
        capacity: `Rated ${ups.rated_kw} kW`,
        instrumented: false,
        loadKw: null,
      }] : [],
    },
    {
      title: 'Remote panels',
      nodes: rpps.map((r) => ({
        key: r.source_asset_id,
        name: r.name,
        auraId: r.aura_asset_id,
        sourceId: r.source_asset_id,
        detail: `Serves ${dependentRacks(r.source_asset_id).length} rack(s)`,
        capacity: `Rated ${r.rated_kw} kW`,
        instrumented: false,
        loadKw: null,
      })),
    },
    {
      title: 'Racks',
      nodes: rt.bundle.racks.map((r) => ({
        key: r.source_asset_id,
        name: r.name,
        auraId: r.aura_asset_id,
        sourceId: r.source_asset_id,
        detail: r.observed_at ? `Observed ${r.observed_at.slice(11, 19)} UTC` : 'No observation',
        capacity: 'Rated 120 kW',
        instrumented: r.it_power_kw !== null,
        loadKw: r.it_power_kw,
      })),
    },
  ];

  return (
    <div className="space-y-3" data-testid="dsx-power-one-line">
      <div className="grid gap-3 lg:grid-cols-4">
        {stages.map((stage) => (
          <section key={stage.title} className="min-w-0 space-y-2">
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              {stage.title}
            </h3>
            <div className="space-y-2">
              {stage.nodes.map((n) => <NodeCard key={n.key} node={n} />)}
            </div>
          </section>
        ))}
      </div>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-4 rounded-sm border border-border bg-card" />
          Metered load available
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-4 rounded-sm border border-dashed border-muted-foreground/60" />
          Not instrumented — no branch value is calculated
        </li>
        <li className="tabular-nums">
          Facility draw {facility === null ? 'unavailable' : `${facility.toFixed(1)} kW`} · IT draw{' '}
          {itLoad === null ? 'unavailable' : `${itLoad.toFixed(1)} kW`}
        </li>
      </ul>
    </div>
  );
}