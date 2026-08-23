import { Routes, Route, Navigate } from 'react-router-dom';
import { RBACProvider, useRBAC } from '@/contexts/RBACContext';
import { ActiveTwinProvider } from '@/context/ActiveTwinContext';
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
 * bundle. Platform users and valid organization members share the normal AURA
 * shell, while route-level platform guards still distinguish the two authority
 * planes for administrative destinations.
 */
function ApprovedUserRouterContent() {
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

  if (resolution.status === 'internal' || resolution.status === 'tenant') {
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

  // Users with neither a platform grant nor an active organization membership
  // remain sealed inside the intentionally restricted pilot experience.
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

/**
 * Authentication/authorization and twin state are loaded only after App.tsx
 * has already established an approved authenticated session. This keeps the
 * anonymous marketing route out of the RBAC/twin data dependency graph.
 */
export default function ApprovedUserRouter() {
  return (
    <RBACProvider>
      <ActiveTwinProvider>
        <ApprovedUserRouterContent />
      </ActiveTwinProvider>
    </RBACProvider>
  );
}
