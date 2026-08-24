import { lazy, Suspense } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from 'next-themes';
import PublicAppRoutes, { publicRouteFallback } from './PublicAppRoutes';

const AuthenticatedSessionApp = lazy(() => import('./AuthenticatedSessionApp'));
const RuntimeAppProviders = lazy(() => import('./RuntimeAppProviders'));

/**
 * Supabase browser sessions are persisted under an sb-*-auth-token key. Reading
 * the key is not an authorization decision; it only decides whether importing
 * the full auth client can possibly be useful. The auth client still validates
 * the session before any protected route is rendered.
 */
function hasPersistedSessionCandidate(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      const isSupabaseSession = key.startsWith('sb-') && key.endsWith('-auth-token');
      const isLegacySession = key === 'supabase.auth.token';
      if (!isSupabaseSession && !isLegacySession) continue;
      const value = window.localStorage.getItem(key);
      if (value && value !== 'null' && value !== 'undefined') return true;
    }
  } catch {
    // Storage can be unavailable in hardened browser modes. Protected routes
    // still load the auth bundle and fail closed.
  }
  return false;
}

const PUBLIC_PATHS = new Set([
  '/',
  '/auth',
  '/login',
  '/auth/callback',
  '/sign-in',
  '/sign-up',
  '/sign-out',
  '/forgot-password',
  '/mfa',
  '/twin-datacentre',
  '/data-centre-twin',
  '/twin-preview',
  '/omniverse-scene',
  '/onboarding',
  '/oauth/managed-user/return',
  '/invite/accept',
  ...(import.meta.env.DEV ? ['/dev-overlays'] : []),
]);

function RouteEntry() {
  const { pathname, search, hash } = useLocation();
  const persistedSession = hasPersistedSessionCandidate();
  const bareMarketingLanding =
    !persistedSession && (pathname === '/' || pathname === '/twin-datacentre');

  // The anonymous marketing page does not use React Query, toast infrastructure,
  // tooltips, RBAC, active-twin state or Supabase. Keep all of those out of its
  // initial dependency graph.
  if (bareMarketingLanding) return <PublicAppRoutes />;

  const protectedEntry = !PUBLIC_PATHS.has(pathname);
  const needsSessionResolution = persistedSession || protectedEntry;
  const returnTo = `${pathname}${search}${hash}`;

  return (
    <Suspense fallback={publicRouteFallback}>
      <RuntimeAppProviders>
        {needsSessionResolution ? (
          <AuthenticatedSessionApp protectedEntry={protectedEntry} returnTo={returnTo} />
        ) : (
          <PublicAppRoutes />
        )}
      </RuntimeAppProviders>
    </Suspense>
  );
}

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {/* Honour the OS "reduce motion" setting for Framer Motion animations,
          which run through the Web Animations API and are not covered by the
          global prefers-reduced-motion CSS rule in index.css. */}
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <RouteEntry />
        </BrowserRouter>
      </MotionConfig>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
