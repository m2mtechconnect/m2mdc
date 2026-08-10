/**
 * Settings → Integrations → NVIDIA DSX
 * Informational readiness surface. No operational NVIDIA control is exposed.
 */
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Info, Lock } from 'lucide-react';
import { NVIDIA_READINESS } from '@/capabilities/registry';

interface Row {
  capability: string;
  status: string;
  tone: 'amber' | 'grey';
  detail: string;
}

const ROWS: Row[] = [
  { capability: 'NVIDIA GPU runtime', status: 'Not connected', tone: 'grey', detail: 'No GPU device, driver or container toolkit is available to the application.' },
  { capability: 'Omniverse DSX Blueprint', status: 'Access required', tone: 'amber', detail: 'An entitled NVIDIA account is required to obtain the blueprint distribution.' },
  { capability: 'OpenUSD stage', status: 'Not configured', tone: 'grey', detail: 'No OpenUSD stage has been authored or mounted. The preview uses the AURA application asset model.' },
  { capability: 'SimReady assets', status: 'None validated', tone: 'grey', detail: 'No asset has been validated against SimReady requirements.' },
  { capability: 'DSX Exchange', status: 'Not deployed', tone: 'grey', detail: 'The official DSX Exchange distribution is not deployed. Generic messaging transports are not DSX Exchange.' },
  { capability: 'Official AsyncAPI schemas', status: 'Not available', tone: 'amber', detail: 'Official event schemas have not been obtained, so event conformance cannot be proven.' },
  { capability: 'Telemetry-to-prim mapping', status: 'Not configured', tone: 'grey', detail: 'Mapping requires both an OpenUSD stage and a verified telemetry source.' },
  { capability: 'Vertical-slice validation', status: 'Blocked by infrastructure', tone: 'amber', detail: 'End-to-end validation cannot run without a GPU runner, entitlements and a disposable backend.' },
];

function StatusBadge({ status, tone }: { status: string; tone: Row['tone'] }) {
  return (
    <Badge
      variant="outline"
      className={
        tone === 'amber'
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          : 'border-border bg-muted text-muted-foreground'
      }
    >
      {status}
    </Badge>
  );
}

/**
 * Readiness panel, rendered inside the canonical Integrations workspace.
 * Exported without a Layout so it can never become a second destination.
 */
export function NvidiaDsxReadinessPanel({ heading = 'h2' }: { heading?: 'h1' | 'h2' }) {
  const Heading = heading;
  return (
      <div className="space-y-6" data-testid="nvidia-dsx-readiness" id="nvidia-dsx">
        <header className="space-y-1">
          <Heading className="text-lg font-semibold tracking-tight">NVIDIA DSX</Heading>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Readiness overview for a future NVIDIA DSX deployment. Nothing here is active:
            AURA DC currently operates as a deterministic simulation and evidence platform.
          </p>
        </header>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Capability status</CardTitle>
            <CardDescription>
              Vertical slice {NVIDIA_READINESS.verticalSlice.replace(/_/g, ' ').toLowerCase()} ·
              {' '}{NVIDIA_READINESS.staticallyProvenComponents} components statically proven ·
              {' '}{NVIDIA_READINESS.runtimeProvenComponents} runtime proven
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[240px]">Capability</TableHead>
                  <TableHead className="w-[200px]">Status</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROWS.map((r) => (
                  <TableRow key={r.capability} data-testid={`dsx-capability-${r.capability.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                    <TableCell className="font-medium">{r.capability}</TableCell>
                    <TableCell><StatusBadge status={r.status} tone={r.tone} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Environment requirements</CardTitle>
            <CardDescription>
              What must exist before any NVIDIA capability can be activated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>GPU-attached Linux host with the NVIDIA driver, a container runtime and the NVIDIA Container Toolkit.</li>
              <li>NVIDIA account entitlement covering the Omniverse DSX Blueprint and its container images.</li>
              <li>The official DSX Exchange distribution together with its AsyncAPI event schemas.</li>
              <li>A disposable, non-production backend target for validation traffic.</li>
              <li>An authored OpenUSD stage with SimReady-validated assets and a telemetry-to-prim mapping.</li>
            </ul>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild>
                <Link to="/help?topic=nvidia-dsx-environment">View environment requirements</Link>
              </Button>
              <Button variant="outline" disabled aria-describedby="dsx-configure-reason" className="gap-2">
                <Lock className="h-4 w-4" aria-hidden />
                Configure NVIDIA environment
              </Button>
            </div>
            <p id="dsx-configure-reason" className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              A GPU runner, official NVIDIA entitlements, DSX Exchange distribution and disposable backend are required.
            </p>
          </CardContent>
        </Card>
      </div>
  );
}
// Single canonical readiness implementation: <NvidiaDsxReadinessPanel /> is
// mounted only by /integrations. No standalone page wrapper exists (Stage 6G).
