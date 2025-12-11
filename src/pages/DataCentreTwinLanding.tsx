/**
 * DataCentreTwinLanding - Marketing landing page for Sovereign Green AI Data Centre Twin
 * Public, read-only page showcasing the platform capabilities
 * Uses M2M brand design tokens from index.css
 */

import { 
  TwinHero,
  TwinCapabilityBadges,
  TwinFeatureSection,
  TwinStatsBand,
  TwinIntegrationsGrid,
  TwinUseCases,
  TwinDifferentiators,
  TwinTrustSection,
  TwinCTASection,
} from "@/components/landing";

// Feature section data - using real Studio UI screenshots
const features = [
  {
    title: "Live 3D Data Centre Twin",
    subtitle: "See racks, aisles, GPU clusters, and power flows in a single NOC-style view.",
    bullets: [
      "3D rack and aisle layout with hot/cold zones",
      "Thermal and power overlays with hotspots",
      "Live KPI overlays for PUE, kW, and carbon",
    ],
    imageSrc: "/landing/screenshots/twin3d-desktop.png",
    imageAlt: "3D data centre visualization with thermal overlays and rack layouts",
    accentColor: "primary" as const,
  },
  {
    title: "Scenario Simulation for Energy, Carbon & GPU Spikes",
    subtitle: "Run what-if scenarios to prepare for any operational challenge.",
    bullets: [
      "Model GPU surge events and cooling failures",
      "Run carbon price shock and energy mix scenarios",
      "Compare \"brown vs green\" build strategies side by side",
    ],
    imageSrc: "/landing/screenshots/simulation-desktop.png",
    imageAlt: "Simulation panel with timeline controls and KPI trend overlays",
    flip: true,
    accentColor: "info" as const,
  },
  {
    title: "Sovereignty & Safety Audits, Built-In",
    subtitle: "Track compliance and data residency across your infrastructure.",
    bullets: [
      "Map data residency across regions and zones",
      "Track OSFI, HIPAA, PIPEDA, and internal controls",
      "Score compute, storage, and network sovereignty",
    ],
    imageSrc: "/landing/screenshots/sovereignty-desktop.png",
    imageAlt: "Sovereignty and Safety Audit dashboard with compliance metrics",
    accentColor: "success" as const,
  },
  {
    title: "Subsystem Agents for Every Critical Domain",
    subtitle: "Autonomous agents monitor and optimize each layer of your data centre.",
    bullets: [
      "Thermal Guardian for temperature and cooling",
      "Power & UPS Monitor for energy resilience",
      "Cooling Optimization Agent for efficiency",
      "Workload Orchestrator for GPU scheduling",
      "Carbon & Cost Agent for sustainability",
    ],
    imageSrc: "/landing/screenshots/agents-desktop.png",
    imageAlt: "Subsystem Agents dashboard showing AI optimization agents",
    flip: true,
    accentColor: "warning" as const,
  },
  {
    title: "Blueprint Designer for Tier, GPUs, and Regions",
    subtitle: "Configure your ideal data centre twin from the ground up.",
    bullets: [
      "Configure Tier III / Tier IV and hybrid cooling",
      "Size GPU fleets and IT capacity",
      "Model renewable mix and energy contracts",
    ],
    imageSrc: "/landing/screenshots/blueprint-desktop.png",
    imageAlt: "Blueprint Designer interface for configuring Data Centre Twin",
    accentColor: "primary" as const,
  },
  {
    title: "Real-Time Telemetry & Analytics",
    subtitle: "Monitor every metric across your data centre infrastructure.",
    bullets: [
      "PUE trend analysis and GPU utilization heatmaps",
      "Energy consumption tracking and forecasting",
      "Carbon emissions monitoring with targets",
    ],
    imageSrc: "/landing/screenshots/telemetry-desktop.png",
    imageAlt: "Telemetry and Analytics dashboard with real-time KPI monitoring",
    flip: true,
    accentColor: "info" as const,
  },
];

export default function DataCentreTwinLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <TwinHero />
      
      {/* Capability Badges */}
      <TwinCapabilityBadges />
      
      {/* Feature Sections */}
      {features.map((feature, index) => (
        <TwinFeatureSection
          key={index}
          title={feature.title}
          subtitle={feature.subtitle}
          bullets={feature.bullets}
          imageSrc={feature.imageSrc}
          imageAlt={feature.imageAlt}
          flip={feature.flip}
          accentColor={feature.accentColor}
        />
      ))}
      
      {/* Stats/ROI Band */}
      <TwinStatsBand />
      
      {/* Integrations */}
      <TwinIntegrationsGrid />
      
      {/* Use Cases */}
      <TwinUseCases />
      
      {/* Differentiators */}
      <TwinDifferentiators />
      
      {/* Trust Section */}
      <TwinTrustSection />
      
      {/* Bottom CTA */}
      <TwinCTASection />
      
      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} M2M Tech Connect. All rights reserved.
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
              <a href="mailto:info@m2mtechconnect.com" className="hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
