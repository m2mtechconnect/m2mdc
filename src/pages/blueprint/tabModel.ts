/**
 * Stage 7I — Blueprint tab architecture.
 *
 * Blueprint exposes exactly FIVE top-level tabs. Agents, KPIs and Workflows
 * are nested views inside Controls, never top-level Blueprint tabs.
 *
 * This module is pure so the architecture contract can be unit-tested without
 * rendering the page.
 */

export const BLUEPRINT_TABS = [
  'model',
  'assets',
  'controls',
  'validation',
  'versions',
] as const;
export type BlueprintTab = (typeof BLUEPRINT_TABS)[number];

export const CONTROLS_SUBTABS = ['agents', 'kpis', 'workflows'] as const;
export type ControlsSubtab = (typeof CONTROLS_SUBTABS)[number];

export const DEFAULT_TAB: BlueprintTab = 'model';
export const DEFAULT_CONTROLS_SUBTAB: ControlsSubtab = 'agents';

/**
 * Legacy deep links (the pre-7I eight-tab layout, plus the removed
 * simulation-owned `scenarios` tab) resolve to their canonical nested view.
 */
const LEGACY_TABS: Record<string, { tab: BlueprintTab; sub?: ControlsSubtab }> = {
  overview: { tab: 'assets' },
  data: { tab: 'assets' },
  roles: { tab: 'assets' },
  agents: { tab: 'controls', sub: 'agents' },
  kpis: { tab: 'controls', sub: 'kpis' },
  workflows: { tab: 'controls', sub: 'workflows' },
  changelog: { tab: 'versions' },
  // Scenario configuration and run execution belong to the Simulation
  // workspace; the legacy Blueprint link lands on the model.
  scenarios: { tab: 'model' },
};

export function isBlueprintTab(value: string | null | undefined): value is BlueprintTab {
  return !!value && (BLUEPRINT_TABS as readonly string[]).includes(value);
}

export function isControlsSubtab(value: string | null | undefined): value is ControlsSubtab {
  return !!value && (CONTROLS_SUBTABS as readonly string[]).includes(value);
}

export interface BlueprintTabState {
  tab: BlueprintTab;
  /** Only meaningful when `tab === 'controls'`. */
  sub: ControlsSubtab;
  /**
   * True when the URL params are not already canonical. The page rewrites the
   * URL with `replace` in that case so normalization never creates history.
   */
  normalized: boolean;
}

export function resolveBlueprintTabState(
  tabParam: string | null,
  subParam: string | null,
): BlueprintTabState {
  const legacy = tabParam ? LEGACY_TABS[tabParam] : undefined;

  let tab: BlueprintTab;
  let sub: ControlsSubtab;
  let normalized = false;

  if (isBlueprintTab(tabParam)) {
    tab = tabParam;
  } else if (legacy) {
    tab = legacy.tab;
    normalized = true;
  } else {
    tab = DEFAULT_TAB;
    // A missing param is a legitimate canonical entry state; only an invalid
    // param needs rewriting.
    normalized = tabParam !== null;
  }

  if (legacy?.sub) {
    sub = legacy.sub;
  } else if (isControlsSubtab(subParam)) {
    sub = subParam;
  } else {
    sub = DEFAULT_CONTROLS_SUBTAB;
    if (tab === 'controls' && subParam !== null) normalized = true;
  }

  // Controls must always carry an explicit subtab so Back/Forward can restore it.
  if (tab === 'controls' && subParam === null) normalized = true;
  // A stale `sub` outside Controls is dropped.
  if (tab !== 'controls' && subParam !== null) normalized = true;

  return { tab, sub, normalized };
}

/** Canonical query params for a resolved state. */
export function canonicalTabParams(state: BlueprintTabState): { tab: string; sub?: string } {
  return state.tab === 'controls' ? { tab: state.tab, sub: state.sub } : { tab: state.tab };
}
