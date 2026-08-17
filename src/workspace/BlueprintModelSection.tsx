/**
 * Facility model section for the Blueprint page.
 *
 * Stage 6B: the Blueprint owns the model and its hierarchy. Scenario
 * execution, comparison and review live in the Simulation workspace, so no
 * run controls are rendered here.
 *
 * Stage 7K: the visualization dominates the workspace. The inspector is
 * rendered exactly once - as a docked panel on desktop and as an accessible
 * bottom sheet on mobile - so no hidden responsive duplicate reaches the
 * accessibility tree.
 */
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FacilityCanvas } from './FacilityCanvas';
import { InspectorPanel } from './panels/InspectorPanel';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { PanelRightOpen } from 'lucide-react';
import {
  KPI_DESCRIPTORS,
  formatPower,
  useFacilityModel,
  type FacilityOverride,
  type KpiKey,
} from './facilityModel';
import { MODEL_LAYERS } from './LayerSelector';
import { useTwinOverlaySafe, type TwinOverlay } from '@/context/TwinOverlayContext';

interface BlueprintModelSectionProps {
  /**
   * Facility identity from the routed blueprint. `/blueprint/:id` is
   * authoritative over the active twin, so the model renders the routed
   * record and both surfaces report one capacity.
   */
  facilityOverride?: FacilityOverride;
}

export function BlueprintModelSection({ facilityOverride }: BlueprintModelSectionProps = {}) {
  const { facility, assets, isFallback, naming, modelNotes } = useFacilityModel(facilityOverride);
  const [searchParams] = useSearchParams();
  const { setOverlay } = useTwinOverlaySafe();
  const isMobile = useIsMobile();
  const [inspectorOpen, setInspectorOpen] = useState(false);
  // The Assistant panel narrows the content region without changing the
  // viewport, so viewport breakpoints keep a two-column model layout that
  // squeezes the canvas to a few hundred pixels and stacks the canvas
  // overlays on top of each other. Measure the section instead.
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setIsNarrow(width > 0 && width < 900);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stacked = isMobile || isNarrow;

  // Drilldown context from the Command Centre: `layer` selects the model
  // overlay, `kpi` explains which indicator the user came from.
  const layerParam = searchParams.get('layer');
  const kpiParam = searchParams.get('kpi');
  const requestedLayer = MODEL_LAYERS.includes(layerParam as TwinOverlay)
    ? (layerParam as TwinOverlay)
    : null;
  const kpiDescriptor = kpiParam ? KPI_DESCRIPTORS[kpiParam as KpiKey] : undefined;

  useEffect(() => {
    if (requestedLayer) setOverlay(requestedLayer);
  }, [requestedLayer, setOverlay]);

  return (
    <section ref={sectionRef} className="space-y-3" data-testid="blueprint-model-section">
      {kpiDescriptor && (
        <div
          className="rounded-md border border-border bg-muted/40 px-3 py-2"
          data-testid="blueprint-kpi-drilldown"
        >
          <p className="text-[12px] font-medium text-foreground">
            Drilldown: {kpiDescriptor.label} · {kpiDescriptor.overlay} layer
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Derivation: {kpiDescriptor.derivation} Inputs: {kpiDescriptor.inputs.join(', ')}.
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <nav aria-label="Facility context" className="text-[11px] text-muted-foreground">
            {naming.breadcrumb.join(' / ')}
          </nav>
          <p className="text-xs text-muted-foreground">
            Modelled facility: {facility.name} · {naming.classification} · {formatPower(facility.capacityKw)}
            {isFallback ? ' · reference model' : ''}
          </p>
          {modelNotes.map((note) => (
            <p key={note} className="text-[11px] text-muted-foreground">{note}</p>
          ))}
        </div>
        {/* Stage 7H: Blueprint exposes exactly one simulation handoff action,
            in the Designer header. No duplicate entry point lives here. */}
      </div>

      <div className={stacked ? 'grid gap-3' : 'grid gap-3 grid-cols-[minmax(0,1fr)_21rem]'}>
        <div
          className="h-[24rem] overflow-hidden rounded-lg border border-border md:h-[30rem]"
          data-testid="blueprint-model-canvas"
        >
          <FacilityCanvas facility={facility} />
        </div>

        {isMobile ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 w-full gap-1.5"
              onClick={() => setInspectorOpen(true)}
              data-testid="blueprint-inspector-trigger"
            >
              <PanelRightOpen className="h-4 w-4" aria-hidden />
              Inspect assets
            </Button>
            <Sheet open={inspectorOpen} onOpenChange={setInspectorOpen}>
              <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-sm">Asset hierarchy</SheetTitle>
                </SheetHeader>
                <div className="mt-3">
                  <InspectorPanel facility={facility} assets={assets} />
                </div>
              </SheetContent>
            </Sheet>
          </>
        ) : (
          <div
            className="max-h-[30rem] overflow-y-auto rounded-lg border border-border bg-card p-3"
            data-testid="blueprint-inspector"
          >
            <h2 className="mb-2 text-sm font-semibold text-foreground">Asset hierarchy</h2>
            <InspectorPanel facility={facility} assets={assets} />
          </div>
        )}
      </div>
    </section>
  );
}
