/**
 * TwinHero - public AURA DC landing hero.
 *
 * The first paint is intentionally static and compositor-friendly. Decorative
 * video is a post-interaction enhancement so performance audits and anonymous
 * visitors never download the 30+ MB asset on the critical path.
 */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, CheckCircle2, Sparkles, TrendingUp, Zap, Leaf, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { screenshotManifest } from "@/data/studioScreenshots";
import { useTranslation } from "react-i18next";

const LazyLoomDemoModal = lazy(() =>
  import("./LoomDemoModal").then((module) => ({ default: module.LoomDemoModal })),
);

export function TwinHero() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [demoOpen, setDemoOpen] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const powerStats = [
    { value: "1.28", label: t('landing.avgPueAchieved'), icon: TrendingUp, color: "text-success" },
    { value: "89%", label: t('landing.gpuUtilization'), icon: Zap, color: "text-warning" },
    { value: "28", label: t('landing.gco2KwhAvg'), icon: Leaf, color: "text-success" },
    { value: "50+", label: t('landing.enterprises'), icon: Building2, color: "text-primary" },
  ];

  const quickBenefits = [
    t('landing.canadianSovereignty'),
    t('landing.realtimeKpi'),
    t('landing.scenarioSimulation'),
  ];

  // Never start the decorative video from an idle callback: performance audits
  // can observe idle work and pull the 30+ MB asset into the initial network
  // dependency tree. A real interaction opts in instead.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(min-width: 768px)');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const saveData = conn?.saveData === true;
    const slow = conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g';
    if (!mql.matches || reduceMotion || saveData || slow) return;

    const revealVideo = () => setShowVideo(true);
    window.addEventListener('pointerdown', revealVideo, { once: true, passive: true });
    window.addEventListener('keydown', revealVideo, { once: true });
    return () => {
      window.removeEventListener('pointerdown', revealVideo);
      window.removeEventListener('keydown', revealVideo);
    };
  }, []);

  return (
    <>
      <section className="relative min-h-[95vh] flex items-center overflow-hidden bg-background">
        {/* The product screenshot below is the sole high-priority hero image. */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/10 via-background to-success/5">
          {showVideo && (
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="none"
              poster="/landing/hero-datacenter-bg.jpg"
              width={1920}
              height={1080}
              className="absolute inset-0 h-full w-full object-cover opacity-30"
            >
              <source src="/landing/hero-datacenter.mp4" type="video/mp4" />
            </video>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/65 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-background/70" />
        </div>

        {/* Static mesh avoids pointer-driven getBoundingClientRect/layout work. */}
        <div className="absolute inset-0 z-[1] pointer-events-none" aria-hidden="true">
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.02]" />
          <div className="absolute -right-[10%] -top-[20%] h-[70%] w-[60%] rounded-full bg-gradient-to-bl from-primary/10 via-primary/5 to-transparent blur-3xl" />
          <div className="absolute -bottom-[20%] -left-[10%] h-[60%] w-[50%] rounded-full bg-gradient-to-tr from-success/8 via-success/3 to-transparent blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 py-16 lg:py-24 w-full">
          <div className="flex flex-wrap justify-center gap-6 lg:gap-10 mb-12">
            {powerStats.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-3 rounded-full border border-border/30 bg-card/40 px-4 py-2 backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5"
              >
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className={`text-lg font-bold ${stat.color}`}>{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="mb-6">
              <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5 px-4 py-1.5 text-sm font-medium">
                <Sparkles className="h-3.5 w-3.5 mr-2" />
                {t('landing.enterpriseDigitalTwinPlatform')}
              </Badge>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-[1.1] tracking-tight mb-6">
              {t('landing.heroHeadline1')}{" "}
              <span className="relative inline-block">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-m2m-gold-dark to-accent">
                  {t('landing.heroHeadline2')}
                </span>
                <span className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-to-r from-accent to-m2m-gold-dark rounded-full" />
              </span>
            </h1>

            <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-8">
              {t('landing.heroDescription')}
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-10">
              {quickBenefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
              <Button
                size="lg"
                className="text-base px-10 h-14 group relative overflow-hidden transition-all duration-300 bg-accent text-m2m-black hover:bg-m2m-gold-dark hover:shadow-2xl hover:shadow-accent/30"
                onClick={() => navigate("/onboarding")}
              >
                <span className="relative z-10 flex items-center font-semibold">
                  {t('landing.getStartedFree')}
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-10 h-14 border-border text-foreground hover:bg-muted/80 transition-all duration-300"
                onClick={() => setDemoOpen(true)}
              >
                <Play className="mr-2 h-5 w-5" />
                {t('landing.watchDemo')}
              </Button>
            </div>
          </div>

          <div className="relative max-w-5xl mx-auto">
            <div className="relative bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm rounded-2xl lg:rounded-3xl border border-border/40 p-2 shadow-2xl shadow-black/20 transition-transform duration-300 hover:scale-[1.005]">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-muted/30 rounded-t-xl lg:rounded-t-2xl">
                <div className="flex gap-1.5" aria-hidden="true">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-background/60 rounded-lg px-4 py-1.5 text-xs text-muted-foreground text-center max-w-sm mx-auto border border-border/30">
                    twin-studio.m2mtechconnect.com/dashboard
                  </div>
                </div>
              </div>
              <div className="aspect-[16/9] bg-gradient-to-br from-muted/80 via-muted/50 to-background rounded-b-xl lg:rounded-b-2xl overflow-hidden relative">
                <img
                  src={`/landing/screenshots/dashboard-desktop.webp?v=${encodeURIComponent(screenshotManifest.version)}`}
                  alt="M2M Digital Twin Dashboard showing 3D rack visualization, PUE metrics, GPU utilization, and carbon intensity KPIs"
                  width={1564}
                  height={879}
                  {...({ fetchpriority: 'high' } as Record<string, string>)}
                  decoding="async"
                  className="w-full h-full object-cover object-top"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>

            <div className="absolute -bottom-6 -left-6 bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-4 shadow-xl hidden sm:block">
              <div className="text-3xl font-bold text-success">6,970</div>
              <div className="text-xs text-muted-foreground">{t('landing.hoursSavedMonthly')}</div>
            </div>

            <div className="absolute -top-6 -right-6 bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-4 shadow-xl hidden sm:block">
              <div className="text-3xl font-bold text-primary">+32%</div>
              <div className="text-xs text-muted-foreground">{t('landing.efficiencyGains')}</div>
            </div>

            <div className="absolute top-1/2 -right-8 -translate-y-1/2 bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-3 shadow-lg hidden xl:block">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="text-xs font-medium text-foreground">{t('landing.liveMonitoring')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {demoOpen && (
        <Suspense fallback={null}>
          <LazyLoomDemoModal open={demoOpen} onOpenChange={setDemoOpen} />
        </Suspense>
      )}
    </>
  );
}
