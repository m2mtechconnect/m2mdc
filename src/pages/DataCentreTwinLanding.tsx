import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { SkipToContent, MAIN_CONTENT_ID } from '@/components/a11y/SkipToContent';
import { Helmet } from 'react-helmet-async';
import { TwinHeader } from '@/components/landing/TwinHeader';
import { TwinHero } from '@/components/landing/TwinHero';

const DeferredLandingContent = lazy(() => import('@/components/landing/DeferredLandingContent'));

function DeferredMarketingBody() {
  const triggerRef = useRef<HTMLDivElement>(null);
  const pendingAnchorRef = useRef<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const scrollToPendingAnchor = useCallback(() => {
    const id = pendingAnchorRef.current;
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    pendingAnchorRef.current = null;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const requestAnchor = useCallback((id: string) => {
    const existing = document.getElementById(id);
    if (existing) {
      existing.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    pendingAnchorRef.current = id;
    setMounted(true);
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) requestAnchor(hash);

    const onRequest = (event: Event) => {
      const custom = event as CustomEvent<string>;
      if (custom.detail) requestAnchor(custom.detail);
    };
    window.addEventListener('aura:landing-body-request', onRequest as EventListener);
    return () => window.removeEventListener('aura:landing-body-request', onRequest as EventListener);
  }, [requestAnchor]);

  useEffect(() => {
    if (mounted || !triggerRef.current) return;
    if (!('IntersectionObserver' in window)) {
      setMounted(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setMounted(true);
        observer.disconnect();
      },
      // Preload the marketing body well before the visitor reaches it. A
      // negative bottom margin previously kept the trigger outside the
      // intersection zone while the body was unmounted, so the page never
      // grew taller than the hero and scrolling was impossible (stuck hero).
      { rootMargin: '0px 0px 600px 0px', threshold: 0 },
    );
    observer.observe(triggerRef.current);
    return () => observer.disconnect();
  }, [mounted]);

  return (
    <>
      <div ref={triggerRef} aria-hidden="true" className="h-px w-full" />
      {mounted ? (
        <Suspense
          fallback={(
            <div className="flex min-h-32 items-center justify-center" role="status" aria-live="polite">
              <span className="text-sm text-muted-foreground">Loading platform capabilities…</span>
            </div>
          )}
        >
          <DeferredLandingContent onReady={scrollToPendingAnchor} />
        </Suspense>
      ) : null}
    </>
  );
}

/**
 * FAQ structured data. Mirrors the visible answers rendered by TwinFAQ and
 * states the platform's truth semantics: no live telemetry, no vendor runtime.
 */
const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      q: 'Is AURA showing live data from my facility?',
      a: 'No. AURA has no live telemetry sources connected today. Every operational number you see is simulated or replayed, and it is labelled that way in the interface.',
    },
    {
      q: 'What is the difference between configured, connected and verified?',
      a: 'Configured means a system is described in the blueprint. Connected means a link exists. Verified means evidence was checked and recorded. AURA never collapses these into a single green state.',
    },
    {
      q: 'Does AURA integrate with NVIDIA Omniverse or DSX?',
      a: 'No. AURA is a DSX-aligned architecture rendered by its own web runtime. No NVIDIA runtime component is deployed, and none is claimed.',
    },
    {
      q: 'Can I use it for a new AI factory build, not just an existing hall?',
      a: 'Yes. Most teams start in the blueprint before racks exist, then run scenarios against the design.',
    },
    {
      q: 'What can I do in a free account?',
      a: 'Create a facility blueprint, run the scenario library against it, and read the KPI impact. No production connection is required.',
    },
    {
      q: 'How is AURA architected?',
      a: 'Four connected areas: a facility blueprint as the single source of truth, power, cooling, thermal and carbon engines, a scenario simulator, and operational views with provenance-labelled KPIs.',
    },
  ].map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

/** Public, read-only marketing landing page for AURA DC. */
export default function DataCentreTwinLanding() {
  return (
    <div className="aura-marketing min-h-screen bg-background text-foreground scroll-smooth">
      <Helmet>
        <link rel="canonical" href="https://auradc.m2mtechconnect.com/" />
        <meta property="og:url" content="https://auradc.m2mtechconnect.com/" />
        <script type="application/ld+json">{JSON.stringify(FAQ_JSON_LD)}</script>
      </Helmet>

      <SkipToContent />
      <TwinHeader />
      <main id={MAIN_CONTENT_ID}>
        <div className="pt-16 lg:pt-20">
          <TwinHero />
        </div>
        <DeferredMarketingBody />
      </main>
    </div>
  );
}
