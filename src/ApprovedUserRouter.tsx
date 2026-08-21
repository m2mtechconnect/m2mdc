import { Routes, Route, Navigate } from 'react-router-dom';
import { useRBAC } from '@/contexts/RBACContext';
import BoundedLoading from '@/components/shared/BoundedLoading';
import AuthorizationError from './pages/AuthorizationError';
import PilotShell from './pilot/PilotShell';
import AuthenticatedShell from './AuthenticatedShell';
import { SignOut } from './pages/auth/index';
import ManagedUserReturn from '@/pages/oauth/ManagedUserReturn';
import InviteAccept from './pages/InviteAccept';
import { MANAGED_USER_RETURN_PATH } from '@/connections/managedUserBinding';

/**
 * Approved-user routing is intentionally isolated from the anonymous landing
 * bundle. AuthenticatedShell remains a synchronous import inside this module:
 * route-level lazy pages can therefore resolve against a stable shell without
 * reintroducing the nested Suspense retry failure documented in App.tsx.
 */
export default function ApprovedUserRouter() {
  const { resolution } = useRBAC();

  if (resolution.status === 'loading') {
    return <BoundedLoading stage="authorization" />;
  }

  // Lookup FAILURE must not silently downgrade to the pilot shell.
  if (resolution.status === 'error') {
    return (
      <Routes>
        <Route path="/sign-out" element={<SignOut />} />
        <Route path="*" element={<AuthorizationError />} />
      </Routes>
    );
  }

  if (resolution.status === 'internal') {
    return (
      <Routes>
        <Route path="/pilot/*" element={<PilotShell />} />
        <Route path="/sign-out" element={<SignOut />} />
        <Route path={MANAGED_USER_RETURN_PATH} element={<ManagedUserReturn />} />
        <Route path="/invite/accept" element={<InviteAccept />} />
        <Route path="/*" element={<AuthenticatedShell />} />
      </Routes>
    );
  }

  // Restricted pilot / customer user - sealed inside /pilot/*.
  return (
    <Routes>
      <Route path="/pilot/*" element={<PilotShell />} />
      <Route path="/sign-out" element={<SignOut />} />
      <Route path={MANAGED_USER_RETURN_PATH} element={<ManagedUserReturn />} />
      <Route path="/invite/accept" element={<InviteAccept />} />
      <Route path="*" element={<Navigate to="/pilot/overview" replace />} />
    </Routes>
  );
}
