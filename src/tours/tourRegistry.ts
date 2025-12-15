import { Step } from 'react-joyride';

export type TourId = 'studioIntro' | 'overview' | 'simulation' | 'blueprint';

export interface TourDefinition {
  id: TourId;
  name: string;
  description: string;
  steps: Step[];
}

// Studio Intro Tour - Global first login experience
// Uses multiple selectors for responsive fallbacks
const studioIntroSteps: Step[] = [
  {
    target: '[data-tour="dc-selector"]',
    title: 'Active Data Centre',
    content: 'This selector is your source of truth. Everything you see—Overview, Simulation, Blueprint—reflects the data centre chosen here.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-dashboard"]',
    title: 'Command Centre',
    content: 'Your main dashboard showing real-time KPIs, alerts, and operational status for the active data centre.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-builder"]',
    title: 'Blueprint Designer',
    content: 'Define your twin\'s configuration—agents, KPIs, workflows, and deployment settings.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-agents"]',
    title: 'Subsystem Agents',
    content: 'Monitor and configure your AI agents that manage thermal, power, cooling, and other data centre subsystems.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="help-menu"]',
    title: 'Need Help?',
    content: 'Access guided tours anytime from the Help menu. You can restart any tour whenever you need a refresher.',
    placement: 'bottom',
    disableBeacon: true,
  },
];

// Overview Tour - Overview/Dashboard tab
const overviewSteps: Step[] = [
  {
    target: '[data-tour="overview-kpi-cockpit"]',
    title: 'KPI Cockpit',
    content: 'Monitor critical metrics like PUE, GPU utilization, thermal stability, and carbon intensity at a glance.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="overview-3d-preview"]',
    title: '3D Digital Twin',
    content: 'Visualize your data centre in 3D. Toggle overlays to see thermal zones, power distribution, and rack status.',
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '[data-tour="overview-alerts"]',
    title: 'Active Alerts',
    content: 'Real-time alerts from your subsystem agents. Click any alert to see details and recommended actions.',
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '[data-tour="overview-tools"]',
    title: 'Quick Actions',
    content: 'Launch simulations, view reports, or access agent controls directly from here.',
    placement: 'left',
    disableBeacon: true,
  },
];

// Simulation Tour - Simulation tab
const simulationSteps: Step[] = [
  {
    target: '[data-tour="simulation-scenario-list"]',
    title: 'Scenario Library',
    content: 'Choose from pre-built scenarios like GPU spike, cooling failure, or power surge to test your twin\'s response.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="simulation-run-controls"]',
    title: 'Simulation Controls',
    content: 'Start, pause, or reset simulations. Adjust playback speed to analyze events in detail or fast-forward.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="simulation-kpi-grid"]',
    title: 'KPI Impact Grid',
    content: 'Track how each scenario affects your KPIs. Green indicates improvement, red shows degradation.',
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '[data-tour="simulation-3d-view"]',
    title: '3D Digital Twin View',
    content: 'Visualize racks, thermal zones, and power flow changes while scenarios run—without switching tools.',
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '[data-tour="simulation-timeline"]',
    title: 'Event Timeline',
    content: 'Scrub through simulation events. Click any event to jump to that moment and see the impact.',
    placement: 'top',
    disableBeacon: true,
  },
  // Note: simulation-compare step removed as EnhancedComparisonMode is not yet integrated
  // into the primary DCSimulationTab. Re-add when comparison feature is wired up.
];

// Blueprint Tour - Blueprint/Builder tab
const blueprintSteps: Step[] = [
  {
    target: '[data-tour="blueprint-overview"]',
    title: 'Blueprint Overview',
    content: 'Your twin\'s complete configuration—agents, KPIs, workflows, and deployment settings in one place.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="blueprint-tier"]',
    title: 'Infrastructure Tier',
    content: 'Define your data centre tier, capacity, and sovereignty requirements.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="blueprint-gpu"]',
    title: 'GPU Configuration',
    content: 'Configure GPU clusters, workload distribution, and compute optimization settings.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="blueprint-energy"]',
    title: 'Energy & Sustainability',
    content: 'Set renewable energy targets, carbon intensity limits, and PUE optimization goals.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="blueprint-deploy"]',
    title: 'Deploy Configuration',
    content: 'When ready, deploy your twin to start collecting real telemetry and running live agents.',
    placement: 'top',
    disableBeacon: true,
  },
];

export const tourRegistry: Record<TourId, TourDefinition> = {
  studioIntro: {
    id: 'studioIntro',
    name: 'Studio Intro Tour',
    description: 'Get oriented with the main navigation and controls',
    steps: studioIntroSteps,
  },
  overview: {
    id: 'overview',
    name: 'Overview Tour',
    description: 'Learn about the dashboard and KPI monitoring',
    steps: overviewSteps,
  },
  simulation: {
    id: 'simulation',
    name: 'Simulation Tour',
    description: 'Master the simulation engine and scenario testing',
    steps: simulationSteps,
  },
  blueprint: {
    id: 'blueprint',
    name: 'Blueprint Tour',
    description: 'Configure your digital twin\'s blueprint',
    steps: blueprintSteps,
  },
};

export const tourIds: TourId[] = ['studioIntro', 'overview', 'simulation', 'blueprint'];

// Centralized tour routes - maps each tour to its target page
export const tourRoutes: Record<TourId, string> = {
  studioIntro: '/',
  overview: '/',
  simulation: '/data-centre-twin?view=simulation',
  blueprint: '/builder',
};
