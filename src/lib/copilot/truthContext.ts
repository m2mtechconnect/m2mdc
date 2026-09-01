/**
 * Facility truth context for the AURA Assistant.
 *
 * Serializes the canonical client-side truth surfaces (operating state,
 * capability registry, viewport registry, run provenance) into ONE structured
 * block that travels with every assistant request. The server rebuilds its
 * own evidence envelope from this block and treats it as downgrade-only
 * evidence: nothing here can upgrade a server baseline claim, and free prose
 * is never accepted as proof (see supabase/functions/_shared/assistantTruth.ts).
 */
import { ACTIVE_MODE, INPUT_CLASSIFICATION, SIMULATION_SOURCE } from '@/capabilities/operatingState';
import { CAPABILITIES, NVIDIA_READINESS } from '@/capabilities/registry';
import { getRunProvenance } from '@/capabilities/runProvenance';
import { viewportSurface, type ViewportSurface } from '@/workspace/viewportRegistry';

export const FACILITY_TRUTH_SCHEMA = 'aura.facility-truth.v1';

export interface FacilityTruthRun {
  id: string;
  calculatedAt: string | null;
  persistence: string | null;
  source: string | null;
}

export interface FacilityTruthViewport {
  id: string;
  renderer: ViewportSurface['renderer'];
  disclosure: string;
  limitation: string | null;
}

export interface FacilityTruthCapability {
  key: string;
  enabled: boolean;
  status: string;
  requirement: string;
}

export interface FacilityTruthContext {
  schema: typeof FACILITY_TRUTH_SCHEMA;
  mode: typeof ACTIVE_MODE;
  inputClassification: typeof INPUT_CLASSIFICATION;
  source: typeof SIMULATION_SOURCE;
  /** Persisted run identity, or null when no run has been recorded. */
  run: FacilityTruthRun | null;
  /** The viewport surface evidence for the active page, when one exists. */
  viewport: FacilityTruthViewport | null;
  capabilities: FacilityTruthCapability[];
  readiness: { productionVerdict: typeof NVIDIA_READINESS.productionVerdict };
  /** When this context block was captured (context time, not telemetry). */
  capturedAt: string;
}

/**
 * Which viewport registry surface grounds the visualisation shown on a page.
 * Pages without a registered facility surface report null, and the assistant
 * abstains from characterising their visualisation.
 */
const PAGE_TO_VIEWPORT_SURFACE: Record<string, string> = {
  dashboard: 'command-centre-plan-card',
  blueprint: 'workspace-model-viewport',
  simulation: 'workspace-model-viewport',
  data_centre_twin: 'overview-mini-preview',
};

export function viewportEvidenceForPage(activePage?: string): FacilityTruthViewport | null {
  const surfaceId = activePage ? PAGE_TO_VIEWPORT_SURFACE[activePage] : undefined;
  if (!surfaceId) return null;
  const surface = viewportSurface(surfaceId);
  return {
    id: surface.id,
    renderer: surface.renderer,
    disclosure: surface.disclosure,
    limitation: surface.limitation ?? null,
  };
}

/**
 * Build the structured facility truth block attached to every assistant
 * request. Reads only the canonical truth modules; never fabricates a run,
 * timestamp or capability.
 */
export function buildFacilityTruthContext(activePage?: string): FacilityTruthContext {
  const provenance = getRunProvenance();
  return {
    schema: FACILITY_TRUTH_SCHEMA,
    mode: ACTIVE_MODE,
    inputClassification: INPUT_CLASSIFICATION,
    source: SIMULATION_SOURCE,
    run:
      provenance.available && provenance.runId
        ? {
            id: provenance.runId,
            calculatedAt: provenance.calculatedAt,
            persistence: provenance.persistenceLabel ?? null,
            source: provenance.source ?? null,
          }
        : null,
    viewport: viewportEvidenceForPage(activePage),
    capabilities: Object.values(CAPABILITIES).map((c) => ({
      key: c.key,
      enabled: c.enabled,
      status: c.status,
      requirement: c.requirement,
    })),
    readiness: { productionVerdict: NVIDIA_READINESS.productionVerdict },
    capturedAt: new Date().toISOString(),
  };
}
