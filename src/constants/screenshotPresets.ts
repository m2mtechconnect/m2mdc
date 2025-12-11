/**
 * Screenshot Presets Configuration
 * Defines all Studio UI scenes to be captured for marketing materials
 */

export interface ScreenshotPreset {
  id: string;
  name: string;
  description: string;
  route: string;
  selector?: string;
  viewport: {
    width: number;
    height: number;
  };
  waitFor?: number;
  darkMode?: boolean;
}

export const VIEWPORT_PRESETS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 1024, height: 768 },
  mobile: { width: 390, height: 844 },
} as const;

export const screenshotPresets: ScreenshotPreset[] = [
  {
    id: 'dashboard',
    name: 'Dashboard Overview',
    description: 'Live Digital Twin preview with KPI metrics',
    route: '/dashboard',
    selector: '#dashboard-main',
    viewport: VIEWPORT_PRESETS.desktop,
    darkMode: true,
  },
  {
    id: 'blueprint',
    name: 'Blueprint Designer',
    description: 'Twin configuration with tier, GPU, and region settings',
    route: '/blueprint',
    selector: '#blueprint-overview',
    viewport: VIEWPORT_PRESETS.desktop,
    darkMode: true,
  },
  {
    id: 'builder-step1',
    name: 'Builder Step 1',
    description: 'Business profile configuration',
    route: '/builder?step=1',
    selector: '#builder-step-content',
    viewport: VIEWPORT_PRESETS.desktop,
    darkMode: false,
  },
  {
    id: 'builder-step5',
    name: 'Builder Step 5',
    description: 'Deployment and financial configuration',
    route: '/builder?step=5',
    selector: '#builder-step-content',
    viewport: VIEWPORT_PRESETS.desktop,
    darkMode: false,
  },
  {
    id: 'simulation',
    name: 'Simulation Panel',
    description: 'Timeline with KPI overlays and scenario controls',
    route: '/data-centre-twin?view=simulation',
    selector: '#simulation-root',
    viewport: VIEWPORT_PRESETS.desktop,
    darkMode: true,
  },
  {
    id: 'twin-3d',
    name: '3D Data Centre',
    description: 'Interactive 3D rack visualization with thermal overlays',
    route: '/data-centre-twin',
    selector: '#twin-3d-scene',
    viewport: VIEWPORT_PRESETS.desktop,
    darkMode: true,
  },
  {
    id: 'sovereignty',
    name: 'Sovereignty & Safety',
    description: 'Compliance audits and safety monitoring dashboard',
    route: '/sovereignty-audit',
    selector: '#sovereignty-grid',
    viewport: VIEWPORT_PRESETS.desktop,
    darkMode: true,
  },
  {
    id: 'agents',
    name: 'Subsystem Agents',
    description: 'AI agents grid for thermal, power, cooling optimization',
    route: '/manage-agents',
    selector: '#agents-list',
    viewport: VIEWPORT_PRESETS.desktop,
    darkMode: false,
  },
  {
    id: 'telemetry',
    name: 'Telemetry & Analytics',
    description: 'Real-time KPI monitoring and trend analysis',
    route: '/telemetry-analytics',
    selector: '#telemetry-panel',
    viewport: VIEWPORT_PRESETS.desktop,
    darkMode: true,
  },
  {
    id: 'scanner',
    name: 'URL Scanner',
    description: 'Website analysis and recommendation engine',
    route: '/dashboard',
    selector: '#scanner-modal',
    viewport: VIEWPORT_PRESETS.desktop,
    darkMode: false,
  },
  {
    id: 'recommendation',
    name: 'Recommendation Panel',
    description: 'AI-generated Green DC Twin recommendations',
    route: '/recommendation',
    selector: '#recommendation-panel',
    viewport: VIEWPORT_PRESETS.desktop,
    darkMode: false,
  },
];

export const getPresetById = (id: string): ScreenshotPreset | undefined => {
  return screenshotPresets.find(preset => preset.id === id);
};

export const getPresetsByCategory = (darkMode: boolean): ScreenshotPreset[] => {
  return screenshotPresets.filter(preset => preset.darkMode === darkMode);
};
