/**
 * Facility model section for the Blueprint page.
 *
 * Stage 6B: the Blueprint owns the model and its hierarchy. Scenario
 * execution, comparison and review live in the Simulation workspace, so no
 * run controls are rendered here.
 */
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FacilityCanvas } from './FacilityCanvas';
import { InspectorPanel } from './panels/InspectorPanel';
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
    <section className="space-y-3" data-testid="blueprint-model-section">
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

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="h-[28rem] overflow-hidden rounded-lg border border-border">
          <FacilityCanvas facility={facility} />
        </div>
        <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-border bg-card p-3">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Asset hierarchy</h2>
          <InspectorPanel facility={facility} assets={assets} />
        </div>
      </div>
    </section>
  );
}
