/**
 * TwinHero - public AURA DC landing hero (technical editorial direction).
 *
 * Full-bleed graphite surface, oversized left-aligned editorial headline,
 * hairline instrument strip and an edge-bleeding product frame.
 *
 * The first paint is intentionally static and compositor-friendly. Decorative
 * video is a post-interaction enhancement so performance audits and anonymous
 * visitors never download the 30+ MB asset on the critical path.
 */
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
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

  const instruments = [
    { value: "1.28", label: t('landing.avgPueAchieved') },
    { value: "89%", label: t('landing.gpuUtilization') },
    { value: "28", label: t('landing.gco2KwhAvg') },
    { value: "50+", label: t('landing.enterprises') },
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
      <section className="relative overflow-hidden bg-[#0A0A0A] pt-28 lg:pt-32">
        <div className="absolute inset-0 z-0" aria-hidden="true">
          {showVideo && (
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="none"
              width={1920}
              height={1080}
              className="absolute inset-0 h-full w-full object-cover opacity-45"
            >
              <source src={HERO_VIDEO_URL} type="video/mp4" />
            </video>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/70 via-[#0A0A0A]/85 to-[#0A0A0A]" />

          <div
            className="absolute inset-0"
            style={{
              backgroundSize: '40px 40px',
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)',
            }}
          />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-16 lg:px-8 lg:pb-24">
          <span className="inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.28em] text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
            {t('landing.enterpriseDigitalTwinPlatform')}
          </span>

          <h1 className="mt-6 font-display text-[clamp(2.5rem,7vw,6.5rem)] font-bold uppercase leading-[0.9] tracking-tight text-[#F5F7FA]">
            {t('landing.heroHeadline1')}{' '}
            <span className="inline-block border-b-4 border-accent pb-1 text-[#AEB4BC]">
              {t('landing.heroHeadline2')}
            </span>
          </h1>

          <div className="mt-12 grid gap-12 md:grid-cols-12 md:items-end">
            <div className="md:col-span-5">
              <p className="max-w-md text-lg leading-relaxed text-[#C9CDD3] lg:text-xl">
                {t('landing.heroDescription')}
              </p>

              <ul className="mt-8 space-y-2.5">
                {quickBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3 text-sm text-[#AEB4BC]">
                    <span className="h-px w-5 bg-success" aria-hidden="true" />
                    {benefit}
                  </li>
                ))}
              </ul>

              <div className="mt-10 flex flex-wrap items-center gap-6">
                <Button
                  size="lg"
                  className="group h-14 rounded-none bg-accent px-8 text-sm font-bold uppercase tracking-[0.16em] text-accent-foreground hover:bg-accent/90"
                  onClick={() => navigate("/onboarding")}
                >
                  {t('landing.getStartedFree')}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Button>
                <button
                  type="button"
                  className="group flex items-center gap-3 text-[#F5F7FA]"
                  onClick={() => setDemoOpen(true)}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 transition-colors group-hover:border-success group-hover:bg-white/5">
                    <Play className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-medium uppercase tracking-[0.2em]">{t('landing.watchDemo')}</span>
                </button>
              </div>
            </div>

            <div className="md:col-span-7">
              <div className="relative overflow-hidden border border-white/10 bg-[#1E1E1E] shadow-2xl">
                <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
                  <span className="h-2 w-2 rounded-full bg-success/50" aria-hidden="true" />
                  <span className="h-2 w-2 rounded-full bg-white/10" aria-hidden="true" />
                  <span className="h-2 w-2 rounded-full bg-white/10" aria-hidden="true" />
                  <span className="ml-3 font-mono text-[11px] text-[#AEB4BC]">
                    twin-studio.m2mtechconnect.com/dashboard
                  </span>
                </div>
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={`/landing/screenshots/simulation-desktop.webp?v=${encodeURIComponent(screenshotManifest.version)}`}
                    alt="AURA scenario simulation running a GPU spike scenario with the 3D data hall, PUE, utilisation and carbon intensity"
                    width={1440}
                    height={900}
                    decoding="async"
                    className="h-full w-full object-cover object-top"
                    loading="eager"
                    // React 18 DOM does not recognize camelCase `fetchPriority`
                    // (React 19 API); it must reach the DOM as the lowercase
                    // attribute or React emits a console.error per mount, which
                    // fails the truth suite's console-cleanliness assertions.
                    {...{ fetchpriority: 'high' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <dl className="mt-16 grid grid-cols-2 gap-px border-t border-white/10 bg-white/10 md:grid-cols-4">
            {instruments.map((item) => (
              <div key={item.label} className="bg-[#0A0A0A] px-5 py-6">
                <dt className="text-xs uppercase tracking-[0.18em] text-[#AEB4BC]">{item.label}</dt>
                <dd className="mt-2 font-mono text-3xl text-[#F5F7FA]">{item.value}</dd>
              </div>
            ))}
          </dl>
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
