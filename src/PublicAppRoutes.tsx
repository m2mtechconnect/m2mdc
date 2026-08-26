import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import DataCentreTwinLanding from './pages/DataCentreTwinLanding';

const OverlayFixtures = import.meta.env.DEV
  ? lazy(() => import('./pages/test/OverlayFixtures'))
  : null;
const PublicDataCentreTwin = lazy(() => import('./pages/PublicDataCentreTwin'));
const TwinPreview = lazy(() => import('./pages/TwinPreview'));
const loadAuthPages = () => import('./pages/auth/index');
const SignIn = lazy(() => loadAuthPages().then((module) => ({ default: module.SignIn })));
const SignUp = lazy(() => loadAuthPages().then((module) => ({ default: module.SignUp })));
const SignOut = lazy(() => loadAuthPages().then((module) => ({ default: module.SignOut })));
const ForgotPassword = lazy(() => loadAuthPages().then((module) => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => loadAuthPages().then((module) => ({ default: module.ResetPassword })));
const MFA = lazy(() => loadAuthPages().then((module) => ({ default: module.MFA })));
const AuthCallback = lazy(() => loadAuthPages().then((module) => ({ default: module.AuthCallback })));
const ManagedUserReturn = lazy(() => import('@/pages/oauth/ManagedUserReturn'));
const InviteSignInRedirect = lazy(() =>
  import('@/routing/InviteSignInRedirect').then((module) => ({ default: module.InviteSignInRedirect })),
);

export const publicRouteFallback = (
  <div className="flex min-h-dvh items-center justify-center" role="status" aria-live="polite">
    <span className="text-sm text-muted-foreground">Loading experience…</span>
  </div>
);

export const withPublicRouteFallback = (element: ReactNode) => (
  <Suspense fallback={publicRouteFallback}>{element}</Suspense>
);

/**
 * Public entry routes.
 *
 * Account creation must never depend on a browser-local questionnaire flag.
 * The retired anonymous questionnaire cannot satisfy the authenticated
 * public-intake boundary, so /onboarding is a compatibility alias to account
 * creation. Product setup begins after authentication and approval.
 */
export default function PublicAppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DataCentreTwinLanding />} />
      <Route path="/auth" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={withPublicRouteFallback(<SignIn />)} />
      <Route path="/auth/callback" element={withPublicRouteFallback(<AuthCallback />)} />
      <Route path="/sign-in" element={<Navigate to="/login" replace />} />
      <Route path="/sign-up" element={withPublicRouteFallback(<SignUp />)} />
      <Route path="/onboarding" element={<Navigate to="/sign-up" replace />} />
      <Route path="/sign-out" element={withPublicRouteFallback(<SignOut />)} />
      <Route path="/forgot-password" element={withPublicRouteFallback(<ForgotPassword />)} />
      <Route path="/reset-password" element={withPublicRouteFallback(<ResetPassword />)} />
      <Route path="/mfa" element={withPublicRouteFallback(<MFA />)} />
      <Route path="/twin-datacentre" element={<DataCentreTwinLanding />} />
      <Route path="/data-centre-twin" element={withPublicRouteFallback(<PublicDataCentreTwin />)} />
      <Route path="/twin-preview" element={withPublicRouteFallback(<TwinPreview />)} />
      <Route path="/omniverse-scene" element={<Navigate to="/twin-preview" replace />} />
      <Route path="/oauth/managed-user/return" element={withPublicRouteFallback(<ManagedUserReturn />)} />
      <Route path="/invite/accept" element={withPublicRouteFallback(<InviteSignInRedirect />)} />
      {import.meta.env.DEV && OverlayFixtures ? <Route path="/dev-overlays" element={<OverlayFixtures />} /> : null}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}