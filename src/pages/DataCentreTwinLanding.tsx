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

// Feature section data - using real Studio UI screenshots with accurate descriptions
const features = [
  {
    title: "3D Data Centre Visualization",
    subtitle: "Inspect racks, aisles, and zones in a live 3D model with thermal, power, and cooling overlays applied in real time.",
    bullets: [
      "3D rack layout with server positions and GPU locations",
      "Thermal overlay showing temperature zones and hotspots",
      "Power overlay displaying load distribution per rack",
    ],
    imageSrc: "/landing/screenshots/dashboard-desktop.png",
    imageAlt: "Live dashboard showing 3D data centre visualization with rack layout, thermal overlays, and real-time KPI metrics",
    accentColor: "primary" as const,
  },
  {
    title: "Scenario-Based Simulation",
    subtitle: "Run operational scenarios such as GPU spikes, cooling failures, and power disruptions to observe their impact on KPIs before changes occur in production.",
    bullets: [
      "Run Scenario button triggers simulation with timeline controls",
      "View KPI deltas (PUE, GPU Utilization, Carbon Intensity) during playback",
      "Compare baseline versus simulated outcomes side by side",
    ],
    imageSrc: "/landing/screenshots/simulation-desktop.png",
    imageAlt: "Simulation panel with Run Scenario button, timeline controls, and KPI delta display",
    flip: true,
    accentColor: "info" as const,
  },
  {
    title: "Sovereignty & Compliance Visibility",
    subtitle: "Review data residency, sovereignty score, and compliance status directly within the digital twin interface.",
    bullets: [
      "Sovereignty Score displayed as percentage with breakdown",
      "Data residency mapping by region and jurisdiction",
      "Compliance indicators for OSFI, HIPAA, and PIPEDA",
    ],
    imageSrc: "/landing/screenshots/sovereignty-desktop.png",
    imageAlt: "Sovereignty and Safety Audit panel showing Sovereignty Score, data residency status, and compliance indicators",
    accentColor: "success" as const,
  },
  {
    title: "Subsystem Agents Dashboard",
    subtitle: "View the status and activity of domain-specific agents that monitor thermal, power, cooling, and workload subsystems.",
    bullets: [
      "Thermal Guardian agent with temperature monitoring status",
      "Power & UPS Monitor agent tracking energy resilience",
      "Workload Orchestrator agent managing GPU scheduling",
    ],
    imageSrc: "/landing/screenshots/agents-desktop.png",
    imageAlt: "Subsystem Agents panel listing Thermal Guardian, Power Monitor, and Workload Orchestrator with status indicators",
    flip: true,
    accentColor: "warning" as const,
  },
  {
    title: "Blueprint Designer",
    subtitle: "Configure data centre twin parameters including facility tier, GPU capacity, cooling type, and renewable energy targets.",
    bullets: [
      "Facility tier selection (Tier III / Tier IV)",
      "GPU capacity and IT load configuration in kW",
      "Renewable energy target percentage setting",
    ],
    imageSrc: "/landing/screenshots/blueprint-desktop.png",
    imageAlt: "Blueprint Designer interface with facility tier, GPU capacity, and renewable target configuration fields",
    accentColor: "primary" as const,
  },
  {
    title: "Operational KPIs in Real Time",
    subtitle: "Track Power Usage Effectiveness, GPU Utilization, thermal stability, and Carbon Intensity as live metrics updated in real time.",
    bullets: [
      "Power Usage Effectiveness (PUE) with trend indicator",
      "GPU Utilization percentage across clusters",
      "Carbon Intensity displayed in gCO₂/kWh",
    ],
    imageSrc: "/landing/screenshots/telemetry-desktop.png",
    imageAlt: "Telemetry panel showing PUE, GPU Utilization, and Carbon Intensity KPI cards with real-time values and trends",
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
