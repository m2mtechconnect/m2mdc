/**
 * SectionHeading - shared editorial section header for the AURA marketing page.
 * Presentation only: eyebrow rule, oversized display title, optional lede.
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  lede?: string;
  /** Dark technical surfaces use the near-white / light-gray text ramp. */
  surface?: 'light' | 'dark';
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  surface = 'light',
  align = 'left',
  className,
}: SectionHeadingProps) {
  const dark = surface === 'dark';

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn(
        'max-w-3xl',
        align === 'center' && 'mx-auto text-center',
        className,
      )}
    >
      {eyebrow ? (
        <div
          className={cn(
            'flex items-center gap-3',
            align === 'center' && 'justify-center',
          )}
        >
          <span aria-hidden="true" className="h-px w-8 bg-success" />
          <span
            className={cn(
              'text-xs font-semibold uppercase tracking-[0.28em]',
              dark ? 'text-[#AEB4BC]' : 'text-muted-foreground',
            )}
          >
            {eyebrow}
          </span>
        </div>
      ) : null}

      <h2
        className={cn(
          'mt-6 font-display text-3xl font-bold uppercase leading-[1.05] tracking-tight lg:text-5xl',
          dark ? 'text-[#F5F7FA]' : 'text-foreground',
        )}
      >
        {title}
      </h2>

      {lede ? (
        <p
          className={cn(
            'mt-5 text-base leading-relaxed lg:text-lg',
            dark ? 'text-[#C9CDD3]' : 'text-muted-foreground',
          )}
        >
          {lede}
        </p>
      ) : null}
    </motion.div>
  );
}
