/**
 * Stage 7A - prioritised attention queue.
 *
 * Every item is derived from state that actually exists in this environment
 * (modelled KPI values, recorded runs, model notes, integration capability
 * flags). Nothing here implies live monitoring, so the vocabulary is design
 * and model language, never alarm language.
 */
import type { FacilityDefinition } from '../facilityModel';
import type { KpiInterpretation } from './kpiInterpretation';

export type AttentionSeverity = 'constraint' | 'review' | 'informational';

export type AttentionCategory =
  | 'Design constraint'
  | 'Modelled risk'
  | 'Evidence unavailable'
  | 'Integration blocked'
  | 'Assumption requires review'
  | 'Data quality issue';

export interface AttentionItem {
  id: string;
  severity: AttentionSeverity;
  category: AttentionCategory;
  subsystem: string;
  title: string;
  impact: string;
  evidence: string;
  /** ISO timestamp of the state this item was derived from. */
  observedAt: string;
  /** How the timestamp above was obtained, so the drawer can label it truthfully. */
  observedBasis: 'derivation' | 'run' | 'registry';
  actions: Array<{ label: string; to: string }>;
}

export const SEVERITY_META: Record<AttentionSeverity, { label: string; className: string; dot: string }> = {
  constraint: {
    label: 'Constraint',
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
    dot: 'bg-destructive',
  },
  review: {
    label: 'Review',
    className: 'border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
    dot: 'bg-amber-600',
  },
  informational: {
    label: 'Context',
    className: 'border-border bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
};

const SEVERITY_ORDER: AttentionSeverity[] = ['constraint', 'review', 'informational'];

/** Stage 7B - Action Center filter groups. */
export type AttentionGroup = 'constraints' | 'data-quality' | 'readiness' | 'assumptions';

export const ATTENTION_FILTERS: Array<{ id: AttentionGroup | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'constraints', label: 'Constraints' },
  { id: 'data-quality', label: 'Data quality' },
  { id: 'readiness', label: 'Readiness' },
  { id: 'assumptions', label: 'Assumptions' },
];

export function attentionGroup(item: AttentionItem): AttentionGroup {
  switch (item.category) {
    case 'Design constraint':
    case 'Modelled risk':
      return 'constraints';
    case 'Data quality issue':
      return 'data-quality';
    case 'Evidence unavailable':
    case 'Integration blocked':
      return 'readiness';
    case 'Assumption requires review':
    default:
      return 'assumptions';
  }
}

export interface AttentionInputs {
  facility: FacilityDefinition;
  interpretations: KpiInterpretation[];
  pendingDecisions: number;
  runCount: number;
  latestRunId: string | null;
  isFallback: boolean;
  modelNotes: string[];
  blueprintHref: string;
  /** ISO time at which the current model derivation was produced. */
  derivedAt?: string;
  /** ISO completion time of the most recent recorded run, when one exists. */
  latestRunAt?: string | null;
}

/** Human summary for a raw engineering model note. Full text stays in the assumptions drawer. */
export function summariseModelNote(note: string): { title: string; impact: string; category: AttentionCategory } {
  if (/plausibility limit/i.test(note)) {
    return {
      title: 'Modelled facility data contains a capacity-unit inconsistency',
      impact: 'Stored design capacity was normalised before calculation, so derived values depend on that assumption.',
      category: 'Data quality issue',
    };
  }
  if (/racks are rendered/i.test(note)) {
    return {
      title: 'Facility visualisation represents a subset of modelled racks',
      impact: 'Remaining racks are represented by the aggregate load model rather than individually.',
      category: 'Assumption requires review',
    };
  }
  return {
    title: 'Model assumption requires review',
    impact: 'A normalisation assumption was applied while building the facility model.',
    category: 'Assumption requires review',
  };
}

