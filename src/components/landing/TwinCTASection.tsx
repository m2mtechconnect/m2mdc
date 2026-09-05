/** Bottom CTA section. Loaded only with the deferred marketing body. */
import { Button } from '@/components/ui/button';
import { ArrowRight, Mail, Leaf, CheckCircle2, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export function TwinCTASection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const benefits = [t('landing.viewLiveDashboard'), t('landing.configureOwnTwin'), t('landing.runSimulations')];

  return (
    <>
      <section className="relative overflow-hidden bg-[#0A0A0A] py-24 lg:py-32">
        <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:40px_40px]" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid gap-12 border-t border-white/10 pt-12 lg:grid-cols-12 lg:gap-16"
          >
            <div className="lg:col-span-7">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-success">
                {t('landing.startYourJourney')}
              </span>
              <h2 className="mt-6 font-display text-[clamp(2rem,5vw,4rem)] font-bold uppercase leading-[0.95] tracking-tight text-[#F5F7FA]">
                {t('landing.readyToBuild')}{' '}
                <span className="text-[#AEB4BC]">{t('landing.sovereignTwinQuestion')}</span>
              </h2>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-[#C9CDD3] lg:text-lg">
                {t('landing.ctaDescription')}
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Button
                  size="lg"
                  className="group h-14 rounded-none bg-accent px-10 text-xs font-semibold uppercase tracking-[0.2em] text-accent-foreground hover:bg-accent/90"
                  onClick={() => navigate('/sign-up')}
                >
                  {t('landing.startBuildingTwin')}
                  <ArrowRight className="ml-3 h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-none border-white/20 bg-transparent px-10 text-xs font-semibold uppercase tracking-[0.2em] text-[#F5F7FA] hover:border-accent hover:bg-transparent hover:text-accent"
                  onClick={() => navigate('/request-demo')}
                >
                  <Play className="mr-3 h-4 w-4" aria-hidden="true" />
                  {t('landing.watchDemo')}
                </Button>
              </div>
              <a
                href="mailto:info@m2mtechconnect.com"
                className="mt-8 inline-flex items-center gap-2 text-sm text-[#AEB4BC] transition-colors hover:text-[#F5F7FA]"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                {t('landing.orTalkToTeam')}
              </a>
            </div>

            <div className="lg:col-span-5">
              <ul className="divide-y divide-white/10 border-y border-white/10">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3 py-4 text-sm text-[#C9CDD3]">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                    <span>{benefit}</span>
                  </li>
                ))}
                <li className="flex items-center gap-3 py-4 text-sm text-[#C9CDD3]">
                  <Leaf className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <span>{t('landing.carbonNeutralInfra')}</span>
                </li>
                <li className="flex items-center gap-3 py-4 text-sm text-[#C9CDD3]">
                  <span aria-hidden="true">🇨🇦</span>
                  <span>{t('landing.canadianDataSovereignty')}</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
