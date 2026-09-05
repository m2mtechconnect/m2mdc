/**
 * TwinProblemStatement - Problem framing band with a rotating capability word.
 * Marketing-only presentation component. No runtime data, no claims beyond platform scope.
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const ROTATING_KEYS = [
  'landing.rotatingEnergy',
  'landing.rotatingCarbon',
  'landing.rotatingCapacity',
  'landing.rotatingThermal',
  'landing.rotatingSovereignty',
  'landing.rotatingCost',
];

export function TwinProblemStatement() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % ROTATING_KEYS.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="relative py-20 lg:py-28 bg-background">
      <div className="max-w-4xl mx-auto px-4 lg:px-8 text-center flex flex-col items-center space-y-12">
        <div className="space-y-6">
          <p className="font-display text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            {t('landing.problemStatement')}
          </p>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground leading-relaxed">
            {t('landing.problemStatementDetail')}
          </p>
        </div>

        <div className="flex flex-col items-center space-y-4">
          <div className="h-px w-24 bg-border" aria-hidden="true" />
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-2xl md:text-4xl tracking-tight">
            <span className="font-display font-semibold leading-tight text-foreground">
              {t('landing.rotatingPrefix')}
            </span>
            <span className="relative inline-flex min-h-[1.4em] min-w-[11ch] items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.span
                  key={ROTATING_KEYS[index]}
                  initial={{ opacity: 0, y: '0.5em' }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: '-0.5em' }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="font-display font-bold leading-tight text-success whitespace-nowrap"
                >
                  {t(ROTATING_KEYS[index])}
                </motion.span>
              </AnimatePresence>
            </span>
          </div>
        </div>

        <div className="pt-4 flex gap-8 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden="true" />
            {t('landing.problemMetaModel')}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-border" aria-hidden="true" />
            {t('landing.problemMetaEvidence')}
          </div>
        </div>
      </div>
    </section>
  );
}
