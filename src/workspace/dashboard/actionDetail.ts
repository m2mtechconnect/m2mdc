/**
 * Detail record behind an Action Center row.
 *
 * The record is assembled from the same derived state the row itself is built
 * from. Nothing is fetched from a live system, so the drawer never claims an
 * observation it does not have: every field is either present in the derived
 * model or reported as unavailable.
 */
import { attentionGroup, SEVERITY_META, type AttentionItem } from './attentionQueue';

export interface ActionDetail {
  id: string;
  title: string;
  severityLabel: string;
  severity: AttentionItem['severity'];
  category: AttentionItem['category'];
  domainLabel: string;
  subsystem: string;
  impact: string;
  evidence: string;
  observedAt: string;
  observedLabel: string;
  basisNote: string;
  primaryAction: { label: string; to: string } | null;
  secondaryActions: Array<{ label: string; to: string }>;
}

const DOMAIN_LABEL: Record<ReturnType<typeof attentionGroup>, string> = {
  constraints: 'Design constraints',
  'data-quality': 'Data quality',
  readiness: 'Integration readiness',
  assumptions: 'Model assumptions',
};

const BASIS_NOTE: Record<AttentionItem['observedBasis'], string> = {
  derivation: 'Timestamp of the model derivation that produced this item. It is not a measurement time.',
  run: 'Completion time of the recorded simulation run this item references.',
  registry: 'Time at which the capability registry state was read in this session.',
};

const BASIS_LABEL: Record<AttentionItem['observedBasis'], string> = {
  derivation: 'Derived at',
  run: 'Run completed',
  registry: 'Registry read at',
};

export function buildActionDetail(item: AttentionItem): ActionDetail {
  const [primary, ...rest] = item.actions;
  return {
    id: item.id,
    title: item.title,
    severity: item.severity,
    severityLabel: SEVERITY_META[item.severity].label,
    category: item.category,
    domainLabel: DOMAIN_LABEL[attentionGroup(item)],
    subsystem: item.subsystem,
    impact: item.impact,
    evidence: item.evidence,
    observedAt: item.observedAt,
    observedLabel: BASIS_LABEL[item.observedBasis],
    basisNote: BASIS_NOTE[item.observedBasis],
    primaryAction: primary ?? null,
    secondaryActions: rest,
  };
}

/**
 * Asynchronous accessor used by the drawer so the surface has a real pending
 * state rather than a cosmetic one. The work is local: the promise resolves as
 * soon as the derived record is assembled.
 */
export function loadActionDetail(item: AttentionItem): Promise<ActionDetail> {
  return Promise.resolve().then(() => buildActionDetail(item));
}

export function formatObservedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString();
}
