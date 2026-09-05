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
      <div className="max-w-4xl mx-auto px-4 lg:px-8 text-center">
        <p className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-snug">
          {t('landing.problemStatement')}
        </p>
        <p className="mt-4 text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
          {t('landing.problemStatementDetail')}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          <span className="font-display text-xl sm:text-2xl lg:text-3xl font-semibold leading-tight text-foreground">
            {t('landing.rotatingPrefix')}
          </span>
          <span className="relative inline-flex min-h-[1.8em] min-w-[11ch] items-center justify-center overflow-hidden text-xl sm:text-2xl lg:text-3xl">
            <AnimatePresence mode="wait">
              <motion.span
                key={ROTATING_KEYS[index]}
                initial={{ opacity: 0, y: '0.5em' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '-0.5em' }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="font-display font-semibold leading-tight text-success whitespace-nowrap"
              >
                {t(ROTATING_KEYS[index])}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>

      </div>
    </section>
  );
}
