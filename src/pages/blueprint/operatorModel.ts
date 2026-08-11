/**
 * Stage 7K — pure derivation for the Blueprint Model operator workspace.
 *
 * The Model page answers four questions only: what am I viewing, what is
 * modelled here, what needs attention, and where do I go next. Everything in
 * this module is pure so the information architecture contract can be
 * unit-tested without rendering the page.
 *
 * Truthfulness: no value is invented. Every metric carries an evidence state
 * and a metric with no trustworthy source is reported as `unavailable`
 * rather than estimated silently. Nothing here uses Math.random().
 */

import type { BlueprintSummary, DataCentreBlueprint } from '@/types/dataCentreBlueprint';
import type { QuarantinedCapacity } from '@/lib/units/capacityQuarantine';

export type EvidenceState =
  | 'authoritative'
  | 'derived'
  | 'estimated'
  | 'conflicting'
  | 'unavailable';

export const EVIDENCE_LABELS: Record<EvidenceState, string> = {
  authoritative: 'Authoritative',
  derived: 'Derived',
  estimated: 'Estimated',
  conflicting: 'Conflicting',
  unavailable: 'Unavailable',
};

export interface OperatorMetric {
  id: 'capacity' | 'efficiency' | 'coverage' | 'blockers';
  label: string;
  value: string;
  /** One short qualifier, never a paragraph. */
  detail: string;
  state: EvidenceState;
}

export type AttentionSeverity = 'high' | 'medium' | 'low';

export interface AttentionItem {
  id: string;
  severity: AttentionSeverity;
  title: string;
  /** One line describing the operational consequence. */
  consequence: string;
  evidence: EvidenceState;
  /** Canonical destination that owns the fix. */
  destination: string;
  /** Router path (same-origin) for the single next action. */
  href: string;
  actionLabel: string;
}

export interface ModelCoverage {
  renderedRacks: number;
  estimatedTotal: number;
  /** Integer percent, 0-100. */
  percent: number;
}

export function computeCoverage(renderedRacks: number, estimatedTotal: number): ModelCoverage {
  const total = estimatedTotal > 0 ? estimatedTotal : renderedRacks;
  const percent = total > 0 ? Math.round((renderedRacks / total) * 100) : 0;
  return { renderedRacks, estimatedTotal: total, percent };
}

export interface OperatorModelInput {
  blueprint: DataCentreBlueprint;
  summary: BlueprintSummary | null;
  /** Canonical facility capacity in kW after unit normalisation. */
  capacityKw: number;
  capacityLabel: string;
  /** Present when the stored capacity had to be reinterpreted. */
  capacityNote?: string | null;
  /** Records the unit pipeline refused to publish. */
  quarantined: QuarantinedCapacity[];
  coverage: ModelCoverage;
  /** Measured PUE, when an authoritative source exists. */
  pue?: number | null;
  pueTarget?: number | null;
  pueState?: EvidenceState;
  /** Base blueprint route used to build destination links. */
  blueprintPath: string;
}

/** Exactly four metrics. No vanity counts. */
export function buildOperatorMetrics(input: OperatorModelInput): OperatorMetric[] {
  const capacityConflicting = input.quarantined.length > 0;
  const capacityState: EvidenceState = capacityConflicting
    ? 'conflicting'
    : input.capacityNote
      ? 'derived'
      : input.capacityKw > 0
        ? 'authoritative'
        : 'unavailable';

  const pueState: EvidenceState = input.pue == null ? 'unavailable' : (input.pueState ?? 'derived');
  const pueDelta =
    input.pue != null && input.pueTarget != null
      ? `${input.pue > input.pueTarget ? '+' : ''}${(input.pue - input.pueTarget).toFixed(2)} vs target ${input.pueTarget.toFixed(2)}`
      : 'No authoritative target';

  const blockers = countBlockers(input);

  return [
    {
      id: 'capacity',
      label: 'Capacity',
      value: input.capacityKw > 0 ? input.capacityLabel : 'Not available',
      detail: capacityConflicting
        ? `${input.quarantined.length} quarantined record${input.quarantined.length === 1 ? '' : 's'}`
        : 'Canonical unit capacity_kw',
      state: capacityState,
    },
    {
      id: 'efficiency',
      label: 'PUE',
      value: input.pue != null ? input.pue.toFixed(2) : 'Not available',
      detail: pueDelta,
      state: pueState,
    },
    {
      id: 'coverage',
      label: 'Model coverage',
      value: `${input.coverage.percent}%`,
      detail: `${input.coverage.renderedRacks} rendered of ${input.coverage.estimatedTotal} estimated racks`,
      state: input.coverage.percent >= 100 ? 'authoritative' : 'estimated',
    },
    {
      id: 'blockers',
      label: 'Open blockers',
      value: String(blockers),
      detail: blockers === 0 ? 'No unresolved validation issues' : 'Blocks simulation readiness',
      state: blockers > 0 ? 'conflicting' : 'authoritative',
    },
  ];
}

