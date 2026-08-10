/**
 * Facility model section for the Blueprint page.
 *
 * Stage 6B: the Blueprint owns the model and its hierarchy. Scenario
 * execution, comparison and review live in the Simulation workspace, so no
 * run controls are rendered here.
 */
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';
import { FacilityCanvas } from './FacilityCanvas';
import { InspectorPanel } from './panels/InspectorPanel';
import { formatPower, useFacilityModel } from './facilityModel';

export function BlueprintModelSection() {
  const { facility, assets, isFallback, naming } = useFacilityModel();

  return (
    <section className="space-y-3" data-testid="blueprint-model-section">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <nav aria-label="Facility context" className="text-[11px] text-muted-foreground">
            {naming.breadcrumb.join(' / ')}
          </nav>
          <p className="text-xs text-muted-foreground">
            Modelled facility: {facility.name} · {naming.classification} · {formatPower(facility.capacityKw)}
            {isFallback ? ' · reference model' : ''}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/simulation">
            <PlayCircle className="mr-1.5 h-4 w-4" aria-hidden />
            Run a scenario in Simulation
          </Link>
        </Button>
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
