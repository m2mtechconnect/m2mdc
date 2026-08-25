/**
 * Admin-only accelerated AI capability registry.
 *
 * The underlying registry retains internal compatibility identifiers, but the
 * canonical admin surface is provider-neutral. A vendor/reference mapping may
 * be displayed only when the source-controlled registry carries that evidence;
 * it never implies a connected runtime by itself.
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
    document.title = 'Accelerated AI capability registry | AURA admin';
  }, []);

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Checking authorization...</p>;
  }

  if (!authorized) {
    return (
      <div className="p-6" data-testid="dsx-registry-forbidden">
        <h1 className="text-lg font-semibold text-foreground">Not authorized</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The accelerated AI capability registry is restricted to platform administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6" data-testid="dsx-registry">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Accelerated AI capability registry</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Source-controlled evidence for AURA accelerated AI capabilities, reference-architecture mappings,
          limitations, and validation status. A reference mapping is not evidence that a vendor runtime is
          connected. Status cannot be promoted from this UI.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {DSX_STATUSES.map((status) => (
          <Badge key={status} variant="outline" className="text-xs">
            {DSX_STATUS_LABEL[status]}: {counts[status]}
          </Badge>
        ))}
      </div>

      {Object.keys(problems).length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-sm text-destructive">Capability evidence violations</CardTitle>
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
        {DSX_CAPABILITIES.map((capability) => (
          <Card key={capability.id} data-testid={`dsx-capability-${capability.id}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2 text-sm">
                <span>{capability.name}</span>
                <Badge variant="outline" className="text-[11px]">
                  {DSX_STATUS_LABEL[capability.status]}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-xs text-muted-foreground">
              <p><span className="text-foreground">Route:</span> {capability.route}</p>
              <p><span className="text-foreground">Architecture area:</span> {capability.dsxArea}</p>
              <p><span className="text-foreground">Owner:</span> {capability.owner}</p>
              <p><span className="text-foreground">Runtime evidence:</span> {capability.runtimeEvidence ?? 'None'}</p>
              <p><span className="text-foreground">Data source:</span> {capability.dataSource}</p>
              <p>
                <span className="text-foreground">Last validated:</span>{' '}
                {capability.lastValidatedAt ?? 'Never'} ({capability.validationMethod})
              </p>
              {capability.blockers.length > 0 && <p><span className="text-foreground">Blockers:</span> {capability.blockers.join(' ')}</p>}
              {capability.limitations.length > 0 && <p><span className="text-foreground">Limitations:</span> {capability.limitations.join(' ')}</p>}
              <p><span className="text-foreground">Claims allowed:</span> {allowedClaimsFor(capability).join(', ') || 'None'}</p>
              <p><span className="text-foreground">Claims prohibited:</span> {prohibitedClaimsFor(capability).join(', ')}</p>
              {capability.nvidiaReference && (
                <p className="truncate">
                  <span className="text-foreground">Reference source:</span> {capability.nvidiaReference}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