function countBlockers(input: OperatorModelInput): number {
  return buildAttentionItems(input).filter((i) => i.severity === 'high').length;
}

/**
 * One prioritized list. Risks, readiness blockers, data conflicts and
 * evidence-backed opportunities are merged; generic positive recommendations
 * are excluded because they are not operator work.
 */
export function buildAttentionItems(input: OperatorModelInput): AttentionItem[] {
  const items: AttentionItem[] = [];
  const validation = `${input.blueprintPath}?tab=validation`;
  const controls = (sub: string) => `${input.blueprintPath}?tab=controls&sub=${sub}`;

  for (const record of input.quarantined) {
    items.push({
      id: `quarantine-${record.record.id}`,
      severity: 'high',
      title: `Capacity evidence is unverified for ${record.record.label}`,
      consequence: 'Simulation readiness is blocked until the source value is confirmed.',
      evidence: 'conflicting',
      destination: 'Validation',
      href: validation,
      actionLabel: 'Review in Validation',
    });
  }

  if (input.capacityNote && input.quarantined.length === 0) {
    items.push({
      id: 'capacity-derived',
      severity: 'medium',
      title: 'Stored capacity was reinterpreted on read',
      consequence: 'Capacity is shown as derived until the stored unit is corrected at source.',
      evidence: 'derived',
      destination: 'Validation',
      href: validation,
      actionLabel: 'Review in Validation',
    });
  }

  if (input.coverage.percent < 100) {
    items.push({
      id: 'coverage-partial',
      severity: 'medium',
      title: 'Visualization covers part of the facility',
      consequence: `${input.coverage.renderedRacks} of ${input.coverage.estimatedTotal} racks are rendered; the remainder is an aggregate load model.`,
      evidence: 'estimated',
      destination: 'Assets & Systems',
      href: `${input.blueprintPath}?tab=assets`,
      actionLabel: 'Open Assets & Systems',
    });
  }

  const disabledDomains = Object.entries(input.blueprint.domains)
    .filter(([, d]) => !d.enabled)
    .map(([key]) => key);
  if (disabledDomains.length > 0) {
    items.push({
      id: 'domains-disabled',
      severity: 'low',
      title: `${disabledDomains.length} modelled domain${disabledDomains.length === 1 ? ' is' : 's are'} disabled`,
      consequence: 'Those subsystems contribute no signals to the model or its KPIs.',
      evidence: 'authoritative',
      destination: 'Assets & Systems',
      href: `${input.blueprintPath}?tab=assets`,
      actionLabel: 'Open Assets & Systems',
    });
  }

  const agentless = input.blueprint.agents.length === 0;
  if (agentless) {
    items.push({
      id: 'agents-missing',
      severity: 'high',
      title: 'No control agents are configured',
      consequence: 'The model cannot respond to any modelled subsystem condition.',
      evidence: 'authoritative',
      destination: 'Controls / Agents',
      href: controls('agents'),
      actionLabel: 'Open Controls',
    });
  }

  if (input.blueprint.kpis.length === 0) {
    items.push({
      id: 'kpis-missing',
      severity: 'medium',
      title: 'No KPIs are tracked for this Blueprint',
      consequence: 'Facility performance cannot be evaluated against any target.',
      evidence: 'authoritative',
      destination: 'Controls / KPIs',
      href: controls('kpis'),
      actionLabel: 'Open Controls',
    });
  }

  const order: Record<AttentionSeverity, number> = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => order[a.severity] - order[b.severity]);
}

/**
 * The attention list is expanded by default only when unresolved
 * high-severity work exists; otherwise the operator sees a compact
 * successful state.
 */
export function shouldExpandAttention(items: AttentionItem[]): boolean {
  return items.some((i) => i.severity === 'high');
}

export const MODEL_ACCORDION_IDS = ['model-details', 'data-confidence', 'linked-config'] as const;
export type ModelAccordionId = (typeof MODEL_ACCORDION_IDS)[number];

/**
 * Default open state for the three permitted Model accordions. Only a
 * blocking data conflict opens one by default.
 */
export function defaultAccordionState(hasBlockingConflict: boolean): Record<ModelAccordionId, boolean> {
  return {
    'model-details': false,
    'data-confidence': hasBlockingConflict,
    'linked-config': false,
  };
}