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
    desktop: '/landing/screenshots/dashboard-desktop.webp',
    alt: 'AURA Data Centre Command dashboard with modelled KPI cockpit, rack status overview and simulated event timeline',
    title: 'Data Centre Command',
  },
  power: {
    desktop: '/landing/screenshots/power-desktop.webp',
    alt: 'AURA power view showing the distribution chain from grid to racks with UPS bank status and redundancy level',
    title: 'Power Chain & Resilience',
  },
  simulation: {
    desktop: '/landing/screenshots/simulation-desktop.webp',
    alt: 'AURA scenario simulation running a GPU spike with 3D hall, simulation controls and scenario clock',
    title: '3D Digital Twin & Simulation',
  },
  telemetry: {
    desktop: '/landing/screenshots/telemetry-desktop.webp',
    alt: 'AURA thermal telemetry with rack thermal map, average inlet temperature and GPU temperatures',
    title: 'Thermal Telemetry',
  },
  cooling: {
    desktop: '/landing/screenshots/cooling-desktop.webp',
    alt: 'AURA cooling zones view with ambient temperature, target setpoint, humidity and airflow per zone',
    title: 'Cooling Management',
  },
  sovereignty: {
    desktop: '/landing/screenshots/sovereignty-desktop.webp',
    alt: 'AURA sovereignty view with data residency status, classification distribution and compliance frameworks',
    title: 'Sovereignty & Compliance',
  },
  carbon: {
    desktop: '/landing/screenshots/carbon-desktop.webp',
    alt: 'AURA carbon view with efficiency score, renewable mix, carbon budget status and regional grid comparison',
    title: 'Carbon & Sustainability',
  },
};

// Manifest metadata
export const screenshotManifest: StudioScreenshotsManifest = {
  version: '6.0.0',
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
