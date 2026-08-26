/**
 * Admin-only accelerated AI capability registry.
 * Vendor/reference material may be shown here only when it is clearly separated
 * from AURA runtime evidence. A reference model is never treated as connected.
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

const NVIDIA_NIM_SUPPORT_MATRIX = 'https://docs.nvidia.com/nim/large-language-models/latest/reference/support-matrix.html';
const NVIDIA_REFERENCE_MODELS = [
  'Nemotron 3.5 Lightning 30B-A3B',
  'Nemotron 3 Super 120B-A12B',
] as const;

export default function DsxCapabilityRegistryPage() {
  const { can, loading } = useRBAC();
  const authorized = can('platform.view_admin_console');
  const counts = capabilityCountsByStatus();
  const problems = validateRegistry();
  const agentRuntime = DSX_CAPABILITIES.find((capability) => capability.id === 'agents-optimization');
  const nimRuntimeEvidence = agentRuntime?.limitations.find((limitation) => limitation.includes('NVIDIA NIM runtime')) ??
    'NVIDIA NIM runtime status is not evidenced.';

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
          limitations and validation status. A reference mapping is not evidence that a vendor runtime is connected.
          Status cannot be promoted from this UI.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {DSX_STATUSES.map((status) => (
          <Badge key={status} variant="outline" className="text-xs">
            {DSX_STATUS_LABEL[status]}: {counts[status]}
          </Badge>
        ))}
      </div>

      <Card data-testid="nvidia-nemotron-reference-status">
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>NVIDIA Nemotron reference validation</span>
            <Badge variant="outline" className="text-xs">
              AURA runtime not connected
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <p>
            NVIDIA's current NIM support matrix lists {NVIDIA_REFERENCE_MODELS.join(' and ')} as supported model families.
            Their presence in NVIDIA documentation is reference evidence only and does not make them executable in AURA.
          </p>
          <p><span className="text-foreground">AURA runtime evidence:</span> {nimRuntimeEvidence}</p>
          <p>
            Promotion requires an AURA-controlled NIM endpoint, approved credentials, a successful runtime probe and retained
            evidence for the exact deployed model/profile.
          </p>
          <p>
            <a href={NVIDIA_NIM_SUPPORT_MATRIX} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              NVIDIA NIM support matrix
            </a>
          </p>
        </CardContent>
      </Card>

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
                <Badge variant="outline" className="text-xs">
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
