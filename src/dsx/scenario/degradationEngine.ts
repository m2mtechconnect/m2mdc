/**
 * Cooling-degradation scenario engine.
 *
 * Produces evidence-linked recommendations from computed KPIs. It NEVER
 * dispatches a control action: every recommendation requires a recorded
 * human decision, and execution stays manual and outside AURA.
 */
import type { KpiBundle } from '../metrics/computeKpis';
import { DESIGN_INLET_LIMIT_C } from '../metrics/computeKpis';
import type { SourceSnapshot } from '../adapters/types';
import type { Recommendation, RecommendationSeverity } from '../contracts/recommendation';
import { stableUuid } from '../fixtures/determinism';
import { UNCALIBRATED_NOTICE } from '../modes';

export const SCENARIO_ID = 'cooling_degradation';
export const SCENARIO_VERSION = '1.0.0';
export const MODEL_VERSION = 'aura-dsx-thermal/0.1.0-uncalibrated';

export type ScenarioPhase = 'nominal' | 'degrading' | 'threshold_breach' | 'recovered';

export interface ScenarioState {
  phase: ScenarioPhase;
  headroom_c: number | null;
  recommendations: Recommendation[];
}

const BASE_LIMITATIONS = [
  UNCALIBRATED_NOTICE,
  'Thermal response model is uncalibrated against the physical facility.',
  'Recommendation is advisory only; AURA performs no physical control.',
];

function severityFor(headroom: number): RecommendationSeverity {
  if (headroom <= 0) return 'critical';
  if (headroom <= 1.5) return 'warning';
  if (headroom <= 3) return 'advisory';
  return 'info';
}

export function evaluateScenario(
  bundle: KpiBundle,
  snapshot: SourceSnapshot,
  nowIso: string,
): ScenarioState {
  const headroomMetric = bundle.metrics.thermal_headroom;
  const headroom = headroomMetric?.value ?? null;
  const dataMode = snapshot.data_mode === 'REPLAYED' ? 'REPLAYED' : 'SIMULATED';

  if (headroom === null) {
    return { phase: 'nominal', headroom_c: null, recommendations: [] };
  }

  const phase: ScenarioPhase =
    headroom <= 0 ? 'threshold_breach' : headroom <= 3 ? 'degrading' : 'nominal';

  if (phase === 'nominal') {
    return { phase, headroom_c: headroom, recommendations: [] };
  }

  const hotspot = bundle.hotspot;
  const severity = severityFor(headroom);
  const evidenceEvents = [
    ...(headroomMetric?.source_event_ids ?? []),
    ...(bundle.metrics.cooling_load?.source_event_ids ?? []),
  ];

  const rec: Recommendation = {
    recommendation_id: stableUuid(`${SCENARIO_ID}:${snapshot.run_id}:${snapshot.tick}:thermal`),
    created_at: nowIso,
    evidence: {
      event_ids: evidenceEvents,
      metric_names: ['Thermal headroom', 'Max rack inlet temperature', 'Cooling load'],
      simulation_run_id: snapshot.run_id,
      asset_ids: hotspot ? [hotspot.aura_asset_id] : [],
    },
    text:
      phase === 'threshold_breach'
        ? `Rack inlet temperature has reached the ${DESIGN_INLET_LIMIT_C} degC design limit at ${hotspot?.name ?? 'an unidentified rack'}. Cooling capacity on the affected loop is insufficient for the current IT load.`
        : `Thermal headroom at ${hotspot?.name ?? 'the hottest rack'} has fallen to ${headroom.toFixed(2)} degC against a ${DESIGN_INLET_LIMIT_C} degC design limit while cooling electrical draw is rising.`,
    severity,
    expected_effect:
      'Restoring the degraded cooling loop is modelled to recover inlet temperature toward the 22.5 degC baseline. Effect size is unverified.',
    confidence: null,
    limitations: BASE_LIMITATIONS,
    proposed_action:
      'Human operator: inspect the affected cooling unit for capacity loss and, if confirmed, redistribute or shed load on the affected racks through existing facility procedures.',
    requires_human_decision: true,
    data_mode: dataMode,
  };

  const recommendations: Recommendation[] = [rec];

  const quality = bundle.metrics.data_quality;
  if (typeof quality?.value === 'number' && quality.value < 99) {
    recommendations.push({
      recommendation_id: stableUuid(`${SCENARIO_ID}:${snapshot.run_id}:${snapshot.tick}:quality`),
      created_at: nowIso,
      evidence: {
        event_ids: [],
        metric_names: ['Data-quality score', 'Asset-mapping coverage'],
        simulation_run_id: snapshot.run_id,
        asset_ids: [],
      },
      text: `${snapshot.rejected.length} observation(s) were quarantined during this window, so the thermal picture is incomplete.`,
      severity: 'advisory',
      expected_effect: 'Resolving the quarantined records restores full coverage of the affected loop.',
      confidence: null,
      limitations: BASE_LIMITATIONS,
      proposed_action:
        'Human operator: review the audit workspace and correct the source mappings, units and clock offsets that caused the quarantines.',
      requires_human_decision: true,
      data_mode: dataMode,
    });
  }

  return { phase, headroom_c: headroom, recommendations };
}