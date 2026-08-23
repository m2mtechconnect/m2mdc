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
      // The hero occupies almost the full first viewport. Do not request the
      // motion-heavy marketing body until the visitor has actually started to
      // scroll toward it.
      { rootMargin: '0px 0px -25% 0px', threshold: 0 },
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

/** Public, read-only marketing landing page for AURA DC. */
export default function DataCentreTwinLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground scroll-smooth">
      <Helmet>
        <link rel="canonical" href="https://auradc.m2mtechconnect.com/" />
        <meta property="og:url" content="https://auradc.m2mtechconnect.com/" />
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
