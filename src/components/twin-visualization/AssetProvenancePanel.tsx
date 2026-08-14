/**
 * AssetProvenancePanel
 *
 * Runtime proof of what actually mounted. The badge NEVER claims
 * NVIDIA-derived geometry unless an approved GLB is resolved AND the runtime
 * loader confirmed it. Baseline operations, or any resolver/loader failure,
 * report procedural geometry immediately.
 */

import { useMemo, useState } from 'react';
import {
  FALLBACK_REASON_LABEL,
  RACK_ASSET_ID,
  getAsset,
  getAssetCapabilityParts,
  getGpuValidationStatus,
  resolveRuntimeAsset,
} from './assetRegistry';

export type ProvenanceRuntimeState = 'procedural' | 'approved-glb' | 'procedural-fallback';

interface Props {
  /** Approved asset the scene attempted to mount, or null in baseline. */
  assetId?: string | null;
  /** True when the mount is part of a simulated design scenario. */
  designScenarioId?: string | null;
  /** Set when the loader failed after the registry resolved a derivative. */
  failureReason?: string | null;
  preferFallback?: boolean;
}

export function AssetProvenanceBadge({
  assetId = null,
  designScenarioId = null,
  failureReason = null,
  preferFallback,
}: Props) {
  const [open, setOpen] = useState(false);
  const resolution = useMemo(
    () => (assetId ? resolveRuntimeAsset(assetId, { preferFallback }) : null),
    [assetId, preferFallback],
  );

  const mounted = resolution?.glbUrl != null && !failureReason;
  const state: ProvenanceRuntimeState = mounted
    ? 'approved-glb'
    : assetId
      ? 'procedural-fallback'
      : 'procedural';

  const label =
    state === 'approved-glb'
      ? 'NVIDIA OpenUSD-derived rack - simulated design'
      : state === 'procedural-fallback'
        ? 'Procedural fallback - NVIDIA derivative unavailable'
        : 'Procedural 3D preview';

  const entry = assetId ? getAsset(assetId) : undefined;
  const capability = mounted && assetId ? getAssetCapabilityParts(assetId) : [];
  const gpu = assetId ? getGpuValidationStatus(assetId) : null;
  const reason =
    failureReason ??
    (resolution?.fallbackReason ? FALLBACK_REASON_LABEL[resolution.fallbackReason] : null);

  return (
    <div className="absolute bottom-3 right-3 z-10 max-w-[22rem] text-left" data-testid="asset-provenance">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-testid="asset-provenance-toggle"
        data-runtime-geometry={mounted ? 'approved-glb' : 'procedural'}
        data-provenance-state={state}
        data-design-scenario={mounted && designScenarioId ? designScenarioId : undefined}
        data-simulated={mounted && designScenarioId ? 'true' : undefined}
        className="rounded-md border border-slate-600/70 bg-slate-900/85 px-2.5 py-1.5 text-xs text-slate-100 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
      >
        {label}
      </button>

      {open && (
        <dl className="mt-2 max-h-64 space-y-1 overflow-auto rounded-md border border-slate-700/70 bg-slate-900/95 p-3 text-[12px] text-slate-200">
          <Row label="Runtime geometry" value={mounted ? 'Optimized GLB' : 'Procedural (Rack.tsx primitives)'} />
          {mounted && <Row label="Source format" value="NVIDIA OpenUSD" />}
          <Row label="Asset id" value={mounted && assetId ? assetId : 'None mounted'} />
          <Row label="Other racks" value={`Procedural (${RACK_ASSET_ID})`} />
          {mounted && resolution && (
            <>
              <Row label="USD master" value={resolution.usdMasterPath ?? 'None'} />
              <Row label="Approved checksum" value={resolution.glbChecksum ?? 'None'} />
              <Row label="GLB derivative" value={resolution.glbUrl ?? 'None'} />
              <Row label="Validation" value={resolution.validatedAt ? `Passed ${resolution.validatedAt}` : 'Not run'} />
              <Row label="Approval" value={resolution.approvalStatus} />
              <Row label="Licence basis" value={resolution.provenance.licence ?? 'Unknown'} />
              <Row label="Materials" value="1 converted PBR material (Metal_Aluminum), 0 converted textures" />
            </>
          )}
          <Row label="Fallback active" value={mounted ? 'No' : 'Yes'} />
          {!mounted && reason && <Row label="Reason" value={reason} />}
          {!mounted && !assetId && (
            <Row label="Reason" value="Baseline operations: no approved derivative is mounted." />
          )}
          {entry?.blocker && <Row label="Blocker" value={entry.blocker} />}
          {gpu && mounted && <Row label="GPU validation" value={gpu.label} />}
          {capability.length > 0 && (
            <Row
              label="Addressable parts"
              value={capability
                .map((p) => `${p.label}: ${p.addressable ? 'yes' : 'no'}`)
                .join(' | ')}
            />
          )}
          {mounted && (
            <Row
              label="Limitations"
              value="Not photorealistic, not SimReady, not RTX-rendered, not texture-complete"
            />
          )}
        </dl>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-32 shrink-0 text-slate-400">{label}</dt>
      <dd className="min-w-0 break-words font-mono text-slate-100">{value}</dd>
    </div>
  );
}
