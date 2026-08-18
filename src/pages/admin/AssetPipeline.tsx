/**
 * Admin asset pipeline.
 *
 * Route: /admin/asset-pipeline (admin/owner only)
 *
 * Shows the approved NVIDIA operations derivative with its published truth and
 * the single entry point to the hardware GPU validation harness. Nothing here
 * changes rollout: the asset stays limited to Admin Preview and the opt-in
 * simulated scenario until a saved hardware run passes.
 */

import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Cpu, ExternalLink, XCircle } from 'lucide-react';
import { useRBAC } from '@/contexts/RBACContext';
import { isAssetAdmin } from '@/auth/assetAdmin';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buildAssetExpectation, VALIDATION_ASSET_ID, BENCHMARK_CONFIG } from '@/validation/gpuAcceptance/spec';
import { useSavedGpuValidation } from '@/validation/gpuAcceptance/useSavedGpuValidation';

export default function AssetPipeline() {
  const { role, roles, loading } = useRBAC();
  const expected = buildAssetExpectation(VALIDATION_ASSET_ID);
  const validation = useSavedGpuValidation(VALIDATION_ASSET_ID);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  if (!isAssetAdmin(role, roles)) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6 p-6" data-testid="admin-asset-pipeline">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold">Asset pipeline</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Approved OpenUSD-derived runtime assets and their validation state. Private USD source
          URLs are never exposed here.
        </p>
      </header>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">NVIDIA Reference Facility</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Hardware visual acceptance for the whole reference facility: live asset reconciliation,
            a fixed-path benchmark and recorded human visual verdicts.
          </p>
        </div>
        <Button asChild size="lg" data-testid="run-reference-facility-validation">
          <Link to="/admin/reference-facility-validation">
            Run facility validation <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </Card>

      {!expected ? (
        <Card className="p-6 text-sm">No approved derivative is registered.</Card>
      ) : (
        <Card className="p-5" data-testid="asset-card-nvidia-rack">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-mono text-sm font-semibold">{expected.assetId}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={validation.gpuValidated ? 'default' : 'secondary'}
                  data-testid="asset-gpu-status"
                >
                  {validation.loading ? 'Checking validation history...' : validation.label}
                </Badge>
                <Badge variant="outline">Source: NVIDIA OpenUSD-derived</Badge>
                <Badge variant="outline">Runtime: Optimized GLB</Badge>
                <Badge variant="outline">Simulated scenario only</Badge>
                <Badge variant="outline">Not assigned to the operational facility</Badge>
              </div>
            </div>
            <Button asChild size="lg" data-testid="run-hardware-validation">
              <Link to={`/admin/asset-validation/${expected.assetId}`}>
                Run hardware validation <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <dl className="mt-5 grid gap-1 text-[12px] sm:grid-cols-2">
            <Row label="Approved checksum" value={expected.checksum} />
            <Row label="Triangles" value={expected.triangleCount.toLocaleString()} />
            <Row label="Asset draw calls" value={String(expected.assetDrawCalls)} />
            <Row label="Asset textures" value={String(expected.textureCount)} />
            <Row
              label="Bounds (m)"
              value={`${expected.bounds.x} x ${expected.bounds.y} x ${expected.bounds.z}`}
            />
            <Row label="Floor contact" value={`minY = ${expected.minY}`} />
            <Row label="Front orientation" value={expected.frontAxis} />
            <Row label="Scenario" value={BENCHMARK_CONFIG.scenarioId} />
            <Row label="Manifest version" value={String(expected.manifestVersion)} />
          </dl>

          <div className="mt-4">
            <h3 className="mb-1 text-[12px] font-medium">Capability map (from validation evidence)</h3>
            <ul className="space-y-1 text-[12px]">
              {expected.addressableParts.map((part) => (
                <li key={part.id} className="flex gap-2">
                  {part.addressable ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span>
                    <span className="font-medium">{part.label}</span>{' '}
                    {part.addressable ? 'addressable' : 'not independently addressable'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {validation.lastRun && (
            <p className="mt-4 text-[12px] text-muted-foreground">
              Last saved run {validation.lastRun.result.toUpperCase()} -{' '}
              <span className="font-mono">{validation.lastRun.verdict}</span> on{' '}
              {new Date(validation.lastRun.validatedAt).toLocaleString()}.
            </p>
          )}

          {!validation.loading && (
            <p className="mt-2 text-[12px] text-muted-foreground" data-testid="asset-validation-evidence">
              Validation basis: {validation.evidence}
              {validation.buildChecksum ? (
                <>
                  {' '}(current build <span className="font-mono">{validation.buildChecksum}</span>)
                </>
              ) : null}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-3 text-[12px]">
            <Link className="inline-flex items-center gap-1 underline" to="/admin/asset-preview">
              Admin preview <ExternalLink className="h-3 w-3" />
            </Link>
            <Link
              className="inline-flex items-center gap-1 underline"
              to={`/data-centre-twin?designScenario=${BENCHMARK_CONFIG.scenarioId}`}
            >
              Opt-in simulated scenario <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-40 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-all font-mono">{value}</dd>
    </div>
  );
}
