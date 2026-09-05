/**
 * TwinSimulationWalkthrough - three-step scroll walkthrough of a scenario run.
 *
 * Presentation only. Every frame is a real capture of the public AURA
 * simulation surface, and the copy states plainly that the output is
 * simulated rather than measured production telemetry.
 */

import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { screenshotManifest } from '@/data/studioScreenshots';

const stepDefs = [
  {
    src: '/landing/screenshots/walkthrough-1-scenario.webp',
    titleKey: 'landing.walkthroughStep1Title',
    bodyKey: 'landing.walkthroughStep1Body',
    altKey: 'landing.walkthroughStep1Alt',
  },
  {
    src: '/landing/screenshots/walkthrough-2-running.webp',
    titleKey: 'landing.walkthroughStep2Title',
    bodyKey: 'landing.walkthroughStep2Body',
    altKey: 'landing.walkthroughStep2Alt',
  },
  {
    src: '/landing/screenshots/walkthrough-3-impact.webp',
    titleKey: 'landing.walkthroughStep3Title',
    bodyKey: 'landing.walkthroughStep3Body',
    altKey: 'landing.walkthroughStep3Alt',
  },
];

export function TwinSimulationWalkthrough() {
  const { t } = useTranslation();
  const version = encodeURIComponent(screenshotManifest.version);

  return (
    <section id="simulation-walkthrough" className="border-y border-white/5 bg-[#0A0A0A] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-success">
            {t('landing.walkthroughEyebrow')}
          </span>
          <h2 className="mt-6 font-display text-[clamp(1.9rem,4vw,3.25rem)] font-bold uppercase leading-[1.02] tracking-tight text-[#F5F7FA]">
            {t('landing.walkthroughTitle')}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[#C9CDD3] lg:text-lg">
            {t('landing.walkthroughIntro')}
          </p>
        </div>

        <ol className="mt-14 space-y-16 lg:space-y-24">
          {stepDefs.map((step, index) => (
            <motion.li
              key={step.src}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="grid items-center gap-8 border-t border-white/10 pt-8 lg:grid-cols-12 lg:gap-14"
            >
              <div className={index % 2 === 1 ? 'lg:order-2 lg:col-span-4' : 'lg:col-span-4'}>
                <span className="font-mono text-xs text-success">{String(index + 1).padStart(2, '0')}</span>
                <h3 className="mt-4 font-display text-xl font-bold uppercase tracking-tight text-[#F5F7FA] lg:text-2xl">
                  {t(step.titleKey)}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#C9CDD3] lg:text-base">{t(step.bodyKey)}</p>
              </div>

              <div className={index % 2 === 1 ? 'lg:order-1 lg:col-span-8' : 'lg:col-span-8'}>
                <figure className="border border-white/10 bg-[#1E1E1E] p-2">
                  <img
                    src={`${step.src}?v=${version}`}
                    alt={t(step.altKey)}
                    width={1440}
                    height={900}
                    loading="lazy"
                    decoding="async"
                    className="w-full"
                  />
                  <figcaption className="px-1 pt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#AEB4BC]">
                    {t('landing.walkthroughNote')}
                  </figcaption>
                </figure>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
