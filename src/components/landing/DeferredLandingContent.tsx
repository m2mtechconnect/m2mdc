import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  TwinFeatureSection,
  TwinStatsBand,
  TwinProblemStatement,
  TwinArchitecture,
  TwinSimulationWalkthrough,
  TwinIntegrationsGrid,
  TwinUseCases,
  TwinBusinessCase,
  TwinDifferentiators,
  TwinTrustSection,
  TwinCTASection,
  TwinBenefits,
  TwinSecondaryCapabilities,
  TwinFAQ,
  ScrollReveal,
  TwinFooter,
} from '@/components/landing';

const primaryFeatureDefs = [
  {
    titleKey: 'landing.featureDashboardTitle',
    subtitleKey: 'landing.featureDashboardSubtitle',
    bulletKeys: ['landing.featureDashboardB1', 'landing.featureDashboardB2', 'landing.featureDashboardB3'],
    imageSrc: '/landing/screenshots/dashboard-desktop.webp',
    imageAlt: 'AURA Data Centre Command dashboard with modelled KPI cockpit, rack status overview and simulated event timeline',
    imageWidth: 1600,
    imageHeight: 1000,
    accentColor: 'primary' as const,
  },  {
    titleKey: 'landing.feature3dTitle',
    subtitleKey: 'landing.feature3dSubtitle',
    bulletKeys: ['landing.feature3dB1', 'landing.feature3dB2', 'landing.feature3dB3'],
    imageSrc: '/landing/screenshots/simulation-desktop.webp',
    imageAlt: 'AURA scenario simulation running a GPU spike with 3D hall, simulation controls and scenario clock',
    imageWidth: 1440,
    imageHeight: 900,
    flip: true,
    accentColor: 'info' as const,
  },  {
    titleKey: 'landing.featurePowerTitle',
    subtitleKey: 'landing.featurePowerSubtitle',
    bulletKeys: ['landing.featurePowerB1', 'landing.featurePowerB2', 'landing.featurePowerB3'],
    imageSrc: '/landing/screenshots/power-desktop.webp',
    imageAlt: 'AURA power view showing the distribution chain from grid to racks with UPS bank status and redundancy level',
    imageWidth: 1600,
    imageHeight: 1000,
    accentColor: 'success' as const,
  },  {
    titleKey: 'landing.featureSovereigntyTitle',
    subtitleKey: 'landing.featureSovereigntySubtitle',
    bulletKeys: ['landing.featureSovereigntyB1', 'landing.featureSovereigntyB2', 'landing.featureSovereigntyB3'],
    imageSrc: '/landing/screenshots/sovereignty-desktop.webp',
    imageAlt: 'AURA sovereignty view with data residency status, classification distribution and compliance frameworks',
    imageWidth: 1600,
    imageHeight: 1000,
    flip: true,
    accentColor: 'success' as const,
  },];

const secondaryFeatureDefs = [
  {
    titleKey: 'landing.featureThermalTitle',
    subtitleKey: 'landing.featureThermalSubtitle',
    bulletKeys: ['landing.featureThermalB1', 'landing.featureThermalB2', 'landing.featureThermalB3'],
    imageSrc: '/landing/screenshots/telemetry-desktop.webp',
    imageAlt: 'AURA thermal telemetry with rack thermal map, average inlet temperature and GPU temperatures',
    imageWidth: 1600,
    imageHeight: 1000,
    flip: true,
    accentColor: 'warning' as const,
  },  {
    titleKey: 'landing.featureCoolingTitle',
    subtitleKey: 'landing.featureCoolingSubtitle',
    bulletKeys: ['landing.featureCoolingB1', 'landing.featureCoolingB2', 'landing.featureCoolingB3'],
    imageSrc: '/landing/screenshots/cooling-desktop.webp',
    imageAlt: 'AURA cooling zones view with ambient temperature, target setpoint, humidity and airflow per zone',
    imageWidth: 1600,
    imageHeight: 1000,
    accentColor: 'info' as const,
  },  {
    titleKey: 'landing.featureCarbonTitle',
    subtitleKey: 'landing.featureCarbonSubtitle',
    bulletKeys: ['landing.featureCarbonB1', 'landing.featureCarbonB2', 'landing.featureCarbonB3'],
    imageSrc: '/landing/screenshots/carbon-desktop.webp',
    imageAlt: 'AURA carbon view with efficiency score, renewable mix, carbon budget status and regional grid comparison',
    imageWidth: 1600,
    imageHeight: 1000,
    accentColor: 'primary' as const,
  },
];

export default function DeferredLandingContent({ onReady }: { onReady?: () => void }) {
  const { t } = useTranslation();

  useEffect(() => { onReady?.(); }, [onReady]);

  return (
    <TooltipProvider>
      <ScrollReveal><TwinProblemStatement /></ScrollReveal>
      <ScrollReveal><TwinBenefits /></ScrollReveal>

      <div id="features" className="scroll-mt-16 lg:scroll-mt-20">
        {primaryFeatureDefs.map((feature, index) => (
          <ScrollReveal key={feature.titleKey} delay={index * 0.1} direction="up">
            <TwinFeatureSection
              title={t(feature.titleKey)}
              index={index + 1}

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

      <ScrollReveal>
        <TwinSecondaryCapabilities
          items={secondaryFeatureDefs.map((feature) => ({
            title: t(feature.titleKey),
            body: t(feature.subtitleKey),
            imageSrc: feature.imageSrc,
            imageAlt: feature.imageAlt,
            imageWidth: feature.imageWidth,
            imageHeight: feature.imageHeight,
          }))}
        />
      </ScrollReveal>

      <TwinSimulationWalkthrough />
      <ScrollReveal><TwinArchitecture /></ScrollReveal>
      <ScrollReveal><TwinStatsBand /></ScrollReveal>
      <ScrollReveal><div id="integrations" className="scroll-mt-16 lg:scroll-mt-20"><TwinIntegrationsGrid /></div></ScrollReveal>
      <ScrollReveal><div id="use-cases" className="scroll-mt-16 lg:scroll-mt-20"><TwinUseCases /></div></ScrollReveal>

      <ScrollReveal><div id="business-case" className="scroll-mt-16 lg:scroll-mt-20"><TwinBusinessCase /></div></ScrollReveal>
      <ScrollReveal><div id="differentiators" className="scroll-mt-16 lg:scroll-mt-20"><TwinDifferentiators /></div></ScrollReveal>

      <ScrollReveal><TwinTrustSection /></ScrollReveal>
      <ScrollReveal><TwinFAQ /></ScrollReveal>
      <TwinCTASection />
      <TwinFooter />
    </TooltipProvider>
  );
}
