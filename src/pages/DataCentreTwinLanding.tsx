import { useTranslation } from "react-i18next";
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

// Feature section definitions using i18n keys
const featureDefs = [
  {
    titleKey: "landing.featureDashboardTitle",
    subtitleKey: "landing.featureDashboardSubtitle",
    bulletKeys: ["landing.featureDashboardB1", "landing.featureDashboardB2", "landing.featureDashboardB3"],
    imageSrc: "/landing/screenshots/dashboard-desktop.png",
    imageAlt: "Data Centre Command dashboard showing PUE 1.38, GPU Saturation 23%, Thermal Stability 94%, Sovereign Compute 98%",
    accentColor: "primary" as const,
  },
  {
    titleKey: "landing.feature3dTitle",
    subtitleKey: "landing.feature3dSubtitle",
    bulletKeys: ["landing.feature3dB1", "landing.feature3dB2", "landing.feature3dB3"],
    imageSrc: "/landing/screenshots/simulation-desktop.png",
    imageAlt: "3D Digital Twin with thermal rack visualization, simulation controls, and scenario selection panel",
    flip: true,
    accentColor: "info" as const,
  },
  {
    titleKey: "landing.featureBlueprintTitle",
    subtitleKey: "landing.featureBlueprintSubtitle",
    bulletKeys: ["landing.featureBlueprintB1", "landing.featureBlueprintB2", "landing.featureBlueprintB3"],
    imageSrc: "/landing/screenshots/blueprint-desktop.png",
    imageAlt: "Blueprint Designer showing agent health, data sources, KPIs, and workflows configuration",
    accentColor: "success" as const,
  },
  {
    titleKey: "landing.featureThermalTitle",
    subtitleKey: "landing.featureThermalSubtitle",
    bulletKeys: ["landing.featureThermalB1", "landing.featureThermalB2", "landing.featureThermalB3"],
    imageSrc: "/landing/screenshots/telemetry-desktop.png",
    imageAlt: "Thermal telemetry showing rack temperatures 19-28°C, GPU temps 67°C, and inlet temp 21.9°C",
    flip: true,
    accentColor: "warning" as const,
  },
  {
    titleKey: "landing.featureCoolingTitle",
    subtitleKey: "landing.featureCoolingSubtitle",
    bulletKeys: ["landing.featureCoolingB1", "landing.featureCoolingB2", "landing.featureCoolingB3"],
    imageSrc: "/landing/screenshots/cooling-desktop.png",
    imageAlt: "Cooling zones dashboard with 8 zones, ambient temps, airflow CFM, and humidity monitoring",
    accentColor: "info" as const,
  },
  {
    titleKey: "landing.featureSovereigntyTitle",
    subtitleKey: "landing.featureSovereigntySubtitle",
    bulletKeys: ["landing.featureSovereigntyB1", "landing.featureSovereigntyB2", "landing.featureSovereigntyB3"],
    imageSrc: "/landing/screenshots/sovereignty-desktop.png",
    imageAlt: "Sovereignty dashboard showing 100% score, data residency compliance, 5 certified frameworks",
    flip: true,
    accentColor: "success" as const,
  },
  {
    titleKey: "landing.featureCarbonTitle",
    subtitleKey: "landing.featureCarbonSubtitle",
    bulletKeys: ["landing.featureCarbonB1", "landing.featureCarbonB2", "landing.featureCarbonB3"],
    imageSrc: "/landing/screenshots/carbon-desktop.png",
    imageAlt: "Carbon tracking with 100% efficiency score, 99% renewable mix, regional grid comparison",
    accentColor: "primary" as const,
  },
];
export default function DataCentreTwinLanding() {
  const { t } = useTranslation();
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
        {featureDefs.map((feature, index) => (
          <ScrollReveal key={index} delay={index * 0.1} direction={feature.flip ? "right" : "left"}>
            <TwinFeatureSection
              title={t(feature.titleKey)}
              subtitle={t(feature.subtitleKey)}
              bullets={feature.bulletKeys.map(k => t(k))}
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
