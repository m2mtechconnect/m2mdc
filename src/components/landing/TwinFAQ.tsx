/**
 * TwinFAQ - straight answers plus explicit next steps.
 * Presentation only. Answers restate the platform's truth semantics
 * (configured != connected, simulated != measured) and make no vendor
 * integration claim.
 */

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

export const FAQ_KEYS = [
  { q: 'landing.faqQ1', a: 'landing.faqA1' },
  { q: 'landing.faqQ2', a: 'landing.faqA2' },
  { q: 'landing.faqQ3', a: 'landing.faqA3' },
  { q: 'landing.faqQ4', a: 'landing.faqA4' },
  { q: 'landing.faqQ5', a: 'landing.faqA5' },
];

const nextSteps = [
  { titleKey: 'landing.nextStepStartTitle', bodyKey: 'landing.nextStepStartBody', href: '/sign-up' },
  { titleKey: 'landing.nextStepDemoTitle', bodyKey: 'landing.nextStepDemoBody', href: '/request-demo' },
  { titleKey: 'landing.nextStepTourTitle', bodyKey: 'landing.nextStepTourBody', href: '#simulation-walkthrough' },
];

export function TwinFAQ() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const go = (href: string) => {
    if (href.startsWith('#')) {
      document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    navigate(href);
  };

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

        <div className="mt-20">
          <SectionHeading eyebrow={t('landing.nextStepsEyebrow')} title={t('landing.nextStepsTitle')} />
          <ul className="mt-12 grid gap-px bg-border sm:grid-cols-3">
            {nextSteps.map((step) => (
              <li key={step.titleKey} className="bg-background">
                <button
                  type="button"
                  onClick={() => go(step.href)}
                  className="group flex h-full w-full flex-col items-start px-6 py-8 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="text-base font-semibold text-foreground">{t(step.titleKey)}</span>
                  <span className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(step.bodyKey)}</span>
                  <ArrowRight
                    className="mt-6 h-4 w-4 text-success transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
