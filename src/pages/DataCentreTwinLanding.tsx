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

// Feature section data - real Studio UI screenshots with accurate descriptions
const features = [
  {
    title: "Data Centre Command Dashboard",
    subtitle: "Single pane of glass for PUE, GPU Saturation, Thermal Stability, and Sovereign Compute metrics with AI Co-Pilot assistance.",
    bullets: [
      "Global PUE tracking with trend improvement indicators",
      "GPU Saturation and Thermal Stability live percentages",
      "Sovereign Compute percentage with jurisdiction compliance",
    ],
    imageSrc: "/landing/screenshots/dashboard-desktop.png",
    imageAlt: "Data Centre Command dashboard showing PUE 1.38, GPU Saturation 23%, Thermal Stability 94%, Sovereign Compute 98%",
    accentColor: "primary" as const,
  },
  {
    title: "3D Digital Twin & Simulation",
    subtitle: "Interactive 3D rack visualization with thermal overlays, simulation controls, and scenario playback for what-if analysis.",
    bullets: [
      "3D rack layout with thermal heatmap overlays by row",
      "Run Scenario button with speed controls (1x, 2x, 5x, 10x)",
      "KPI Impact Analysis showing PUE, GPU Util, Thermal, Carbon deltas",
    ],
    imageSrc: "/landing/screenshots/simulation-desktop.png",
    imageAlt: "3D Digital Twin with thermal rack visualization, simulation controls, and scenario selection panel",
    flip: true,
    accentColor: "info" as const,
  },
  {
    title: "Blueprint Designer",
    subtitle: "Configure your data centre twin with agents, data sources, KPIs, workflows, and roles — all in designer mode.",
    bullets: [
      "9 Agents, 23 Data Sources, 58 KPIs, 25 Workflows configured",
      "Agent Health & Performance panel with response times",
      "Snapshot versioning and JSON export for infrastructure-as-code",
    ],
    imageSrc: "/landing/screenshots/blueprint-desktop.png",
    imageAlt: "Blueprint Designer showing agent health, data sources, KPIs, and workflows configuration",
    accentColor: "success" as const,
  },
  {
    title: "Thermal Telemetry & Rack Monitoring",
    subtitle: "Real-time thermal visibility across all racks with inlet temps, GPU temps, and delta-T alerts.",
    bullets: [
      "Avg Inlet Temp 21.9°C, GPU Temps 67°C with stability indicators",
      "Rack Thermal Map with temperature per rack (19°C–28°C)",
      "Filter by High Density, GPU Racks, Hot Aisle, Cold Aisle",
    ],
    imageSrc: "/landing/screenshots/telemetry-desktop.png",
    imageAlt: "Thermal telemetry showing rack temperatures 19-28°C, GPU temps 67°C, and inlet temp 21.9°C",
    flip: true,
    accentColor: "warning" as const,
  },
  {
    title: "Cooling Zone Management",
    subtitle: "Monitor all cooling zones with ambient temps, target setpoints, humidity levels, and airflow CFM.",
    bullets: [
      "8 cooling zones with ambient and target temperature tracking",
      "Humidity monitoring from 43% to 51% across zones",
      "Airflow rates from 54,000 to 76,000 CFM per zone",
    ],
    imageSrc: "/landing/screenshots/cooling-desktop.png",
    imageAlt: "Cooling zones dashboard with 8 zones, ambient temps, airflow CFM, and humidity monitoring",
    accentColor: "info" as const,
  },
  {
    title: "Sovereignty & Compliance Visibility",
    subtitle: "Track data residency, sovereignty score, and compliance certifications directly within your digital twin.",
    bullets: [
      "100% Sovereignty Score with Data Residency Compliant status",
      "5 certified compliance frameworks (OSFI, HIPAA, PIPEDA)",
      "95% Audit Readiness with data classification breakdown",
    ],
    imageSrc: "/landing/screenshots/sovereignty-desktop.png",
    imageAlt: "Sovereignty dashboard showing 100% score, data residency compliance, 5 certified frameworks",
    flip: true,
    accentColor: "success" as const,
  },
  {
    title: "Carbon & Sustainability Tracking",
    subtitle: "Monitor carbon efficiency, emissions per GPU-hour, renewable mix, and regional grid comparison.",
    bullets: [
      "100% Carbon Efficiency Score vs 150g baseline",
      "99% Renewable Mix with regional grid comparison (CA-QC vs CA-AB)",
      "Carbon Budget tracking with annual tonnage and run rate",
    ],
    imageSrc: "/landing/screenshots/carbon-desktop.png",
    imageAlt: "Carbon tracking with 100% efficiency score, 99% renewable mix, regional grid comparison",
    accentColor: "primary" as const,
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
