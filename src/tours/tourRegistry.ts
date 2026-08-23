import type { Step } from 'react-joyride';

export type TourId =
  | 'studioIntro'
  | 'overview'
  | 'simulation'
  | 'blueprint'
  | 'role_executive'
  | 'role_manager'
  | 'role_engineer'
  | 'role_security_admin';

export interface TourDefinition {
  id: TourId;
  name: string;
  description: string;
  steps: Step[];
}

/**
 * Tour targets intentionally use canonical shell/workspace selectors only.
 * No tour points at retired Builder, Data Centre Twin or duplicate admin IA.
 * Copy also follows AURA truth rules: simulated/modelled data is never called
 * live unless a validated production source is actually connected.
 */
const studioIntroSteps: Step[] = [
  {
    target: '[data-testid="global-header"]',
    title: 'AURA workspace navigation',
    content: 'Use the four persistent workspaces for facility decisions: Command Center, Blueprint, Simulation and Evidence.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-nav-item="Command Center"]',
    title: 'Command Center',
    content: 'Start here for facility status, priority actions, recent simulation results and model availability.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-nav-item="Blueprint"]',
    title: 'Blueprint',
    content: 'The Blueprint owns the canonical facility model, assets, automation definitions, validation and versions.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-nav-item="Simulation"]',
    title: 'Simulation',
    content: 'Review scenario inputs, run the deterministic model, compare outcomes and review recommendations.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-nav-item="Evidence"]',
    title: 'Evidence',
    content: 'Use Evidence to inspect provenance, domain results, sustainability evidence and decision records.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-testid="assistant-entry"]',
    title: 'AURA Assistant',
    content: 'The Assistant is a single global utility and stays available as you move between workspaces.',
    placement: 'bottom',
    disableBeacon: true,
  },
];

const overviewSteps: Step[] = [
  {
    target: '[data-testid="command-centre"]',
    title: 'Command Center',
    content: 'Use this decision surface for the current modelled facility state, attention items and recent simulation outcomes.',
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '[data-nav-item="Blueprint"]',
    title: 'Inspect the source model',
    content: 'Move to Blueprint when you need to inspect or change the canonical facility configuration.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-nav-item="Evidence"]',
    title: 'Verify a claim',
    content: 'Move to Evidence when you need the provenance and records behind a metric, constraint or decision.',
    placement: 'bottom',
    disableBeacon: true,
  },
];

const simulationSteps: Step[] = [
  {
    target: '[data-testid="aura-workspace"]',
    title: 'Simulation workspace',
    content: 'The facility model remains in context while the tool rail changes what you inspect or do.',
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '[data-testid="workspace-tool-configure"]',
    title: 'Scenario Inputs',
    content: 'Set modelled overrides for the scenario. These inputs do not rewrite the canonical Blueprint.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-testid="workspace-tool-simulate"]',
    title: 'Run the model',
    content: 'Execution requires reviewed assumptions. A failed run creates no successful simulation record.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-testid="workspace-tool-compare"]',
    title: 'Compare outcomes',
    content: 'After runs exist, compare modelled outcomes and KPI deltas without treating them as measured telemetry.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-testid="workspace-tool-decide"]',
    title: 'Review recommendations',
    content: 'Accept, reject or defer recommendations from a completed run and retain the decision record.',
    placement: 'right',
    disableBeacon: true,
  },
];

const blueprintSteps: Step[] = [
  {
    target: '[data-blueprint-tab="model"]',
    title: 'Model',
    content: 'Inspect the canonical facility model and its physical configuration.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-blueprint-tab="assets"]',
    title: 'Assets & Systems',
    content: 'Review the assets and systems that make up the facility model and their linked configuration.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-blueprint-tab="controls"]',
    title: 'Automation controls',
    content: 'Agents, KPIs and workflows are nested here as automation definitions rather than separate top-level workspaces.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-blueprint-tab="validation"]',
    title: 'Model validation',
    content: 'Review validation state and unresolved model constraints before relying on downstream results.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-blueprint-tab="versions"]',
    title: 'Versions',
    content: 'Use the version history to understand how the model changed over time.',
    placement: 'bottom',
    disableBeacon: true,
  },
];

