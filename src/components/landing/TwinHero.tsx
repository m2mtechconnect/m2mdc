/**
 * TwinHero - Hero section for Data Centre Twin landing page
 * Premium enterprise design with center-aligned layout, power stats, and real product screenshots
 * Uses M2M brand design tokens from index.css
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, CheckCircle2, Sparkles, TrendingUp, Zap, Leaf, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { lazy, Suspense, useRef, useEffect, useState } from "react";
import { screenshotManifest } from "@/data/studioScreenshots";
import { useTranslation } from "react-i18next";

const LazyLoomDemoModal = lazy(() =>
  import("./LoomDemoModal").then((module) => ({ default: module.LoomDemoModal })),
);

export function TwinHero() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [demoOpen, setDemoOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
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
  
  // Mouse follow effect for premium parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
        const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
        mouseX.set(x * 20);
        mouseY.set(y * 20);
        setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // The background video is a progressive enhancement. A browser-idle
  // callback can fire during Lighthouse's measurement window and start a
  // 30+ MB transfer, so only opt in after genuine user interaction.
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
    <section 
      ref={containerRef}
      className="relative min-h-[95vh] flex items-center overflow-hidden bg-background"
    >
      {/* Video background */}
      <div className="absolute inset-0 z-0">
        {/* LCP poster - always painted first */}
        <img
          src="/landing/hero-datacenter-bg.jpg"
          alt=""
          aria-hidden="true"
          width={1920}
          height={1080}
          {...({ fetchpriority: 'high' } as Record<string, string>)}
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        {showVideo && (
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="none"
            poster="/landing/hero-datacenter-bg.jpg"
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          >
            <source src="/landing/hero-datacenter.mp4" type="video/mp4" />
          </video>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-background/70" />
      </div>

      {/* Premium animated gradient mesh background */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.02]" />
        <motion.div 
          className="absolute w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none"
          style={{ left: mousePosition.x - 300, top: mousePosition.y - 300 }}
          animate={{ opacity: [0.03, 0.06, 0.03] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div 
          className="absolute top-0 right-0 w-[60%] h-[70%] bg-gradient-to-bl from-primary/8 via-primary/5 to-transparent rounded-full blur-3xl"
          style={{ x: springX, y: springY }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.08, 0.12, 0.08] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-0 left-0 w-[50%] h-[60%] bg-gradient-to-tr from-success/6 via-success/3 to-transparent rounded-full blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.06, 0.1, 0.06], y: [0, -20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <motion.div 
          className="absolute top-1/3 left-1/3 w-64 h-64 bg-info/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.08, 0.05] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        />
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 py-16 lg:py-24 w-full">
        {/* Power Stats Bar */}
        <motion.div 
          className="flex flex-wrap justify-center gap-6 lg:gap-10 mb-12"
        >
          {powerStats.map((stat) => (
            <motion.div 
              key={stat.label}
              className="flex items-center gap-3 px-4 py-2 rounded-full bg-card/40 backdrop-blur-sm border border-border/30"
              whileHover={{ scale: 1.05, y: -2 }}
            >
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className={`text-lg font-bold ${stat.color}`}>{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Center-aligned hero content */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <motion.div className="mb-6">
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5 px-4 py-1.5 text-sm font-medium">
              <Sparkles className="h-3.5 w-3.5 mr-2" />
              {t('landing.enterpriseDigitalTwinPlatform')}
            </Badge>
          </motion.div>
          
          <motion.h1 
            className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-[1.1] tracking-tight mb-6"
          >
            {t('landing.heroHeadline1')}{" "}
            <span className="relative inline-block">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-m2m-gold-dark to-accent">
                {t('landing.heroHeadline2')}
              </span>
              <motion.span 
                className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-to-r from-accent to-m2m-gold-dark rounded-full"
              />
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-8"
          >
            {t('landing.heroDescription')}
          </motion.p>

          {/* Quick benefits */}
          <motion.div 
            className="flex flex-wrap justify-center gap-4 mb-10"
          >
            {quickBenefits.map((benefit) => (
              <motion.div 
                key={benefit}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>{benefit}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row justify-center gap-4 mb-10"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
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
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-base px-10 h-14 border-border text-foreground hover:bg-muted/80 transition-all duration-300"
                onClick={() => setDemoOpen(true)}
              >
                <Play className="mr-2 h-5 w-5" />
                {t('landing.watchDemo')}
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Hero visual */}
        <motion.div 
          className="relative max-w-5xl mx-auto"
          style={{ x: springX, y: springY }}
        >
          <motion.div 
            className="relative bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm rounded-2xl lg:rounded-3xl border border-border/40 p-2 shadow-2xl shadow-black/20"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-muted/30 rounded-t-xl lg:rounded-t-2xl">
              <div className="flex gap-1.5">
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
                className="w-full h-full object-cover object-top"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent pointer-events-none" />
            </div>
          </motion.div>

          {/* Floating stat cards */}
          <motion.div 
            className="absolute -bottom-6 -left-6 bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-4 shadow-xl"
            whileHover={{ scale: 1.05, y: -4 }}
            style={{ x: useTransform(springX, v => v * -0.5), y: useTransform(springY, v => v * -0.5) }}
          >
            <div className="text-3xl font-bold text-success">6,970</div>
            <div className="text-xs text-muted-foreground">{t('landing.hoursSavedMonthly')}</div>
          </motion.div>
          
          <motion.div 
            className="absolute -top-6 -right-6 bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-4 shadow-xl"
            whileHover={{ scale: 1.05, y: 4 }}
            style={{ x: useTransform(springX, v => v * 0.5), y: useTransform(springY, v => v * 0.5) }}
          >
            <div className="text-3xl font-bold text-primary">+32%</div>
            <div className="text-xs text-muted-foreground">{t('landing.efficiencyGains')}</div>
          </motion.div>

          <motion.div 
            className="absolute top-1/2 -right-8 transform -translate-y-1/2 bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-3 shadow-lg hidden xl:block"
            whileHover={{ scale: 1.05 }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-medium text-foreground">{t('landing.liveMonitoring')}</span>
            </div>
          </motion.div>
        </motion.div>
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