export function buildAttentionQueue(input: AttentionInputs): AttentionItem[] {
  const {
    facility, interpretations, pendingDecisions, runCount, latestRunId, isFallback,
    modelNotes, blueprintHref,
  } = input;
  const derivedAt = input.derivedAt ?? new Date().toISOString();
  const latestRunAt = input.latestRunAt ?? null;
  const items: AttentionItem[] = [];

  for (const kpi of interpretations) {
    if (kpi.state !== 'constraint' && kpi.state !== 'watch') continue;
    items.push({
      id: `kpi-${kpi.key}`,
      severity: kpi.state === 'constraint' ? 'constraint' : 'review',
      category: kpi.state === 'constraint' ? 'Design constraint' : 'Modelled risk',
      subsystem: kpi.label,
      title: `${kpi.label} is ${kpi.value} against the modelled design baseline`,
      impact:
        kpi.key === 'capacityHeadroom'
          ? 'Reduced flexibility for future rack deployment in the current design.'
          : kpi.key === 'pue'
            ? 'Modelled facility efficiency is outside the stored design target.'
            : kpi.key === 'thermalStability'
              ? 'Modelled hotspot pressure reduces tolerance to workload increases.'
              : `${kpi.comparison || 'Derived from the current design baseline.'}`,
      evidence: 'Calculated from the current design baseline.',
      observedAt: derivedAt,
      observedBasis: 'derivation',
      actions: [
        { label: 'Inspect in Blueprint', to: `${blueprintHref}?tab=model&layer=${encodeURIComponent(kpi.key)}` },
        { label: 'Open calculation', to: `/dsx/evidence-beta/evidence?kpi=${encodeURIComponent(kpi.key)}` },
      ],
    });
  }

  for (const [index, note] of modelNotes.entries()) {
    const summary = summariseModelNote(note);
    items.push({
      id: `note-${index}`,
      severity: summary.category === 'Data quality issue' ? 'review' : 'informational',
      category: summary.category,
      subsystem: 'Facility model',
      title: summary.title,
      impact: summary.impact,
      evidence: 'Recorded while building the model. Review model assumptions.',
      observedAt: derivedAt,
      observedBasis: 'derivation',
      actions: [{ label: 'Review model assumptions', to: `${blueprintHref}?tab=model` }],
    });
  }

  if (pendingDecisions > 0) {
    items.push({
      id: 'pending-decisions',
      severity: 'review',
      category: 'Modelled risk',
      subsystem: 'Simulation',
      title: `${pendingDecisions} recommendation${pendingDecisions === 1 ? '' : 's'} awaiting review`,
      impact: 'Recorded simulation recommendations have no accept or reject decision yet.',
      evidence: latestRunId ? `Recorded against run ${latestRunId}.` : 'Recorded in the simulation workspace.',
      observedAt: latestRunAt ?? derivedAt,
      observedBasis: latestRunAt ? 'run' : 'derivation',
      actions: [
        {
          label: 'Review recommendations',
          to: latestRunId ? `/simulation?run=${encodeURIComponent(latestRunId)}&review=pending` : '/simulation?review=pending',
        },
      ],
    });
  }

  if (isFallback) {
    items.push({
      id: 'fallback-model',
      severity: 'review',
      category: 'Assumption requires review',
      subsystem: 'Facility model',
      title: 'Reference facility model is in use',
      impact: 'No saved blueprint was loaded for this account, so all values describe the reference design.',
      evidence: 'Model source: built-in reference facility definition.',
      observedAt: derivedAt,
      observedBasis: 'derivation',
      actions: [{ label: 'Open Blueprint', to: blueprintHref }],
    });
  }

  if (runCount === 0) {
    items.push({
      id: 'no-runs',
      severity: 'informational',
      category: 'Evidence unavailable',
      subsystem: 'Simulation',
      title: 'No simulation run has been recorded for this facility',
      impact: 'Indicators reflect the design baseline only, with no scenario outcome to compare against.',
      evidence: 'No run record exists.',
      observedAt: derivedAt,
      observedBasis: 'derivation',
      actions: [{ label: 'Start simulation', to: `/simulation?twin=${encodeURIComponent(facility.id || 'default')}` }],
    });
  }

  items.push({
    id: 'telemetry',
    severity: 'informational',
    category: 'Integration blocked',
    subsystem: 'Connections',
    title: 'Live facility telemetry is not connected',
    impact: 'Every indicator is a modelled output and cannot be validated against the physical facility.',
    evidence: 'Capability registry reports the simulated operating mode.',
    observedAt: derivedAt,
    observedBasis: 'registry',
    actions: [{ label: 'Open Connections', to: '/manage/integrations' }],
  });

  return items.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
}