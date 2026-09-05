/**
 * TwinFAQ - straight answers to the questions the rest of the page raises.
 * Presentation only. Answers restate the platform's truth semantics
 * (configured != connected, simulated != measured) and make no vendor
 * integration claim. Conversion paths live in the closing CTA section.
 */

import { useTranslation } from 'react-i18next';
import { SectionHeading } from './SectionHeading';

export const FAQ_KEYS = [
  { q: 'landing.faqQ1', a: 'landing.faqA1' },
  { q: 'landing.faqQ2', a: 'landing.faqA2' },
  { q: 'landing.faqQ3', a: 'landing.faqA3' },
  { q: 'landing.faqQ4', a: 'landing.faqA4' },
  { q: 'landing.faqQ5', a: 'landing.faqA5' },
  { q: 'landing.faqQ6', a: 'landing.faqA6' },
];

export function TwinFAQ() {
  const { t } = useTranslation();



  return (
    <section id="faq" className="bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <SectionHeading eyebrow={t('landing.faqEyebrow')} title={t('landing.faqTitle')} />

        <dl className="mt-14 grid gap-x-16 gap-y-10 lg:grid-cols-2">
          {FAQ_KEYS.map((item, index) => (
            <div key={item.q} className="border-t border-border pt-6">
              <span className="font-mono text-xs text-muted-foreground">
                {String(index + 1).padStart(2, '0')}
              </span>
              <dt className="mt-3 text-base font-semibold text-foreground">{t(item.q)}</dt>
              <dd className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(item.a)}</dd>
            </div>
          ))}
        </dl>

      </div>
    </section>
  );
}
