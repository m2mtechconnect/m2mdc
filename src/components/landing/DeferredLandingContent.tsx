import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
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
} from '@/components/landing';

const featureDefs = [
  {
    titleKey: 'landing.featureDashboardTitle',
    subtitleKey: 'landing.featureDashboardSubtitle',
    bulletKeys: ['landing.featureDashboardB1', 'landing.featureDashboardB2', 'landing.featureDashboardB3'],
    imageSrc: '/landing/screenshots/dashboard-desktop.webp',
    imageAlt: 'Data Centre Command dashboard showing PUE, GPU saturation, thermal stability and sovereign compute metrics',
    imageWidth: 1564,
    imageHeight: 879,
    accentColor: 'primary' as const,
  },
  {
    titleKey: 'landing.feature3dTitle',
    subtitleKey: 'landing.feature3dSubtitle',
    bulletKeys: ['landing.feature3dB1', 'landing.feature3dB2', 'landing.feature3dB3'],
    imageSrc: '/landing/screenshots/simulation-desktop.webp',
    imageAlt: '3D Digital Twin with thermal rack visualization, simulation controls, and scenario selection panel',
    imageWidth: 1576,
    imageHeight: 896,
    flip: true,
    accentColor: 'info' as const,
  },
  {
    titleKey: 'landing.featureBlueprintTitle',
    subtitleKey: 'landing.featureBlueprintSubtitle',
    bulletKeys: ['landing.featureBlueprintB1', 'landing.featureBlueprintB2', 'landing.featureBlueprintB3'],
    imageSrc: '/landing/screenshots/blueprint-desktop.webp',
    imageAlt: 'Blueprint Designer showing agent health, data sources, KPIs, and workflows configuration',
    imageWidth: 1567,
    imageHeight: 895,
    accentColor: 'success' as const,
  },
  {
    titleKey: 'landing.featureThermalTitle',
    subtitleKey: 'landing.featureThermalSubtitle',
    bulletKeys: ['landing.featureThermalB1', 'landing.featureThermalB2', 'landing.featureThermalB3'],
    imageSrc: '/landing/screenshots/telemetry-desktop.webp',
    imageAlt: 'Thermal telemetry showing rack and GPU temperatures and inlet conditions',
    imageWidth: 1571,
    imageHeight: 891,
    flip: true,
    accentColor: 'warning' as const,
  },
  {
    titleKey: 'landing.featureCoolingTitle',
    subtitleKey: 'landing.featureCoolingSubtitle',
    bulletKeys: ['landing.featureCoolingB1', 'landing.featureCoolingB2', 'landing.featureCoolingB3'],
    imageSrc: '/landing/screenshots/cooling-desktop.png',
    imageAlt: 'Cooling zones dashboard with ambient temperatures, airflow and humidity monitoring',
    imageWidth: 1555,
    imageHeight: 895,
    accentColor: 'info' as const,
  },
  {
    titleKey: 'landing.featureSovereigntyTitle',
    subtitleKey: 'landing.featureSovereigntySubtitle',
    bulletKeys: ['landing.featureSovereigntyB1', 'landing.featureSovereigntyB2', 'landing.featureSovereigntyB3'],
    imageSrc: '/landing/screenshots/sovereignty-desktop.webp',
    imageAlt: 'Sovereignty dashboard showing data residency and compliance evidence',
    imageWidth: 1570,
    imageHeight: 895,
    flip: true,
    accentColor: 'success' as const,
  },
  {
    titleKey: 'landing.featureCarbonTitle',
    subtitleKey: 'landing.featureCarbonSubtitle',
    bulletKeys: ['landing.featureCarbonB1', 'landing.featureCarbonB2', 'landing.featureCarbonB3'],
    imageSrc: '/landing/screenshots/carbon-desktop.png',
    imageAlt: 'Carbon tracking with renewable mix and regional grid comparison',
    imageWidth: 1566,
    imageHeight: 889,
    accentColor: 'primary' as const,
  },
];

export default function DeferredLandingContent({ onReady }: { onReady?: () => void }) {
  const { t } = useTranslation();

  useEffect(() => { onReady?.(); }, [onReady]);

  return (
    <TooltipProvider>
      <div id="features">
        <ScrollReveal><TwinCapabilityBadges /></ScrollReveal>
        {featureDefs.map((feature, index) => (
          <ScrollReveal key={feature.titleKey} delay={index * 0.1} direction={feature.flip ? 'right' : 'left'}>
            <TwinFeatureSection
              title={t(feature.titleKey)}
              subtitle={t(feature.subtitleKey)}
              bullets={feature.bulletKeys.map((key) => t(key))}
              imageSrc={feature.imageSrc}
              imageAlt={feature.imageAlt}
              imageWidth={feature.imageWidth}
              imageHeight={feature.imageHeight}
              flip={feature.flip}
              accentColor={feature.accentColor}
            />
          </ScrollReveal>
        ))}
      </div>

      <ScrollReveal><TwinStatsBand /></ScrollReveal>
      <ScrollReveal><div id="integrations"><TwinIntegrationsGrid /></div></ScrollReveal>
      <ScrollReveal><div id="use-cases"><TwinUseCases /></div></ScrollReveal>
      <ScrollReveal><div id="differentiators"><TwinDifferentiators /></div></ScrollReveal>
      <ScrollReveal><TwinTrustSection /></ScrollReveal>
      <TwinCTASection />
      <TwinFooter />
    </TooltipProvider>
  );
}
