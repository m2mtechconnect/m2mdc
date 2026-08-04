/**
 * Contextual asset drawer.
 *
 * Opens on the right whenever an asset is selected anywhere in the workspace.
 * It states identity, live-relevant observations, dependencies and the related
 * views that keep the same investigation. Nothing here is inferred: an
 * unmapped prim path or an unobserved value is reported as unavailable.
 */
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Link } from 'react-router-dom';
import { useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';
import { relatedViewsForAsset } from '@/dsx/workspaces/relatedViews';
import {
  OPENUSD_UNAVAILABLE, childrenOf, coolingTrace, dependentRacks, electricalTrace,
} from '@/dsx/workspaces/facilityGraph';
import { DESIGN_INLET_LIMIT_C } from '@/dsx/metrics/computeKpis';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] break-all text-right font-mono">{value}</span>
    </div>
  );
}

export function AssetDrawer() {
  const {
    assetDrawerOpen, closeAssetDrawer, selectedAsset, selectedAssetId, selectedAncestry,
    selectionUnavailable, hrefWithContext, rt, selectAsset,
  } = useWorkspace();

  const open = assetDrawerOpen;
  const rack = selectedAsset
    ? rt.bundle.racks.find((r) => r.aura_asset_id === selectedAsset.stable_asset_id)
    : undefined;
  const children = selectedAsset ? childrenOf(selectedAsset.stable_asset_id) : [];
  const dependents = selectedAsset ? dependentRacks(selectedAsset.source_asset_id) : [];
  // Both traces terminate at the rack itself; show each hop once.
  const chain = selectedAsset?.asset_class === 'rack'
    ? [...electricalTrace(selectedAsset.source_asset_id), ...coolingTrace(selectedAsset.source_asset_id)]
        .filter((h, i, all) => all.findIndex((o) => o.identity.stable_asset_id === h.identity.stable_asset_id) === i)
    : [];

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) closeAssetDrawer(); }}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md" data-testid="dsx-asset-drawer">
        <SheetHeader>
          <SheetTitle className="text-base">
            {selectedAsset ? selectedAsset.name : 'Asset unavailable'}
          </SheetTitle>
          <SheetDescription className="text-xs">
            {selectionUnavailable
              ? `No declared record matches asset id ${selectedAssetId}. Nothing is inferred for it.`
              : 'Identity, observations and dependencies for the selected object.'}
          </SheetDescription>
        </SheetHeader>

        {selectedAsset && (
          <div className="space-y-4 pt-4">
            <section className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identity</h3>
              <Row label="AURA asset id" value={selectedAsset.stable_asset_id} />
              <Row label="Source id" value={selectedAsset.source_asset_id} />
              <Row label="Asset class" value={selectedAsset.asset_class} />
              <Row label="Mapping approval" value={selectedAsset.mapping_approval} />
              <Row label="OpenUSD prim" value={selectedAsset.openusd_prim_path ?? OPENUSD_UNAVAILABLE} />
            </section>

            <Separator />

            <section className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</h3>
              <nav aria-label="Asset ancestry" className="flex flex-wrap items-center gap-1 text-xs">
                {selectedAncestry.map((a, i) => (
                  <span key={a.stable_asset_id} className="flex items-center gap-1">
                    {i > 0 && <span aria-hidden className="text-muted-foreground">/</span>}
                    <button
                      type="button"
                      className="rounded-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => selectAsset(a.stable_asset_id)}
                    >
                      {a.name}
                    </button>
                  </span>
                ))}
              </nav>
            </section>

            <Separator />

            <section className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observations</h3>
              {rack ? (
                <>
                  <Row label="Inlet (degC)" value={rack.inlet_c === null ? 'Unavailable' : rack.inlet_c.toFixed(2)} />
                  <Row
                    label={`Headroom to ${DESIGN_INLET_LIMIT_C} degC`}
                    value={rack.inlet_c === null ? 'Unavailable' : (DESIGN_INLET_LIMIT_C - rack.inlet_c).toFixed(2)}
                  />
                  <Row label="IT load (kW)" value={rack.it_power_kw === null ? 'Unavailable' : rack.it_power_kw.toFixed(2)} />
                  <Row label="Observed at" value={rack.observed_at ?? 'none'} />
                  <Row label="Evidence event" value={rack.inlet_event_id ?? 'none'} />
                </>
              ) : (
                <p className="text-xs text-muted-foreground" data-testid="dsx-asset-drawer-no-observation">
                  No observation is published for this object in the connected source, so no value is shown for it.
                </p>
              )}
            </section>

            <Separator />

            <section className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dependencies</h3>
              {children.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Contains: {children.map((c) => c.name).join(', ')}
                </p>
              )}
              {dependents.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Serves: {dependents.map((d) => d.name).join(', ')}
                </p>
              )}
              {chain.length > 0 && (
                <ul className="space-y-0.5 text-xs" data-testid="dsx-asset-drawer-chain">
                  {chain.map((h, i) => (
                    <li key={`${h.identity.stable_asset_id}-${i}`}>{h.role}: {h.identity.name}</li>
                  ))}
                </ul>
              )}
              {children.length === 0 && dependents.length === 0 && chain.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No dependency is declared for this object in the facility record.
                </p>
              )}
            </section>

            <Separator />

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Related views</h3>
              <div className="flex flex-wrap gap-2">
                {relatedViewsForAsset(selectedAsset.asset_class).map((v) => (
                  <Button key={v.id} asChild size="sm" variant="outline" className="h-7 text-xs">
                    <Link to={hrefWithContext(v.path)} title={v.hint} onClick={closeAssetDrawer}>
                      {v.label}
                    </Link>
                  </Button>
                ))}
              </div>
              <Badge variant="outline" className="text-[10px] font-normal">
                Every related view keeps this asset in context.
              </Badge>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
