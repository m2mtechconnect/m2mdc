import { Navigate } from 'react-router-dom';

/**
 * The legacy twin-debug screen is retired from the production application.
 * Reintroduce debugging only as an explicitly DEV-gated internal tool.
 */
export default function TwinDebug() {
  return <Navigate to="/dashboard" replace />;
}
