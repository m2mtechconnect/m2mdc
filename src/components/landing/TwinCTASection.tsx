/** Bottom CTA section. Loaded only with the deferred marketing body. */
import { lazy, Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Mail, Sparkles, Leaf, CheckCircle2, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const LazyLoomDemoModal = lazy(() =>
  import('./LoomDemoModal').then((module) => ({ default: module.LoomDemoModal })),
);

export function TwinCTASection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [demoOpen, setDemoOpen] = useState(false);
  const benefits = [t('landing.viewLiveDashboard'), t('landing.configureOwnTwin'), t('landing.runSimulations')];

  return (
    <>
      <section className="relative py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/50 via-muted/30 to-background" />
        <motion.div className="absolute top-1/4 left-1/4 w-80 h-80 bg-primary/8 rounded-full blur-3xl" animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.12, 0.08] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-success/6 rounded-full blur-3xl" animate={{ scale: [1, 1.3, 1], opacity: [0.06, 0.1, 0.06] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }} />
        <div className="relative max-w-5xl mx-auto px-4 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="bg-card/60 backdrop-blur-sm rounded-3xl border border-border/50 p-8 lg:p-12 shadow-xl">
            <div className="text-center max-w-3xl mx-auto">
              <div className="w-16 h-1 bg-gradient-to-r from-primary to-success mx-auto mb-8 rounded-full" />
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 mb-6">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="text-sm text-primary font-medium">{t('landing.startYourJourney')}</span>
              </span>
              <h2 className="font-display text-3xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
                {t('landing.readyToBuild')}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-m2m-gold-dark whitespace-nowrap">{t('landing.sovereignTwinQuestion')}</span>
              </h2>
              <p className="text-lg lg:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">{t('landing.ctaDescription')}</p>
              <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
                <Button size="lg" className="text-base px-10 h-14 group bg-accent text-m2m-black font-semibold hover:bg-m2m-gold-dark shadow-xl shadow-accent/20 hover:shadow-accent/30 transition-shadow" onClick={() => navigate('/onboarding')}>
                  {t('landing.startBuildingTwin')}<ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Button>
                <Button size="lg" variant="outline" className="text-base px-10 h-14 border-border text-foreground hover:bg-muted" onClick={() => setDemoOpen(true)}>
                  <Play className="mr-2 h-5 w-5" aria-hidden="true" />{t('landing.watchDemo')}
                </Button>
              </div>
              <div className="mb-8">
                <a href="mailto:info@m2mtechconnect.com" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Mail className="h-4 w-4" aria-hidden="true" />{t('landing.orTalkToTeam')}
                </a>
              </div>
              <div className="flex flex-wrap justify-center gap-6">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" /><span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
          <div className="mt-12 pt-8 border-t border-border/30">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Leaf className="h-4 w-4 text-success" aria-hidden="true" /><span>{t('landing.carbonNeutralInfra')}</span></div>
              <div className="hidden sm:block w-px h-4 bg-border" aria-hidden="true" />
              <div className="flex items-center gap-2"><span aria-hidden="true">🇨🇦</span><span>{t('landing.canadianDataSovereignty')}</span></div>
            </div>
          </div>
        </div>
      </section>
      {demoOpen ? (
        <Suspense fallback={null}>
          <LazyLoomDemoModal open={demoOpen} onOpenChange={setDemoOpen} />
        </Suspense>
      ) : null}
    </>
  );
}
