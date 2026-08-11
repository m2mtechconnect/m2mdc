/**
 * Side inspector.
 *
 * One contextual surface for the selected asset, organised as Summary,
 * Evidence, Dependencies and History. On desktop it is a resizable side
 * panel (drag or arrow-key the separator); on mobile it becomes a
 * full-screen sheet. Nothing is inferred: an unmapped prim path, an
 * unobserved value or an empty run is reported as unavailable.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';
import { relatedViewsForAsset } from '@/dsx/workspaces/relatedViews';
import {
  OPENUSD_UNAVAILABLE, childrenOf, coolingTrace, dependentRacks, electricalTrace,
} from '@/dsx/workspaces/facilityGraph';
import { DESIGN_INLET_LIMIT_C, computeKpiBundle } from '@/dsx/metrics/computeKpis';
import { TICK_MS, TIMELINE_START_ISO } from '@/dsx/fixtures/timelines';

const WIDTH_KEY = 'aura.dsx.inspector.width';
const MIN_WIDTH = 320;
const MAX_WIDTH = 560;
const STEP = 24;

function clampWidth(px: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(px)));
}

function readStoredWidth(): number {
  if (typeof window === 'undefined') return 400;
  const raw = Number(window.localStorage.getItem(WIDTH_KEY));
  return Number.isFinite(raw) && raw > 0 ? clampWidth(raw) : 400;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] break-all text-right font-mono">{value}</span>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</h3>
  );
}

function Empty({ children, testId }: { children: React.ReactNode; testId?: string }) {
  return <p className="text-xs text-muted-foreground" data-testid={testId}>{children}</p>;
}

function InspectorBody() {
  const {
    selectedAsset, selectedAssetId, selectedAncestry, selectionUnavailable,
    hrefWithContext, rt, selectAsset, closeAssetDrawer,
  } = useWorkspace();

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

  const sourceId = selectedAsset?.source_asset_id ?? null;

  const accepted = useMemo(
    () => (sourceId ? rt.snapshot.accepted.filter((a) => a.mapping.source_asset_id === sourceId) : []),
    [rt.snapshot.accepted, sourceId],
  );
  const rejected = useMemo(
    () => (sourceId ? rt.snapshot.rejected.filter((r) => r.source_asset_id === sourceId) : []),
    [rt.snapshot.rejected, sourceId],
  );

  /** Per-asset history recomputed through the same ingestion pipeline as the tiles. */
  const history = useMemo(() => {
    if (!selectedAsset) return [];
    const points: { tick: number; observed_at: string | null; inlet_c: number | null; it_power_kw: number | null }[] = [];
    for (let t = 0; t <= rt.tick; t++) {
      const nowMs = Date.parse(TIMELINE_START_ISO) + t * TICK_MS + 2_000;
      const snapshot = rt.source.snapshotAt(t, nowMs);
      const reading = computeKpiBundle(snapshot, nowMs).racks
        .find((r) => r.aura_asset_id === selectedAsset.stable_asset_id);
      points.push({
        tick: t,
        observed_at: reading?.observed_at ?? null,
        inlet_c: reading?.inlet_c ?? null,
        it_power_kw: reading?.it_power_kw ?? null,
      });
    }
    return points.reverse();
  }, [selectedAsset, rt.source, rt.tick]);

  if (!selectedAsset) {
    return (
      <Empty testId="dsx-inspector-empty">
        {selectionUnavailable
          ? `No declared record matches asset id ${selectedAssetId}. Nothing is inferred for it.`
          : 'Select an object to inspect it.'}
      </Empty>
    );
  }

  return (
    <Tabs defaultValue="summary" className="pt-3">
      <TabsList className="grid w-full grid-cols-4" data-testid="dsx-inspector-tabs">
        <TabsTrigger value="summary" className="text-[11px]">Summary</TabsTrigger>
        <TabsTrigger value="evidence" className="text-[11px]">Evidence</TabsTrigger>
        <TabsTrigger value="dependencies" className="text-[11px]">Dependencies</TabsTrigger>
        <TabsTrigger value="history" className="text-[11px]">History</TabsTrigger>
      </TabsList>

      <TabsContent value="summary" className="space-y-4" data-testid="dsx-inspector-summary">
        <section className="space-y-1">
          <SectionHeading>Identity</SectionHeading>
          <Row label="AURA asset id" value={selectedAsset.stable_asset_id} />
          <Row label="Source id" value={selectedAsset.source_asset_id} />
          <Row label="Asset class" value={selectedAsset.asset_class} />
          <Row label="Mapping approval" value={selectedAsset.mapping_approval} />
          <Row label="OpenUSD prim" value={selectedAsset.openusd_prim_path ?? OPENUSD_UNAVAILABLE} />
        </section>

        <Separator />

        <section className="space-y-1">
          <SectionHeading>Location</SectionHeading>
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
          <SectionHeading>Observations</SectionHeading>
          {rack ? (
            <>
              <Row label="Inlet (degC)" value={rack.inlet_c === null ? 'Unavailable' : rack.inlet_c.toFixed(2)} />
              <Row
                label={`Headroom to ${DESIGN_INLET_LIMIT_C} degC`}
                value={rack.inlet_c === null ? 'Unavailable' : (DESIGN_INLET_LIMIT_C - rack.inlet_c).toFixed(2)}
              />
              <Row label="IT load (kW)" value={rack.it_power_kw === null ? 'Unavailable' : rack.it_power_kw.toFixed(2)} />
              <Row label="Observed at" value={rack.observed_at ?? 'none'} />
            </>
          ) : (
            <Empty testId="dsx-asset-drawer-no-observation">
              No observation is published for this object in the connected source, so no value is shown for it.
            </Empty>
          )}
        </section>
      </TabsContent>

      <TabsContent value="evidence" className="space-y-4" data-testid="dsx-inspector-evidence">
        <section className="space-y-2">
          <SectionHeading>Accepted observations ({accepted.length})</SectionHeading>
          {accepted.length === 0 ? (
            <Empty>No accepted observation references this object at the current observation step.</Empty>
          ) : (
            <ul className="space-y-2">
              {accepted.map((a, i) => (
                <li key={`${a.envelope.event_id ?? 'event'}-${i}`} className="rounded-md border border-border p-2">
                  <Row label="Metric" value={a.metric_name} />
                  <Row
                    label="Value"
                    value={typeof a.envelope.value === 'number'
                      ? `${a.envelope.value} ${a.envelope.unit ?? ''}`.trim()
                      : 'Unavailable'}
                  />
                  <Row label="Observed at" value={a.envelope.observed_at} />
                  <Row label="Event id" value={a.envelope.event_id ?? 'none'} />
                  <Row label="Payload hash" value={a.payload_hash} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <Separator />

        <section className="space-y-2">
          <SectionHeading>Quarantined ({rejected.length})</SectionHeading>
          {rejected.length === 0 ? (
            <Empty>No record for this object was quarantined in this run.</Empty>
          ) : (
            <ul className="space-y-2">
              {rejected.map((r, i) => (
                <li key={`${r.payload_hash}-${i}`} className="rounded-md border border-border p-2">
                  <Row label="Reason" value={r.reason} />
                  <Row label="Detail" value={r.detail} />
                  <Row label="Observed at" value={r.observed_at ?? 'none'} />
                  <Row label="Event id" value={r.event_id ?? 'none'} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </TabsContent>

      <TabsContent value="dependencies" className="space-y-4" data-testid="dsx-inspector-dependencies">
        <section className="space-y-1">
          <SectionHeading>Declared relationships</SectionHeading>
          {children.length > 0 && (
            <p className="text-xs text-muted-foreground">Contains: {children.map((c) => c.name).join(', ')}</p>
          )}
          {dependents.length > 0 && (
            <p className="text-xs text-muted-foreground">Serves: {dependents.map((d) => d.name).join(', ')}</p>
          )}
          {chain.length > 0 && (
            <ul className="space-y-0.5 text-xs" data-testid="dsx-asset-drawer-chain">
              {chain.map((h, i) => (
                <li key={`${h.identity.stable_asset_id}-${i}`}>{h.role}: {h.identity.name}</li>
              ))}
            </ul>
          )}
          {children.length === 0 && dependents.length === 0 && chain.length === 0 && (
            <Empty>No dependency is declared for this object in the facility record.</Empty>
          )}
        </section>

        <Separator />

        <section className="space-y-2">
          <SectionHeading>Related views</SectionHeading>
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
      </TabsContent>

      <TabsContent value="history" className="space-y-2" data-testid="dsx-inspector-history">
        <SectionHeading>Observation steps in this run</SectionHeading>
        {history.every((p) => p.inlet_c === null && p.it_power_kw === null) ? (
          <Empty>No observation is published for this object in this run, so no history is drawn.</Empty>
        ) : (
          <ul className="space-y-1">
            {history.map((p) => (
              <li
                key={p.tick}
                className="flex items-baseline justify-between gap-2 rounded-sm border border-border/60 px-2 py-1 text-xs"
              >
                <span className="text-muted-foreground">Step {p.tick}</span>
                <span className="font-mono tabular-nums">
                  {p.inlet_c === null ? 'Inlet unavailable' : `${p.inlet_c.toFixed(2)} degC`}
                  {' / '}
                  {p.it_power_kw === null ? 'load unavailable' : `${p.it_power_kw.toFixed(2)} kW`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}

export function SideInspector() {
  const { assetDrawerOpen, closeAssetDrawer, selectedAsset, selectedAssetId, selectionUnavailable } = useWorkspace();
  const isMobile = useIsMobile();
  const [width, setWidth] = useState<number>(() => readStoredWidth());
  const dragging = useRef(false);

  useEffect(() => {
    window.localStorage.setItem(WIDTH_KEY, String(width));
  }, [width]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragging.current) return;
    setWidth(clampWidth(window.innerWidth - e.clientX));
  }, []);

  useEffect(() => {
    const stop = () => { dragging.current = false; };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stop);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', stop);
    };
  }, [onPointerMove]);

  const onSeparatorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); setWidth((w) => clampWidth(w + STEP)); }
    if (e.key === 'ArrowRight') { e.preventDefault(); setWidth((w) => clampWidth(w - STEP)); }
    if (e.key === 'Home') { e.preventDefault(); setWidth(MAX_WIDTH); }
    if (e.key === 'End') { e.preventDefault(); setWidth(MIN_WIDTH); }
  };

  return (
    <Sheet open={assetDrawerOpen} onOpenChange={(o) => { if (!o) closeAssetDrawer(); }}>
      <SheetContent
        side="right"
        style={isMobile ? undefined : { width, maxWidth: '100vw' }}
        className={cn(
          'overflow-y-auto',
          isMobile ? 'inset-0 h-full w-full max-w-none' : 'sm:max-w-none',
        )}
        data-testid="dsx-asset-drawer"
        data-inspector="side"
        data-asset-id={selectedAssetId ?? ''}
      >
        {!isMobile && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize inspector panel"
            aria-valuemin={MIN_WIDTH}
            aria-valuemax={MAX_WIDTH}
            aria-valuenow={width}
            tabIndex={0}
            data-testid="dsx-inspector-resizer"
            onPointerDown={(e) => { dragging.current = true; e.preventDefault(); }}
            onKeyDown={onSeparatorKeyDown}
            className="absolute inset-y-0 left-0 w-1.5 cursor-col-resize bg-border/60 hover:bg-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        )}
        <SheetHeader>
          <SheetTitle className="text-base">
            {selectedAsset ? selectedAsset.name : 'Asset unavailable'}
          </SheetTitle>
          <SheetDescription className="text-xs">
            {selectionUnavailable
              ? `No declared record matches asset id ${selectedAssetId}. Nothing is inferred for it.`
              : 'Summary, evidence, dependencies and history for the selected object.'}
          </SheetDescription>
        </SheetHeader>
        <InspectorBody />
      </SheetContent>
    </Sheet>
  );
}
