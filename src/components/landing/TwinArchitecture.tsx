/**
 * TwinArchitecture - four-area system architecture diagram for the AURA
 * marketing page, rendered in code (hairline boxes + connectors) so it stays
 * sharp, localizable and themeable. Presentation only.
 *
 * Truth rules: the diagram maps AURA's real components (blueprint, engines,
 * scenario simulation, operational views). It makes no vendor runtime claim
 * and labels simulated output as simulated.
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

const areas = [
  {
    number: '01',
    titleKey: 'landing.archModelTitle',
    captionKey: 'landing.archModelCaption',
    itemKeys: ['landing.archModelI1', 'landing.archModelI2', 'landing.archModelI3'],
  },
  {
    number: '02',
    titleKey: 'landing.archComputeTitle',
    captionKey: 'landing.archComputeCaption',
    itemKeys: ['landing.archComputeI1', 'landing.archComputeI2', 'landing.archComputeI3'],
  },
  {
    number: '03',
    titleKey: 'landing.archSimulateTitle',
    captionKey: 'landing.archSimulateCaption',
    itemKeys: ['landing.archSimulateI1', 'landing.archSimulateI2', 'landing.archSimulateI3'],
  },
  {
    number: '04',
    titleKey: 'landing.archOperateTitle',
    captionKey: 'landing.archOperateCaption',
    itemKeys: ['landing.archOperateI1', 'landing.archOperateI2', 'landing.archOperateI3'],
  },
];

interface TwinArchitectureProps {
  /** Hide the section heading when the embedding page supplies its own. */
  showHeading?: boolean;
  /** Hide the link to /architecture when already on that page. */
  showPageLink?: boolean;
}

export function TwinArchitecture({ showHeading = true, showPageLink = true }: TwinArchitectureProps) {
  const { t } = useTranslation();

  return (
    <section id="architecture" className="relative overflow-hidden bg-[#161617] py-20 lg:py-28">
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.05]" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        {showHeading ? (
          <SectionHeading
            surface="dark"
            eyebrow={t('landing.archEyebrow')}
            title={t('landing.archTitle')}
            lede={t('landing.archLede')}
          />
        ) : null}


        {/* Diagram: four areas, left to right, connected by data-flow arrows */}
        <div className="mt-14 grid gap-6 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:gap-4 lg:items-stretch">
          {areas.map((area, index) => (
            <motion.div
              key={area.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="contents"
            >
              <div className="flex h-full flex-col border border-[#3A3A3A] bg-[#1E1E1E] p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-sm text-success">{area.number}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#AEB4BC]">
                    {t(area.captionKey)}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold uppercase tracking-wide text-[#F5F7FA]">
                  {t(area.titleKey)}
                </h3>
                <ul className="mt-4 space-y-2 border-t border-[#3A3A3A] pt-4">
                  {area.itemKeys.map((key) => (
                    <li key={key} className="flex items-start gap-2 text-sm text-[#C9CDD3]">
                      <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 bg-success" aria-hidden="true" />
                      <span>{t(key)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {index < areas.length - 1 ? (
                <div className="hidden items-center lg:flex" aria-hidden="true">
                  <ArrowRight className="h-5 w-5 text-success" />
                </div>
              ) : null}
            </motion.div>
          ))}
        </div>

        {/* Mission statement */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-14 max-w-3xl border-t border-[#3A3A3A] pt-10 font-display text-xl leading-snug text-[#F5F7FA] lg:text-2xl"
        >
          {t('landing.missionStatement')}
        </motion.p>

        {/* Truth footer */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-10 border-t border-[#3A3A3A] pt-6 font-mono text-xs uppercase tracking-[0.18em] text-[#AEB4BC]"
        >
          {t('landing.archTruthNote')}
        </motion.p>

        {/* Link to the full architecture page */}
        {showPageLink ? (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-4"
          >
            <Link
              to="/architecture"
              className="group inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-success transition-colors hover:text-success/80"
            >
              {t('landing.archPageLink')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link
              to="/blueprint-estimator"
              className="group inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-success transition-colors hover:text-success/80"
            >
              {t('landing.estimatorLink')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
