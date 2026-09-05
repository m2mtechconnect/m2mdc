/**
 * TwinBenefits - four-up benefit band stating what the governed twin is for.
 * Presentation only. Copy comes from the existing i18n bundle and makes no
 * live-telemetry, measured or vendor-integration claim.
 */

import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Gauge, SearchCheck, FileCheck2, ShieldCheck } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

const benefits = [
  { icon: Gauge, titleKey: 'landing.benefit1Title', bodyKey: 'landing.benefit1Body' },
  { icon: SearchCheck, titleKey: 'landing.benefit2Title', bodyKey: 'landing.benefit2Body' },
  { icon: FileCheck2, titleKey: 'landing.benefit3Title', bodyKey: 'landing.benefit3Body' },
  { icon: ShieldCheck, titleKey: 'landing.benefit4Title', bodyKey: 'landing.benefit4Body' },
];

export function TwinBenefits() {
  const { t } = useTranslation();

  return (
    <section className="bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <SectionHeading
          eyebrow={t('landing.benefitsEyebrow')}
          title={t('landing.benefitsTitle')}
          lede={t('landing.benefitsLede')}
        />

        <ul className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.li
                key={benefit.titleKey}
                className="border-t border-border pt-6"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-success" aria-hidden="true" />
                  <span className="font-mono text-xs text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{t(benefit.titleKey)}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(benefit.bodyKey)}</p>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
