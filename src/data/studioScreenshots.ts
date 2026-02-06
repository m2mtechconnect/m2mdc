/**
 * Studio Screenshots Manifest
 * Maps landing page assets to screenshot file paths
 * Real product UI captures for marketing
 */

export interface ScreenshotVariants {
  desktop: string;
  tablet?: string;
  mobile?: string;
  alt: string;
  title: string;
}

export interface StudioScreenshotsManifest {
  version: string;
  generatedAt: string;
  screenshots: Record<string, ScreenshotVariants>;
}

// Real Studio UI screenshots
export const studioScreenshots: Record<string, ScreenshotVariants> = {
  dashboard: {
    desktop: '/landing/screenshots/dashboard-desktop.png',
    alt: 'Data Centre Command dashboard with live KPIs: PUE 1.38, GPU Saturation 23%, Thermal Stability 94%, Sovereign Compute 98%',
    title: 'Data Centre Command',
  },
  blueprint: {
    desktop: '/landing/screenshots/blueprint-desktop.png',
    alt: 'Blueprint Designer showing 9 agents, 23 data sources, 58 KPIs, 25 workflows with Agent Health panel',
    title: 'Blueprint Designer',
  },
  simulation: {
    desktop: '/landing/screenshots/simulation-desktop.png',
    alt: '3D Digital Twin with thermal rack visualization, simulation controls, and scenario selection panel',
    title: '3D Digital Twin & Simulation',
  },
  telemetry: {
    desktop: '/landing/screenshots/telemetry-desktop.png',
    alt: 'Thermal telemetry showing rack temperatures 19-28°C, GPU temps 67°C, and inlet temp 21.9°C',
    title: 'Thermal Telemetry',
  },
  cooling: {
    desktop: '/landing/screenshots/cooling-desktop.png',
    alt: 'Cooling zones dashboard with 8 zones, ambient temps, airflow CFM, and humidity monitoring',
    title: 'Cooling Management',
  },
  sovereignty: {
    desktop: '/landing/screenshots/sovereignty-desktop.png',
    alt: 'Sovereignty dashboard showing 100% score, data residency compliance, 5 certified frameworks, 95% audit readiness',
    title: 'Sovereignty & Compliance',
  },
  carbon: {
    desktop: '/landing/screenshots/carbon-desktop.png',
    alt: 'Carbon tracking with 100% efficiency score, 99% renewable mix, regional grid comparison CA-QC vs CA-AB',
    title: 'Carbon & Sustainability',
  },
};

// Manifest metadata
export const screenshotManifest: StudioScreenshotsManifest = {
  version: '5.0.0',
  generatedAt: new Date().toISOString(),
  screenshots: studioScreenshots,
};

// Helper to get screenshot with fallback
export const getScreenshot = (
  key: keyof typeof studioScreenshots,
  variant: 'desktop' | 'tablet' | 'mobile' = 'desktop'
): string => {
  const screenshot = studioScreenshots[key];
  if (!screenshot) {
    console.warn(`Screenshot not found for key: ${key}`);
    return '/placeholder.svg';
  }
  return screenshot[variant] || screenshot.desktop;
};

// Check if screenshot exists (for fallback logic)
export const screenshotExists = async (path: string): Promise<boolean> => {
  try {
    const response = await fetch(path, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};
