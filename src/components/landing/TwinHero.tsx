/**
 * TwinHero - public AURA DC landing hero (hayden.ai-inspired direction).
 *
 * Full-bleed digital-twin video behind a single oversized editorial headline,
 * one short description and one primary action. Deliberately minimal: no
 * embedded screenshots, stats strips or checklists in the hero.
 *
 * The first paint is intentionally static and compositor-friendly. Decorative
 * video is a post-interaction enhancement so performance audits and anonymous
 * visitors never download the multi-MB asset on the critical path.
 */
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";

/** AURA hero footage (CDN asset). User-supplied, verified free of third-party logos. */
const HERO_VIDEO_URL = "/__l5e/assets-v1/8f33396c-f1c0-426b-b231-3ea14276a02a/aura-hero-twin.mp4";


export function TwinHero() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showVideo, setShowVideo] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const videoY = useSpring(useTransform(scrollYProgress, [0, 1], [0, 90]), {
    stiffness: 120,
    damping: 30,
    mass: 0.4,
  });

  // Never start the decorative video from an idle callback: performance audits
  // can observe idle work and pull the multi-MB asset into the initial network
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
    // Reveal shortly after the page has settled so the hero is never a blank
    // black frame, while keeping the asset off the critical render path.
    const timer = window.setTimeout(revealVideo, 1200);
    window.addEventListener('pointerdown', revealVideo, { once: true, passive: true });
    window.addEventListener('keydown', revealVideo, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', revealVideo);
      window.removeEventListener('keydown', revealVideo);
    };
  }, []);


  return (
    <>
      <section ref={heroRef} className="relative overflow-hidden bg-[#0A0A0A]">
        <div className="absolute inset-0 z-0" aria-hidden="true">
          {showVideo && (
            <motion.video
              autoPlay
              loop
              muted
              playsInline
              preload="none"
              width={1280}
              height={680}
              className="absolute -top-[8%] left-0 h-[116%] w-full object-cover opacity-60"
              style={prefersReducedMotion ? undefined : { y: videoY }}
            >
              <source src={HERO_VIDEO_URL} type="video/mp4" />
            </motion.video>
          )}
          {/* Legibility scrims: darken left/bottom so copy always reads over footage */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/90 via-[#0A0A0A]/55 to-[#0A0A0A]/25" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/60 via-transparent to-[#0A0A0A]" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[calc(92svh-4rem)] w-full max-w-7xl flex-col justify-end px-4 pb-16 pt-24 sm:pb-20 sm:pt-36 lg:min-h-[calc(92vh-5rem)] lg:px-8 lg:pb-28">
          <span className="inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.28em] text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
            {t('landing.enterpriseDigitalTwinPlatform')}
          </span>

          <h1 className="mt-6 max-w-5xl font-display text-[clamp(2.5rem,7vw,6.5rem)] font-bold uppercase leading-[0.9] tracking-tight text-[#F5F7FA]">
            {t('landing.heroHeadline1')}{' '}
            <span className="inline-block border-b-4 border-accent pb-1 text-[#AEB4BC]">
              {t('landing.heroHeadline2')}
            </span>
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[#C9CDD3] lg:text-xl">
            {t('landing.heroDescription')}
          </p>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#AEB4BC]">
            {t('landing.idealBuyer')}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Button
              size="lg"
              className="group h-14 rounded-none bg-accent px-8 text-sm font-bold uppercase tracking-[0.16em] text-accent-foreground hover:bg-accent/90"
              onClick={() => navigate("/sign-up")}
            >
              {t('landing.getStartedFree')}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Button>
            <button
              type="button"
              className="group flex items-center gap-3 text-[#F5F7FA]"
              onClick={() => navigate("/request-demo")}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 transition-colors group-hover:border-success group-hover:bg-white/5">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-xs font-medium uppercase tracking-[0.2em]">{t('landing.watchDemo')}</span>
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
