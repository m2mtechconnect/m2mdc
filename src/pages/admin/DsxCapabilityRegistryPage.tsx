/**
 * Admin-only DSX capability registry view.
 *
 * Read-only by design: capability status is source-controlled and reviewed,
 * so no UI path can promote a capability to NVIDIA_INTEGRATED or
 * SIMREADY_VALIDATED. Non-admins never reach the data.
 */
import { useEffect } from 'react';
import { useRBAC } from '@/contexts/RBACContext';
import {
  DSX_CAPABILITIES,
  DSX_STATUSES,
  DSX_STATUS_LABEL,
  capabilityCountsByStatus,
  validateRegistry,
} from '@/config/dsxCapabilityRegistry';
import { allowedClaimsFor, prohibitedClaimsFor } from '@/config/dsxClaimsPolicy';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DsxCapabilityRegistryPage() {
  const { can, loading } = useRBAC();
  const authorized = can('platform.view_admin_console');
  const counts = capabilityCountsByStatus();
  const problems = validateRegistry();

  useEffect(() => {
    document.title = 'DSX capability registry | AURA admin';
  }, []);

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Checking authorization...</p>;
  }

  if (!authorized) {
    return (
      <div className="p-6" data-testid="dsx-registry-forbidden">
        <h1 className="text-lg font-semibold text-foreground">Not authorized</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The DSX capability registry is restricted to platform administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6" data-testid="dsx-registry">
      <header>
        <h1 className="text-xl font-semibold text-foreground">DSX capability registry</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          The single source of truth for what AURA implements, what maps to the NVIDIA Omniverse
          DSX architecture and what is planned or blocked. Status is source-controlled and cannot
          be promoted from the UI.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {DSX_STATUSES.map((s) => (
          <Badge key={s} variant="outline" className="text-xs">
            {DSX_STATUS_LABEL[s]}: {counts[s]}
          </Badge>
        ))}
      </div>

      {Object.keys(problems).length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-sm text-destructive">Registry evidence violations</CardTitle>
          </CardHeader>
          <CardContent className="text-xs">
            <ul className="list-disc pl-4">
              {Object.entries(problems).map(([id, list]) => (
                <li key={id}>
                  <span className="font-medium">{id}</span>: {list.join(' ')}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {DSX_CAPABILITIES.map((c) => (
          <Card key={c.id} data-testid={`dsx-capability-${c.id}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2 text-sm">
                <span>{c.name}</span>
                <Badge variant="outline" className="text-[11px]">
                  {DSX_STATUS_LABEL[c.status]}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-xs text-muted-foreground">
              <p>
                <span className="text-foreground">Route:</span> {c.route}
              </p>
              <p>
                <span className="text-foreground">DSX area:</span> {c.dsxArea}
              </p>
              <p>
                <span className="text-foreground">Owner:</span> {c.owner}
              </p>
              <p>
                <span className="text-foreground">Evidence:</span> {c.runtimeEvidence ?? 'None'}
              </p>
              <p>
                <span className="text-foreground">Data source:</span> {c.dataSource}
              </p>
              <p>
                <span className="text-foreground">Last validated:</span>{' '}
                {c.lastValidatedAt ?? 'Never'} ({c.validationMethod})
              </p>
              {c.blockers.length > 0 && (
                <p>
                  <span className="text-foreground">Blockers:</span> {c.blockers.join(' ')}
                </p>
              )}
              {c.limitations.length > 0 && (
                <p>
                  <span className="text-foreground">Limitations:</span> {c.limitations.join(' ')}
                </p>
              )}
              <p>
                <span className="text-foreground">Claims allowed:</span>{' '}
                {allowedClaimsFor(c).join(', ') || 'None'}
              </p>
              <p>
                <span className="text-foreground">Claims prohibited:</span>{' '}
                {prohibitedClaimsFor(c).join(', ')}
              </p>
              {c.nvidiaReference && (
                <p className="truncate">
                  <span className="text-foreground">Reference:</span> {c.nvidiaReference}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}