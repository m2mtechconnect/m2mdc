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
import { CAPABILITIES, NVIDIA_READINESS } from '@/capabilities/registry';
import { listAssets } from '@/components/twin-visualization/assetRegistry';
import { reconcileDsxAssetRequirements } from '@/dsx/blueprintAssetRequirements';

interface Row {
  capability: string;
  status: string;
  tone: 'amber' | 'grey';
  detail: string;
}

/**
 * AURA_ARCHITECTURE_CONSOLIDATION_AND_NVIDIA_ALIGNMENT (Phase 1):
 * rows are derived from the coarse capability gates, which are themselves
 * derived from the canonical DSX capability registry. Nothing on this panel
 * asserts a status that the registry does not carry evidence for.
 */
function gateRow(
  key: keyof typeof CAPABILITIES,
  detail: string,
  tone: Row['tone'] = 'grey',
): Row {
  const cap = CAPABILITIES[key];
  return {
    capability: cap.label,
    status: cap.enabled ? 'Enabled' : cap.status,
    tone: cap.enabled ? 'grey' : tone,
    detail: cap.enabled ? detail : cap.requirement,
  };
}

const DSX_ASSET_COVERAGE = reconcileDsxAssetRequirements(listAssets(), 'facility');
const DSX_ASSET_ELIGIBLE = DSX_ASSET_COVERAGE.filter(
  (row) => row.state === 'runtime-eligible',
).length;
const DSX_ASSET_REQUIRED = DSX_ASSET_COVERAGE.length;
const DSX_ASSET_COMPLETE = DSX_ASSET_ELIGIBLE === DSX_ASSET_REQUIRED;

const ROWS: Row[] = [
  gateRow('nvidiaRuntime', 'A validated GPU runner is attached.'),
  {
    capability: 'Omniverse DSX Blueprint',
    status: 'Access required',
    tone: 'amber',
    detail: 'An entitled NVIDIA account is required to obtain the blueprint distribution.',
  },
  gateRow('openUsdStage', 'An NVIDIA runtime resolves the canonical OpenUSD stage.'),
  {
    capability: 'DSX blueprint physical assets',
    status: DSX_ASSET_COMPLETE
      ? 'Exact-role coverage complete'
      : `${DSX_ASSET_ELIGIBLE}/${DSX_ASSET_REQUIRED} exact roles validated`,
    tone: DSX_ASSET_COMPLETE ? 'grey' : 'amber',
    detail: DSX_ASSET_COMPLETE
      ? 'Every facility-level DSX requirement has an approved, checksum-backed, runtime-eligible derivative.'
      : 'Current NVIDIA data-hall and AURA-authored visuals do not satisfy generation-specific DSX roles by approximation. Missing exact roles remain source-gated.',
  },
  gateRow('simReadyAssets', 'Every published asset carries a SimReady validation result.'),
  gateRow('dsxExchange', 'The official DSX Exchange distribution is deployed.', 'amber'),
  {
    capability: 'Official AsyncAPI schemas',
    status: 'Not available',
    tone: 'amber',
    detail: 'Official event schemas have not been obtained, so event conformance cannot be proven.',
  },
  gateRow('telemetryPrimMapping', 'Telemetry is bound to OpenUSD prims.'),
  {
    capability: 'Vertical-slice validation',
    status:
      NVIDIA_READINESS.verticalSlice === 'VALIDATED' ? 'Validated' : 'Blocked by infrastructure',
    tone: 'amber',
    detail:
      'End-to-end validation cannot run without a GPU runner, entitlements and a disposable backend.',
  },
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
            Readiness overview for a future NVIDIA DSX deployment. Existing OpenUSD-derived
            data-hall visuals are tracked separately from exact DSX blueprint coverage, SimReady
            validation and operational runtime evidence.
          </p>
        </header>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Capability status</CardTitle>
            <CardDescription>
              Vertical slice {NVIDIA_READINESS.verticalSlice.replace(/_/g, ' ').toLowerCase()} ·
              {' '}{NVIDIA_READINESS.runtimeProvenComponents} NVIDIA-integrated capabilities ·
              {' '}{NVIDIA_READINESS.simReadyValidatedAssets} SimReady-validated assets ·
              {' '}{DSX_ASSET_ELIGIBLE}/{DSX_ASSET_REQUIRED} DSX exact physical roles ·
              {' '}{NVIDIA_READINESS.openUsdCanonicalCapabilities} AURA-authored OpenUSD capabilities
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
              <li>Traceable exact-role DSX physical assets where the blueprint requires generation-specific equipment.</li>
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
              A GPU runner, official NVIDIA entitlements, exact-role asset evidence, DSX Exchange distribution and disposable backend are required.
            </p>
          </CardContent>
        </Card>
      </div>
  );
}
// Single canonical readiness implementation: <NvidiaDsxReadinessPanel /> is
// mounted only by /integrations. No standalone page wrapper exists (Stage 6G).
