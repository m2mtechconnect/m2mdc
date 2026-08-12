/**
 * Evidence workspace information architecture.
 *
 * Five primary sections. Everything else is a sub-section of one of them or
 * an on-demand surface (Asset Explorer, inspector). Legacy paths are kept as
 * redirects so existing deep links keep working with their query state.
 */
import { DSX_ROOT } from '../workspaces/relatedViews';

export { DSX_ROOT };

export interface EvidenceSubSection {
  path: string;
  label: string;
  /** Constraint domain used for the status dot, when one exists. */
  domain?: string;
}

export interface EvidenceSection {
  id: string;
  path: string;
  label: string;
  /** Matches the section when the pathname starts with this prefix. */
  match: string;
  children: EvidenceSubSection[];
}

export const EVIDENCE_SECTIONS: EvidenceSection[] = [
  {
    id: 'overview',
    path: `${DSX_ROOT}/overview`,
    match: `${DSX_ROOT}/overview`,
    label: 'Overview',
    children: [],
  },
  {
    id: 'operations',
    path: `${DSX_ROOT}/operations/thermal`,
    match: `${DSX_ROOT}/operations`,
    label: 'Operations',
    children: [
      { path: `${DSX_ROOT}/operations/thermal`, label: 'Thermal', domain: 'thermal' },
      { path: `${DSX_ROOT}/operations/power`, label: 'Power', domain: 'power' },
      { path: `${DSX_ROOT}/operations/cooling`, label: 'Cooling', domain: 'cooling' },
      { path: `${DSX_ROOT}/operations/compute`, label: 'Compute', domain: 'network' },
      { path: `${DSX_ROOT}/operations/workload`, label: 'Workload', domain: 'workload' },
    ],
  },
  {
    id: 'sustainability',
    path: `${DSX_ROOT}/sustainability`,
    match: `${DSX_ROOT}/sustainability`,
    label: 'Sustainability',
    children: [
      { path: `${DSX_ROOT}/sustainability`, label: 'Energy and carbon', domain: 'carbon' },
      { path: `${DSX_ROOT}/sustainability/financial`, label: 'Financial exposure', domain: 'financial' },
      { path: `${DSX_ROOT}/sustainability/sovereignty`, label: 'Sovereignty' },
    ],
  },
  {
    id: 'decisions',
    path: `${DSX_ROOT}/decisions`,
    match: `${DSX_ROOT}/decisions`,
    label: 'Decisions',
    children: [
      { path: `${DSX_ROOT}/decisions`, label: 'Results' },
      { path: `${DSX_ROOT}/decisions/log`, label: 'Decision log' },
    ],
  },
  {
    id: 'assets',
    path: `${DSX_ROOT}/assets`,
    match: `${DSX_ROOT}/assets`,
    label: 'Assets',
    children: [],
  },
];

/** Legacy workspace path -> canonical destination (relative to the shell). */
export const EVIDENCE_LEGACY_REDIRECTS: { from: string; to: string }[] = [
  { from: 'thermal', to: `${DSX_ROOT}/operations/thermal` },
  { from: 'power', to: `${DSX_ROOT}/operations/power` },
  { from: 'cooling', to: `${DSX_ROOT}/operations/cooling` },
  { from: 'network', to: `${DSX_ROOT}/operations/compute` },
  { from: 'compute', to: `${DSX_ROOT}/operations/compute` },
  { from: 'workload', to: `${DSX_ROOT}/operations/workload` },
  { from: 'facility', to: `${DSX_ROOT}/assets` },
  { from: 'carbon', to: `${DSX_ROOT}/sustainability` },
  { from: 'financials', to: `${DSX_ROOT}/sustainability/financial` },
  { from: 'sovereignty', to: `${DSX_ROOT}/sustainability/sovereignty` },
  { from: 'simulations', to: `${DSX_ROOT}/decisions` },
  { from: 'evidence', to: `${DSX_ROOT}/decisions/log` },
];

/** Page title for a pathname inside the Evidence shell. */
export function evidenceTitle(pathname: string): string {
  const clean = pathname.replace(/\/$/, '');
  for (const section of EVIDENCE_SECTIONS) {
    const child = section.children.find((c) => c.path === clean);
    if (child) return section.id === 'sustainability' || section.id === 'decisions'
      ? `${section.label}: ${child.label}`
      : child.label;
    if (clean === section.path || clean.startsWith(`${section.match}/`) || clean === section.match) {
      return section.label;
    }
  }
  return 'Overview';
}

/** The section that owns a pathname. */
export function evidenceSectionFor(pathname: string): EvidenceSection {
  const clean = pathname.replace(/\/$/, '');
  return (
    EVIDENCE_SECTIONS.find((s) => clean === s.match || clean.startsWith(`${s.match}/`)) ??
    EVIDENCE_SECTIONS[0]
  );
}