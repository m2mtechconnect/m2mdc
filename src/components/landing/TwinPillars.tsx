/**
 * TwinPillars - Numbered platform pillars on a dark technical surface,
 * closing with the product mission statement. Marketing-only.
 */

import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const pillars = [
  {
    number: '01',
    titleKey: 'landing.pillarDesignTitle',
    bodyKey: 'landing.pillarDesignBody',
    pointKeys: ['landing.pillarDesignP1', 'landing.pillarDesignP2'],
  },
  {
    number: '02',
    titleKey: 'landing.pillarSimulateTitle',
    bodyKey: 'landing.pillarSimulateBody',
    pointKeys: ['landing.pillarSimulateP1', 'landing.pillarSimulateP2'],
  },
  {
    number: '03',
    titleKey: 'landing.pillarEvidenceTitle',
    bodyKey: 'landing.pillarEvidenceBody',
    pointKeys: ['landing.pillarEvidenceP1', 'landing.pillarEvidenceP2'],
  },
];

export function TwinPillars() {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden bg-[#1E1E1E] py-20 lg:py-28">
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.05]" aria-hidden="true" />
      <div className="relative max-w-6xl mx-auto px-4 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="font-display text-3xl lg:text-4xl font-bold text-[#F5F7FA] max-w-3xl"
        >
          {t('landing.pillarsHeading')}
        </motion.h2>
        <p className="mt-4 text-base lg:text-lg text-[#C9CDD3] max-w-2xl">
          {t('landing.pillarsSubheading')}
        </p>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {pillars.map((pillar, index) => (
            <motion.div
              key={pillar.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: index * 0.1 }}
              className="border-t border-[#3A3A3A] pt-6"
            >
              <span className="font-mono text-sm text-success">{pillar.number}</span>
              <h3 className="mt-3 font-display text-xl font-semibold text-[#F5F7FA]">
                {t(pillar.titleKey)}
              </h3>
              <p className="mt-3 text-sm lg:text-base text-[#C9CDD3] leading-relaxed">
                {t(pillar.bodyKey)}
              </p>
              <ul className="mt-4 space-y-2">
                {pillar.pointKeys.map((key) => (
                  <li key={key} className="flex items-start gap-2 text-sm text-[#AEB4BC]">
                    <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-16 border-t border-[#3A3A3A] pt-10 font-display text-xl lg:text-2xl text-[#F5F7FA] max-w-3xl leading-snug"
        >
          {t('landing.missionStatement')}
        </motion.p>
      </div>
    </section>
  );
}
