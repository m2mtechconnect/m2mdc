/**
 * DataCentreTwinLanding - Marketing landing page for Sovereign Green AI Data Centre Twin
 * Public, read-only page showcasing the platform capabilities
 * Uses M2M brand design tokens from index.css
 */

import { 
  TwinHeader,
  TwinHero,
  TwinCapabilityBadges,
  TwinFeatureSection,
  TwinStatsBand,
  TwinIntegrationsGrid,
  TwinUseCases,
  TwinDifferentiators,
  TwinTrustSection,
  TwinCTASection,
  ScrollReveal,
  TwinFooter,
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
    imageSrc: "/landing/screenshots/dashboard-desktop.png",
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
    <div className="min-h-screen bg-background text-foreground scroll-smooth">
      {/* Header Navigation */}
      <TwinHeader />
      
      {/* Hero Section - add pt for fixed header */}
      <div className="pt-16 lg:pt-20">
        <TwinHero />
      </div>
      
      {/* Capability Badges */}
      <ScrollReveal>
        <TwinCapabilityBadges />
      </ScrollReveal>
      
      {/* Feature Sections */}
      <div id="features">
        {features.map((feature, index) => (
          <ScrollReveal key={index} delay={index * 0.1} direction={feature.flip ? "right" : "left"}>
            <TwinFeatureSection
              title={feature.title}
              subtitle={feature.subtitle}
              bullets={feature.bullets}
              imageSrc={feature.imageSrc}
              imageAlt={feature.imageAlt}
              flip={feature.flip}
              accentColor={feature.accentColor}
            />
          </ScrollReveal>
        ))}
      </div>
      
      {/* Stats/ROI Band */}
      <ScrollReveal>
        <TwinStatsBand />
      </ScrollReveal>
      
      {/* Integrations */}
      <ScrollReveal>
        <div id="integrations">
          <TwinIntegrationsGrid />
        </div>
      </ScrollReveal>
      
      {/* Use Cases */}
      <ScrollReveal>
        <div id="use-cases">
          <TwinUseCases />
        </div>
      </ScrollReveal>
      
      {/* Differentiators */}
      <ScrollReveal>
        <div id="differentiators">
          <TwinDifferentiators />
        </div>
      </ScrollReveal>
      
      {/* Trust Section */}
      <ScrollReveal>
        <TwinTrustSection />
      </ScrollReveal>
      
      {/* Bottom CTA */}
      <TwinCTASection />
      
      {/* Footer */}
      <TwinFooter />
    </div>
  );
}
