import { Navigate } from 'react-router-dom';

/** Production compatibility tombstone for a retired demonstration route. */
export default function FundingIntakeDemo() {
  return <Navigate to="/dashboard" replace />;
}