const roleSharedSteps: Step[] = [
  {
    target: '[data-testid="command-centre"]',
    title: 'Role-aware decision surface',
    content: 'Start with the same facility truth. Role context changes emphasis and permitted actions, not the underlying evidence.',
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '[data-testid="assistant-entry"]',
    title: 'AURA Assistant',
    content: 'Ask questions in context. Grounded answers must respect available evidence, permissions and provenance.',
    placement: 'bottom',
    disableBeacon: true,
  },
];

const roleExecutiveSteps: Step[] = [
  ...roleSharedSteps,
  {
    target: '[data-nav-item="Evidence"]',
    title: 'Evidence before commitment',
    content: 'Use Evidence to verify model assumptions, sustainability results and decision records before committing resources.',
    placement: 'bottom',
    disableBeacon: true,
  },
];

const roleManagerSteps: Step[] = [
  ...roleSharedSteps,
  {
    target: '[data-testid="manage-trigger"]',
    title: 'Manage operations',
    content: 'Facilities, Connections, Agents, Operations and Runtime are grouped under Manage for day-to-day platform work.',
    placement: 'bottom',
    disableBeacon: true,
  },
];

const roleEngineerSteps: Step[] = [
  ...roleSharedSteps,
  {
    target: '[data-nav-item="Blueprint"]',
    title: 'Engineering model',
    content: 'Use Blueprint for facility configuration and Simulation for scenario-specific inputs and outcomes.',
    placement: 'bottom',
    disableBeacon: true,
  },
];

const roleSecurityAdminSteps: Step[] = [
  ...roleSharedSteps,
  {
    target: '[data-testid="govern-trigger"]',
    title: 'Govern',
    content: 'People & Access, Agent Policies and Platform Administration are separated from operational management.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-nav-item="Evidence"]',
    title: 'Governance evidence',
    content: 'Use sovereignty and decision evidence to distinguish assessed facts from modelled, demo or not-assessed states.',
    placement: 'bottom',
    disableBeacon: true,
  },
];

export const tourRegistry: Record<TourId, TourDefinition> = {
  studioIntro: {
    id: 'studioIntro',
    name: 'AURA orientation',
    description: 'Learn the four core workspaces and global utilities.',
    steps: studioIntroSteps,
  },
  overview: {
    id: 'overview',
    name: 'Command Center tour',
    description: 'Learn how to move from attention items to model and evidence.',
    steps: overviewSteps,
  },
  simulation: {
    id: 'simulation',
    name: 'Simulation tour',
    description: 'Review inputs, execute the model, compare results and review recommendations.',
    steps: simulationSteps,
  },
  blueprint: {
    id: 'blueprint',
    name: 'Blueprint tour',
    description: 'Navigate the facility model, assets, automation, validation and versions.',
    steps: blueprintSteps,
  },
  role_executive: {
    id: 'role_executive',
    name: 'Executive workflow tour',
    description: 'Move from decision context to supporting evidence.',
    steps: roleExecutiveSteps,
  },
  role_manager: {
    id: 'role_manager',
    name: 'Manager workflow tour',
    description: 'Navigate the operational management surfaces.',
    steps: roleManagerSteps,
  },
  role_engineer: {
    id: 'role_engineer',
    name: 'Engineer workflow tour',
    description: 'Work between the canonical model and simulation workspace.',
    steps: roleEngineerSteps,
  },
  role_security_admin: {
    id: 'role_security_admin',
    name: 'Security admin workflow tour',
    description: 'Navigate governance, access administration and evidence.',
    steps: roleSecurityAdminSteps,
  },
};

export const tourIds: TourId[] = [
  'studioIntro',
  'overview',
  'simulation',
  'blueprint',
  'role_executive',
  'role_manager',
  'role_engineer',
  'role_security_admin',
];

export const tourRoutes: Record<TourId, string> = {
  studioIntro: '/dashboard',
  overview: '/dashboard',
  simulation: '/simulation',
  blueprint: '/blueprint/default',
  role_executive: '/dashboard',
  role_manager: '/dashboard',
  role_engineer: '/dashboard',
  role_security_admin: '/dashboard',
};
