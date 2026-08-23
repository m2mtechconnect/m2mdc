import { Navigate } from 'react-router-dom';

/**
 * Compatibility route for the retired marketplace surface.
 * Connector discovery and provisioning are owned by AURA Connections.
 */
export default function Marketplace() {
  return <Navigate to="/manage/integrations?tab=catalogue" replace />;
}
