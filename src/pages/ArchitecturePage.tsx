/**
 * ArchitecturePage - public marketing page describing AURA's four-area
 * system architecture. Reuses the TwinArchitecture diagram from the landing
 * page (same diagram, same copy) and adds per-area detail.
 *
 * Truth rules: no vendor runtime claims, simulated output labelled simulated.
 */
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { AuraLogo } from '@/components/brand/AuraLogo';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { TwinArchitecture } from '@/components/landing/TwinArchitecture';
import { TwinFooter } from '@/components/landing/TwinFooter';

const detailAreas = [
  { number: '01', titleKey: 'landing.archModelTitle', bodyKey: 'archPage.modelBody' },
  { number: '02', titleKey: 'landing.archComputeTitle', bodyKey: 'archPage.computeBody' },
  { number: '03', titleKey: 'landing.archSimulateTitle', bodyKey: 'archPage.simulateBody' },
  { number: '04', titleKey: 'landing.archOperateTitle', bodyKey: 'archPage.operateBody' },
] as const;

export default function ArchitecturePage() {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t('archPage.metaTitle')}</title>
        <meta name="description" content={t('archPage.metaDescription')} />
        <link rel="canonical" href="https://auradc.m2mtechconnect.com/architecture" />
        <meta property="og:title" content={t('archPage.metaTitle')} />
        <meta property="og:description" content={t('archPage.metaDescription')} />
        <meta property="og:url" content="https://auradc.m2mtechconnect.com/architecture" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="aura-marketing flex min-h-screen flex-col bg-[#0A0A0A]">
        <header className="border-b border-white/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-[#AEB4BC] transition-colors hover:text-[#F5F7FA]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <AuraLogo surface="dark" />
            </Link>
            <Link
              to="/request-demo"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[#AEB4BC] transition-colors hover:text-[#F5F7FA]"
            >
              {t('archPage.demoLink')}
            </Link>
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 pt-14 lg:px-8 lg:pt-20">
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-success">
              {t('landing.archEyebrow')}
            </span>
            <h1 className="mt-4 max-w-3xl font-display text-[clamp(2rem,5vw,3.5rem)] font-bold uppercase leading-[0.95] tracking-tight text-[#F5F7FA]">
              {t('landing.archTitle')}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#C9CDD3]">
              {t('archPage.intro')}
            </p>
          </div>

          {/* Same diagram and copy as the landing page section. */}
          <div className="mt-8">
            <TwinArchitecture showHeading={false} showPageLink={false} />
          </div>

          {/* Per-area detail */}
          <section className="border-t border-white/10 bg-[#0A0A0A] py-20 lg:py-28">
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-success">
                {t('archPage.detailEyebrow')}
              </span>
              <h2 className="mt-4 font-display text-2xl font-bold uppercase tracking-tight text-[#F5F7FA] lg:text-3xl">
                {t('archPage.detailTitle')}
              </h2>
              <Accordion type="single" collapsible defaultValue="area-01" className="mt-12 border-t border-[#3A3A3A]">
                {detailAreas.map((area) => (
                  <AccordionItem key={area.number} value={`area-${area.number}`} className="border-[#3A3A3A]">
                    <AccordionTrigger className="min-h-16 gap-4 py-5 text-left text-[#F5F7FA] hover:no-underline">
                      <span className="flex min-w-0 items-center gap-4">
                        <span className="font-mono text-sm text-success">{area.number}</span>
                        <span className="font-display text-base font-semibold uppercase tracking-wide sm:text-lg">
                          {t(area.titleKey)}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-7 pl-10 pr-8 text-sm leading-relaxed text-[#C9CDD3] sm:pl-12">
                      {t(area.bodyKey)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <p className="mt-12 border-t border-[#3A3A3A] pt-6 font-mono text-xs uppercase tracking-[0.18em] text-[#AEB4BC]">
                {t('landing.archTruthNote')}
              </p>

              <div className="mt-14 flex flex-col gap-4 sm:flex-row">
                <Button
                  asChild
                  className="h-14 rounded-none bg-accent px-8 text-sm font-bold uppercase tracking-[0.16em] text-accent-foreground hover:bg-accent/90"
                >
                  <Link to="/sign-up">
                    {t('archPage.ctaPrimary')}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-14 rounded-none border-white/20 bg-transparent px-8 text-sm font-bold uppercase tracking-[0.16em] text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5F7FA]"
                >
                  <Link to="/request-demo">{t('archPage.ctaSecondary')}</Link>
                </Button>
              </div>
            </div>
          </section>
        </main>

        <TwinFooter />
      </div>
    </>
  );
}
